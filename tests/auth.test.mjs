import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import { harness } from './helpers.mjs';
let Auth, encode;
before(async () => {
  ({ Auth } = await import('@auth/core'));
  ({ encode } = await import('@auth/core/jwt'));
});

const user = () => ({ _id: new ObjectId(), name: 'Test User', email: 'user@example.test', password: bcrypt.hashSync('valid-password', 12), createdAt: new Date() });

test('credentials validation normalizes email, rejects non-string/oversized input, and avoids bcrypt truncation on signup', () => {
  const { load } = harness();
  const { loginSchema, registrationSchema } = load('lib/validations/auth.ts');
  assert.equal(loginSchema.parse({ email: ' USER@EXAMPLE.TEST ', password: 'valid-password' }).email, 'user@example.test');
  for (const credentials of [{}, { email: {}, password: 'valid-password' }, { email: 'x', password: 'valid-password' }, { email: 'user@example.test', password: 'x'.repeat(129) }]) assert.equal(loginSchema.safeParse(credentials).success, false);
  const signup = password => registrationSchema.safeParse({ name: 'Test User', email: 'user@example.test', password });
  assert.equal(signup('a'.repeat(72)).success, true);
  assert.equal(signup('a'.repeat(73)).success, false);
  assert.equal(signup('😀'.repeat(18)).success, true);
  assert.equal(signup('😀'.repeat(19)).success, false);
  // Existing accounts may have accepted long bcrypt inputs; retain login compatibility.
  assert.equal(loginSchema.safeParse({ email: 'user@example.test', password: 'a'.repeat(100) }).success, true);
});

test('registration returns 400 for malformed input, hashes with cost 12, and never returns the hash/password', async () => {
  const { load, state } = harness();
  const { POST } = load('app/api/auth/register/route.ts');
  const request = body => new Request('http://localhost/api/auth/register', { method: 'POST', body, headers: { 'Content-Type': 'application/json' } });
  for (const body of ['{', 'null', JSON.stringify({ name: 'Test User', email: 'user@example.test', password: 'a'.repeat(73) })]) assert.equal((await POST(request(body))).status, 400);
  assert.equal(state.writes.length, 0);
  const input = { name: 'Test User', email: ' USER@EXAMPLE.TEST ', password: 'valid-password' };
  const response = await POST(request(JSON.stringify(input)));
  assert.equal(response.status, 201);
  const json = await response.json();
  assert.equal(json.user.email, 'user@example.test');
  assert.equal('password' in json.user, false);
  assert.equal(JSON.stringify(json).includes(input.password), false);
  const stored = state.collections.users[0];
  assert.equal(bcrypt.getRounds(stored.password), 12);
  assert.equal(await bcrypt.compare(input.password, stored.password), true);
  assert.equal((await POST(request(JSON.stringify(input)))).status, 409);
});

