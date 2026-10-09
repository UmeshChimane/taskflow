import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ObjectId } from 'mongodb';
import { harness } from './helpers.mjs';

function setup() {
  const h = harness(), email = 'user@example.test', workspaceId = new ObjectId();
  h.state.session = { user: { email } };
  h.state.collections.workspaces.push({ _id: workspaceId, name: 'Project', members: [{ email }] });
  function task(extra = {}) {
    const doc = { _id: new ObjectId(), workspaceId, title: 'Test task', status: 'todo', dueDate: '2026-10-08', assignees: [email], createdBy: 'creator@example.test', ...extra };
    h.state.collections.tasks.push(doc); return doc;
  }
  return { ...h, email, task, sync: h.load('lib/overdue-notifications.ts').syncOverdueNotifications };
}
const now = new Date('2026-10-09T06:00:00Z');

test('alerts include unfinished assigned/created tasks, excluding today, completed, undated, unrelated and inaccessible tasks', async () => {
  const h = setup();
  const assigned = h.task();
  const owned = h.task({ assignees: [], createdBy: h.email });
  h.task({ status: 'done' }); h.task({ dueDate: '2026-10-09' }); h.task({ dueDate: null });
  h.task({ dueDate: 'invalid' }); h.task({ dueDate: '2026-02-30' });
  h.task({ workspaceId: new ObjectId() }); h.task({ assignees: [] });
  await h.sync(h.db, h.email, now);
  assert.equal(h.state.collections.notifications.length, 2);
  assert.deepEqual(h.state.collections.notifications.map(n => String(n.taskId)).sort(), [String(assigned._id), String(owned._id)].sort());
  for (const notification of h.state.collections.notifications) {
    assert.equal(notification.userEmail, h.email);
    assert.equal(notification.type, 'overdue');
    assert.equal(notification.read, false);
    assert.match(notification.message, /Project.*2026-10-08/);
    assert.equal(ObjectId.isValid(notification._id), true);
  }
});

test('repeated/concurrent checks do not duplicate alerts or reset read state; a different overdue deadline gets a new alert', async () => {
  const h = setup(), task = h.task();
  await Promise.all([h.sync(h.db, h.email, now), h.sync(h.db, h.email, now)]);
  assert.equal(h.state.collections.notifications.length, 1);
  h.state.collections.notifications[0].read = true;
  await h.sync(h.db, h.email, now);
  assert.equal(h.state.collections.notifications.length, 1);
  assert.equal(h.state.collections.notifications[0].read, true);
  task.dueDate = '2026-10-07';
  await h.sync(h.db, h.email, now);
  assert.equal(h.state.collections.notifications.length, 2);
  task.status = 'done';
  await h.sync(h.db, h.email, now);
  assert.equal(h.state.collections.notifications.length, 2);
});

test('deadline becomes overdue at the next IST calendar day; legacy assignments and revoked membership are handled', async () => {
  const h = setup(); h.task({ assignees: undefined, assignee: h.email, dueDate: '2026-10-09' });
  await h.sync(h.db, h.email, new Date('2026-10-09T18:29:00Z'));
  assert.equal(h.state.collections.notifications.length, 0);
  await h.sync(h.db, h.email, new Date('2026-10-09T18:30:00Z'));
  assert.equal(h.state.collections.notifications.length, 1);
  h.state.collections.workspaces[0].members = [];
  h.task({ dueDate: '2026-10-08' });
  await h.sync(h.db, h.email, now);
  assert.equal(h.state.collections.notifications.length, 1);
});

test('notification actions require authentication, sync overdue alerts, and retain normal mark-as-read behavior', async () => {
  const h = setup(); h.task({ dueDate: '2000-01-01' });
  const actions = h.load('app/actions/notification.ts');
  h.state.session = null;
  assert.equal((await actions.getUnreadNotificationCount()).success, false);
  assert.equal(h.state.collections.notifications.length, 0);
  h.state.session = { user: { email: h.email } };
  assert.equal((await actions.getUnreadNotificationCount()).count, 1);
  const list = await actions.getNotifications();
  assert.equal(list.notifications.length, 1);
  const id = list.notifications[0].id;
  await actions.markNotificationRead(id);
  assert.equal((await actions.getUnreadNotificationCount()).count, 0);
  h.state.session.user.email = 'other@example.test';
  assert.deepEqual((await actions.getNotifications()).notifications, []);
});
