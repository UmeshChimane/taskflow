import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ObjectId } from 'mongodb';
import sharp from 'sharp';
import { harness } from './helpers.mjs';

function setup(){const h=harness();const user={_id:new ObjectId(),email:'user@example.test',name:'User',password:'never-return-this'};h.state.collections.users.push(user);h.state.session={user:{email:user.email}};return{...h,user,actions:h.load('app/actions/profile.ts')};}
async function photo(){const buffer=await sharp({create:{width:40,height:20,channels:3,background:'#dd3344'}}).png().toBuffer();const data=new FormData();data.set('avatar',new File([buffer],'photo.png',{type:'image/png'}));return data;}

test('avatar upload validates and normalizes images, persists privately, and supports removal',async()=>{
 const h=setup();assert.equal((await h.actions.updateAvatar(await photo())).success,true);
 const metadata=await sharp(h.user.avatar).metadata();assert.equal(metadata.width,128);assert.equal(metadata.height,128);assert.equal(metadata.format,'jpeg');
 const profile=await h.actions.getProfile();assert.match(profile.profile.image,/^\/api\/avatar\//);assert.equal('password' in profile.profile,false);assert.equal('avatar' in profile.profile,false);
 assert.equal((await h.actions.removeAvatar()).success,true);assert.equal(h.user.avatar,undefined);assert.equal((await h.actions.getProfile()).profile.image,null);
});

test('avatar mutations reject anonymous, oversized, SVG, and malformed files without writes',async()=>{
 const h=setup();h.state.session=null;assert.equal((await h.actions.updateAvatar(await photo())).success,false);assert.equal((await h.actions.removeAvatar()).success,false);
 h.state.session={user:{email:h.user.email}};
 for(const file of [new File(['<svg/>'],'photo.svg',{type:'image/svg+xml'}),new File(['invalid'],'bad.jpg',{type:'image/jpeg'}),new File([new Uint8Array(512*1024+1)],'big.jpg',{type:'image/jpeg'})]){const form=new FormData();form.set('avatar',file);assert.equal((await h.actions.updateAvatar(form)).success,false);}
 assert.equal(h.state.writes.length,0);
});

test('avatar HTTP route permits the owner and teammates, excludes outsiders and anonymous users',async()=>{
 const h=setup();await h.actions.updateAvatar(await photo());const route=h.load('app/api/avatar/[id]/route.ts');
 const request=()=>route.GET(new Request('http://localhost/api/avatar/'+h.user._id),{params:Promise.resolve({id:String(h.user._id)})});
 let result=await request();assert.equal(result.status,200);assert.equal(result.headers.get('content-type'),'image/jpeg');assert.equal(result.headers.get('cache-control'),'private, no-store');
 h.state.session={user:{email:'outsider@example.test'}};assert.equal((await request()).status,404);
 h.state.collections.workspaces.push({_id:new ObjectId(),members:[{email:h.user.email},{email:'outsider@example.test'}]});assert.equal((await request()).status,200);
 h.state.session=null;assert.equal((await request()).status,401);
});

test('profile updates are scoped to the current user and missing accounts do not report success',async()=>{
 const h=setup();assert.equal((await h.actions.updateProfile({name:'New Name',email:'attacker@example.test'})).success,true);assert.equal(h.user.name,'New Name');assert.equal(h.user.email,'user@example.test');
 h.state.collections.users=[];assert.equal((await h.actions.updateProfile({name:'Other Name'})).success,false);
});