test('simultaneous duplicate registrations translate unique-index conflicts into a safe duplicate error', async () => {
  const { load, state } = harness();
  const { createUser } = load('lib/user.ts');
  const results = await Promise.allSettled([createUser('Test User', 'USER@EXAMPLE.TEST', 'test-hash'), createUser('Test User', 'user@example.test', 'test-hash')]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(results.find(r => r.status === 'rejected').reason.message, 'USER_ALREADY_EXISTS');
  assert.equal(state.collections.users.length, 1);
});

test('required unique email index fails closed and retries instead of allowing duplicate-capable writes', async () => {
  const { load } = harness();
  let fail = true, attempts = 0;
  const fakeDb = { collection(name) { return { async createIndex() { if (name === 'users') { attempts++; if (fail) throw new Error('test failure'); } } }; } };
  class MongoClient { async connect() { return this; } db() { return fakeDb; } }
  const previous = process.env.MONGODB_URI;
  process.env.MONGODB_URI = 'mongodb://localhost/test-only';
  try {
    const { getDb } = load('lib/mongodb.ts', { mongodb: { MongoClient } });
    await assert.rejects(getDb(), /Required database indexes are unavailable/);
    fail = false;
    assert.equal(await getDb(), fakeDb);
    assert.equal(attempts, 2);
  } finally { if (previous === undefined) delete process.env.MONGODB_URI; else process.env.MONGODB_URI = previous; }
});

async function authHarness() {
  const h = harness(); h.state.collections.users.push(user()); h.load('auth.ts');
  const errors = [];
  const config = { ...h.state.config, secret: randomBytes(32).toString('hex'), trustHost: true, basePath: '/api/auth', logger: { error: error => errors.push(error.type), warn() {}, debug() {} } };
  const jar = new Map();
  async function request(action, fields, customCookie) {
    const headers = { Cookie: customCookie ?? [...jar].map(([k, v]) => `${k}=${v}`).join('; ') };
    if (fields) headers['Content-Type'] = 'application/x-www-form-urlencoded';
    const response = await Auth(new Request(`http://localhost/api/auth/${action}`, { method: fields ? 'POST' : 'GET', headers, ...(fields ? { body: new URLSearchParams(fields) } : {}) }), config);
    for (const cookie of response.headers.getSetCookie()) {
      const [name, value] = cookie.split(';')[0].split('=');
      if (!value) jar.delete(name); else jar.set(name, value);
    }
    return response;
  }
  async function csrf() { return (await (await request('csrf')).json()).csrfToken; }
  async function login(password = 'valid-password', callbackUrl = 'http://localhost/dashboard') {
    return request('callback/credentials', { csrfToken: await csrf(), email: ' USER@EXAMPLE.TEST ', password, callbackUrl });
  }
  return { ...h, config, request, login, csrf, jar, errors };
}

test('real Auth.js HTTP flow: login, cookie persistence, sanitized session, client identity updates, and logout', async () => {
  const h = await authHarness();
  const response = await h.login();
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), 'http://localhost/dashboard');
  assert.ok(response.headers.getSetCookie().some(c => c.includes('HttpOnly') && c.includes('SameSite=Lax')));
  for (let i = 0; i < 2; i++) {
    const session = await (await h.request('session')).json();
    assert.equal(session.user.email, 'user@example.test');
    assert.deepEqual(Object.keys(session.user).sort(), ['email', 'name']);
    assert.ok(Date.parse(session.expires) > Date.now());
  }
  h.state.collections.users[0].name = 'Updated Name';
  const updated = await h.request('session', { csrfToken: await h.csrf(), data: JSON.stringify({ user: { email: 'attacker@example.test', name: 'Attacker' } }) });
  const updatedSession = await updated.json();
  assert.equal(updatedSession.user.email, 'user@example.test');
  assert.equal(updatedSession.user.name, 'Updated Name');
  const logout = await h.request('signout', { csrfToken: await h.csrf(), callbackUrl: 'http://localhost/login' });
  assert.equal(logout.headers.get('location'), 'http://localhost/login');
  assert.equal(await (await h.request('session')).json(), null);
});

test('real Auth.js rejects invalid credentials and missing CSRF without issuing a session', async () => {
  const h = await authHarness();
  for (const password of ['wrong-password', 'x'.repeat(129)]) {
    const response = await h.login(password);
    assert.match(response.headers.get('location'), /error=CredentialsSignin/);
    assert.equal(await (await h.request('session')).json(), null);
  }
  await h.request('callback/credentials', { email: 'user@example.test', password: 'valid-password', callbackUrl: 'http://localhost/dashboard' });
  assert.equal(await (await h.request('session')).json(), null);
});

test('real Auth.js rejects external, protocol-relative, and javascript callback destinations', async () => {
  for (const destination of ['https://attacker.example/phish', '//attacker.example/phish', 'javascript:alert(1)']) {
    const h = await authHarness();
    const response = await h.login('valid-password', destination);
    const redirect = new URL(response.headers.get('location'));
    assert.equal(redirect.origin, 'http://localhost');
  }
});

test('real Auth.js rejects expired and tampered JWT cookies', async () => {
  const h = await authHarness();
  const record = h.state.collections.users[0];
  const token = await encode({ token: { sub: String(record._id), email: record.email }, secret: h.config.secret, salt: 'authjs.session-token', maxAge: -60 });
  for (const value of [token, 'tampered-token']) assert.equal(await (await h.request('session', undefined, `authjs.session-token=${value}`)).json(), null);
});

test('deleted and recreated accounts cannot reuse the old JWT or enter a login/profile redirect loop', async () => {
  const h = await authHarness();
  await h.login();
  h.state.collections.users.splice(0);
  assert.equal(await (await h.request('session')).json(), null);
  const h2 = await authHarness();
  await h2.login();
  h2.state.collections.users[0]._id = new ObjectId();
  assert.equal(await (await h2.request('session')).json(), null);
});

function taskHarness(member = true, relationship = 'creator') {
  const h = harness(), workspaceId = new ObjectId(), taskId = new ObjectId(), commentId = new ObjectId();
  const email = 'user@example.test';
  h.state.session = { user: { email, name: 'Test User' } };
  h.state.collections.workspaces.push({ _id: workspaceId, name: 'Workspace', ownerEmail: 'owner@example.test', members: member ? [{ email, role: 'member' }] : [] });
  h.state.collections.tasks.push({ _id: taskId, workspaceId, title: 'Test task', status: 'todo', priority: 'medium', createdBy: relationship === 'creator' ? email : 'owner@example.test', assignees: relationship === 'assignee' ? [email] : [] });
  h.state.collections.comments.push({ _id: commentId, taskId, createdBy: email, content: 'Test comment' });
  return { ...h, workspaceId, taskId, commentId, actions: h.load('app/actions/task.ts') };
}

