import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { ObjectId } from 'mongodb';
import Credentials from '@auth/core/providers/credentials';
const nodeRequire = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Exercise the application functions with a deterministic in-memory DB boundary.
// Auth.js, Zod, bcrypt, JWT encryption, HTTP responses, and CSRF remain real.
export function harness() {
  const state = { session: null, writes: [], collections: { users: [], tasks: [], workspaces: [], comments: [], notifications: [] }, config: null };
  const equal = (a, b) => a instanceof ObjectId || b instanceof ObjectId ? String(a) === String(b) : a === b;
  function values(doc, key) {
    let items = [doc];
    for (const part of key.split('.')) items = items.flatMap(item => Array.isArray(item) ? item.map(v => v?.[part]) : [item?.[part]]);
    return items.flat();
  }
  function matches(doc, query) {
    return Object.entries(query).every(([key, wanted]) => {
      if (key === '$or') return wanted.some(q => matches(doc, q));
      if (key === '$and') return wanted.every(q => matches(doc, q));
      const actual = values(doc, key);
      if(wanted===null)return actual.some(value=>value==null);
      if(wanted&&typeof wanted==='object'&&Object.keys(wanted).length===1&&'$ne' in wanted)return actual.every(value=>!equal(value,wanted.$ne));
      if (wanted && typeof wanted === 'object' && !(wanted instanceof ObjectId)) {
        return actual.some(value => Object.entries(wanted).every(([operator, expected]) => {
          if (operator === '$in') return expected.some(item => equal(value, item));
          if (operator === '$ne') return !equal(value, expected);
          if (operator === '$lt') return value < expected;
          if (operator === '$type') return typeof value === expected;
          return false;
        }));
      }
      return actual.some(a => equal(a, wanted));
    });
  }
  function project(doc, projection) {
    if (!doc) return null;
    if (!projection) return { ...doc };
    const includes = Object.entries(projection).filter(([, v]) => v === 1);
    if (includes.length) return Object.fromEntries([['_id', doc._id], ...includes.map(([k]) => [k, doc[k]])].filter(([k]) => projection[k] !== 0));
    return Object.fromEntries(Object.entries(doc).filter(([k]) => projection[k] !== 0));
  }
  const db = { collection(name) {
    const rows = state.collections[name] ||= [];
    return {
      async countDocuments(query) { return rows.filter(doc => matches(doc, query)).length; },
      async findOne(query, options) { return project(rows.find(d => matches(d, query)), options?.projection); },
      find(query, options) { const result = rows.filter(d => matches(d, query)).map(d => project(d, options?.projection)); return { sort() { return this; }, limit() { return this; }, async toArray() { return result; } }; },
      async insertOne(input) {
        if (name === 'users' && rows.some(u => u.email === input.email)) throw Object.assign(new Error('duplicate'), { code: 11000 });
        const doc = { _id: new ObjectId(), ...input }; rows.push(doc); state.writes.push({ name, operation: 'insert', doc }); return { insertedId: doc._id };
      },
      async updateOne(query, update, options) {
        const doc = rows.find(d => matches(d, query));
        if (!doc) {
          if (options?.upsert) {
            const inserted = { ...query, ...update.$setOnInsert, ...update.$set };
            rows.push(inserted); state.writes.push({ name, operation: 'upsert' });
            return { matchedCount: 0, upsertedId: inserted._id };
          }
          return { matchedCount: 0 };
        }
        Object.assign(doc, update.$set);
        for(const [key,value] of Object.entries(update.$push||{}))(doc[key] ||= []).push(value);
        for(const [key,value] of Object.entries(update.$pull||{}))doc[key]=(doc[key]||[]).filter(item=>typeof value==='object'?!matches(item,value):!equal(item,value));
        for (const key of Object.keys(update.$unset || {})) delete doc[key];
        state.writes.push({ name, operation: 'update' }); return { matchedCount: 1 };
      },
      async updateMany(query,update){let modifiedCount=0;for(const doc of rows.filter(row=>matches(row,query))){Object.assign(doc,update.$set);for(const key of Object.keys(update.$unset||{}))delete doc[key];for(const [key,value] of Object.entries(update.$pull||{}))doc[key]=(doc[key]||[]).filter(item=>typeof value==='object'?!matches(item,value):!equal(item,value));modifiedCount++;}return{modifiedCount};},
      async deleteOne(query) {
        const index = rows.findIndex(d => matches(d, query));
        if (index < 0) return { deletedCount: 0 };
        rows.splice(index, 1); state.writes.push({ name, operation: 'delete' }); return { deletedCount: 1 };
      },
      async deleteMany(query) { const removed = rows.filter(d => matches(d, query)); for (const d of removed) rows.splice(rows.indexOf(d), 1); state.writes.push({ name, operation: 'deleteMany' }); return { deletedCount: removed.length }; },
    };
  } };
  const cache = new Map();
  const overrides = {
    '@/auth': { auth: async () => state.session },
    '@/lib/mongodb': { getDb: async () => db },
    'next/cache': { revalidatePath() {} },
    'next-auth': config => { state.config = config; return {}; },
    'next-auth/providers/credentials': options => Credentials(options),
  };
  function load(relative, extra = {}) {
    const filename = path.resolve(root, relative);
    if (cache.has(filename)) return cache.get(filename).exports;
    const compiledModule = { exports: {} }; cache.set(filename, compiledModule);
    const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    function localRequire(name) {
      if (name in extra) return extra[name];
      if (name in overrides) return overrides[name];
      if (name.startsWith('@/')) return load(`${name.slice(2)}.ts`);
      if (name.startsWith('.')) {
        const relativePath = path.relative(root, path.resolve(path.dirname(filename), `${name}.ts`));
        if (relativePath === 'lib/mongodb.ts') return overrides['@/lib/mongodb'];
        return load(relativePath, extra);
      }
      return nodeRequire(name);
    }
    new Function('require', 'module', 'exports', output)(localRequire, compiledModule, compiledModule.exports);
    return compiledModule.exports;
  }
  return { state, db, load };
}