test('removed creators cannot read, edit, relocate, delete, change status, or mutate task comments', async () => {
  const h = taskHarness(false);
  const { findAccessibleTask } = h.load('lib/task-access.ts');
  assert.equal(await findAccessibleTask(h.db, String(h.taskId), h.state.session.user.email), null);
  const target = new ObjectId();
  h.state.collections.workspaces.push({ _id: target, members: [{ email: h.state.session.user.email }] });
  const input = { title: 'Changed', status: 'todo', priority: 'medium', workspaceId: String(target), assignees: [] };
  for (const result of [await h.actions.updateTask(String(h.taskId), input), await h.actions.deleteTask(String(h.taskId)), await h.actions.updateTaskStatus(String(h.taskId), 'in-progress'), await h.actions.createComment(String(h.taskId), 'Comment'), await h.actions.deleteComment(String(h.commentId))]) assert.equal(result.success, false);
  assert.equal(h.state.writes.length, 0);
});

test('current creators and assignees retain existing permissions; unrelated members are denied', async () => {
  const owner = taskHarness();
  assert.equal((await owner.actions.updateTaskStatus(String(owner.taskId), 'in-progress')).success, true);
  assert.equal((await owner.actions.createComment(String(owner.taskId), 'Comment')).success, true);
  assert.equal((await owner.actions.deleteComment(String(owner.commentId))).success, true);
  assert.equal((await owner.actions.deleteTask(String(owner.taskId))).success, true);
  const assignee = taskHarness(true, 'assignee');
  assert.equal((await assignee.actions.updateTaskStatus(String(assignee.taskId), 'in-progress')).success, true);
  assert.equal((await assignee.actions.deleteTask(String(assignee.taskId))).success, false);
  const unrelated = taskHarness(true, 'unrelated');
  assert.equal((await unrelated.actions.createComment(String(unrelated.taskId), 'Comment')).success, false);
});

test('assignment directory requires a valid workspace and current membership; no global user fallback', async () => {
  const h = taskHarness();
  h.state.collections.users.push({ _id: new ObjectId(), email: 'user@example.test', name: 'Member' }, { _id: new ObjectId(), email: 'outsider@example.test', name: 'Outsider' });
  for (const workspace of [undefined, 'invalid', String(new ObjectId())]) assert.deepEqual((await h.actions.getUsersForAssignment(workspace)).users, []);
  const result = await h.actions.getUsersForAssignment(String(h.workspaceId));
  assert.equal(result.success, true);
  assert.deepEqual(result.users, [{ email: 'user@example.test', name: 'Member' }]);
  h.state.session = null;
  assert.equal((await h.actions.getUsersForAssignment(String(h.workspaceId))).success, false);
});

test('logout requires CSRF and HTTPS cookies retain Secure and HttpOnly defaults', async () => {
  const h = await authHarness();
  await h.login();
  await h.request('signout', { callbackUrl: 'http://localhost/login' });
  assert.equal((await (await h.request('session')).json()).user.email, 'user@example.test');
  const response = await Auth(new Request('https://localhost/api/auth/csrf'), h.config);
  assert.ok(response.headers.getSetCookie().some(cookie => cookie.includes('Secure') && cookie.includes('HttpOnly')));
});

test('anonymous task mutations fail before database writes', async () => {
  const h = taskHarness();
  h.state.session = null;
  const input = { title: 'Test', status: 'todo', priority: 'medium', workspaceId: String(h.workspaceId) };
  for (const result of [await h.actions.createTask(input), await h.actions.updateTask(String(h.taskId), input), await h.actions.updateTaskStatus(String(h.taskId), 'in-progress'), await h.actions.deleteTask(String(h.taskId)), await h.actions.createComment(String(h.taskId), 'Comment'), await h.actions.deleteComment(String(h.commentId))]) assert.equal(result.success, false);
  assert.equal(h.state.writes.length, 0);
});

test('workspace readers and owner mutations reject non-members and non-owners', async () => {
  const h = taskHarness();
  const workspace = h.load('app/actions/workspace.ts');
  assert.equal((await workspace.getWorkspace(String(h.workspaceId))).success, true);
  assert.equal((await workspace.updateWorkspace(String(h.workspaceId), { name: 'Changed' })).success, false);
  assert.equal((await workspace.deleteWorkspace(String(h.workspaceId))).success, false);
  assert.equal((await workspace.addWorkspaceMember(String(h.workspaceId), 'new@example.test')).success, false);
  h.state.collections.workspaces[0].members = [];
  assert.equal((await workspace.getWorkspace(String(h.workspaceId))).success, false);
  assert.equal(h.state.writes.length, 0);
});
