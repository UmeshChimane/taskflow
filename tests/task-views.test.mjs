import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ObjectId } from 'mongodb';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { harness } from './helpers.mjs';

const pure = harness().load('lib/task-views.ts');
const { filterSchema, filterTasks, taskSchedule, weekBounds, addDays, todayKey, serializeTask } = pure;
const userEmail = 'me@example.test';
const workspaceA = String(new ObjectId()), workspaceB = String(new ObjectId());
const today = '2026-10-09';
const task = (id, extra = {}) => ({ id, title: `Task ${id}`, description: '', status: 'todo', priority: 'medium', startDate: null, dueDate: null, assignees: [], tags: [], createdBy: 'other@example.test', createdAt: '2026-10-01T00:00:00.000Z', isOwner: false, canChangeStatus: false, workspaceId: workspaceA, workspaceName: 'Workspace', href: '/workspaces/example', ...extra });
const tasks = [
  task('overdue', { dueDate: '2026-10-08', assignees: [userEmail], tags: ['api', 'urgent'], priority: 'high', createdBy: userEmail }),
  task('today', { dueDate: today, status: 'in-progress', assignees: ['teammate@example.test'], tags: ['api'], workspaceId: workspaceB }),
  task('done', { dueDate: '2026-10-05', status: 'done', tags: ['ui'], assignees: [userEmail] }),
  task('week-end', { dueDate: '2026-10-11', priority: 'low', tags: ['urgent'] }),
  task('next-week', { dueDate: '2026-10-12', tags: ['api'] }),
  task('undated'),
];
const filtered = input => filterTasks(tasks, filterSchema.parse(input), userEmail, today).map(t => t.id).sort();

test('calendar dates use IST and Monday–Sunday weeks across month/year boundaries', () => {
  assert.equal(todayKey(new Date('2026-10-08T20:00:00Z')), today);
  assert.deepEqual(weekBounds(today), { from: '2026-10-05', to: '2026-10-11' });
  assert.deepEqual(weekBounds('2027-01-01'), { from: '2026-12-28', to: '2027-01-03' });
  assert.equal(addDays('2024-02-28', 1), '2024-02-29');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});

test('due filters exclude completed overdue tasks and include both custom endpoints', () => {
  assert.deepEqual(filtered({ due: 'overdue' }), ['overdue']);
  assert.deepEqual(filtered({ due: 'today' }), ['today']);
  assert.deepEqual(filtered({ due: 'week' }), ['done', 'overdue', 'today', 'week-end']);
  assert.deepEqual(filtered({ due: 'custom', from: '2026-10-08', to: '2026-10-09' }), ['overdue', 'today']);
  assert.deepEqual(filtered({ due: 'custom', to: '2026-10-05' }), ['done']);
  assert.deepEqual(filtered({ due: 'custom', from: '2026-10-11' }), ['next-week', 'week-end']);
});

test('assignee/workspace/relation filters combine with multiple statuses and priorities', () => {
  assert.deepEqual(filtered({ relation: 'assigned' }), ['done', 'overdue']);
  assert.deepEqual(filtered({ relation: 'created' }), ['overdue']);
  assert.deepEqual(filtered({ workspaceIds: [workspaceB] }), ['today']);
  assert.deepEqual(filtered({ statuses: ['todo', 'in-progress'], priorities: ['medium', 'high'], assignees: [userEmail, 'teammate@example.test'] }), ['overdue', 'today']);
  assert.deepEqual(filtered({ relation: 'assigned', workspaceIds: [workspaceA], statuses: ['todo'], priorities: ['high'] }), ['overdue']);
  assert.deepEqual(filtered({ search: 'TASK TODAY' }), ['today']);
});

test('tag AND requires every tag; OR permits any selected tag', () => {
  assert.deepEqual(filtered({ tags: ['api', 'urgent'], tagLogic: 'and' }), ['overdue']);
  assert.deepEqual(filtered({ tags: ['api', 'urgent'], tagLogic: 'or' }), ['next-week', 'overdue', 'today', 'week-end']);
  assert.deepEqual(filtered({ tags: ['missing'], tagLogic: 'or' }), []);
});

test('invalid dates and reversed/empty custom ranges are rejected', () => {
  for (const input of [{ due: 'custom' }, { due: 'custom', from: '2026-10-10', to: '2026-10-09' }, { due: 'custom', from: '2026-02-30' }, { statuses: ['unknown'] }, { workspaceIds: ['invalid'] }]) assert.equal(filterSchema.safeParse(input).success, false);
});

test('timeline durations are explicit and inclusive; due-only tasks are milestones', () => {
  assert.deepEqual(taskSchedule(task('range', { startDate: '2026-10-08', dueDate: '2026-10-10' })), { from: '2026-10-08', to: '2026-10-10', duration: 3 });
  assert.deepEqual(taskSchedule(task('same-day', { startDate: today, dueDate: today })), { from: today, to: today, duration: 1 });
  assert.deepEqual(taskSchedule(tasks[1]), { from: today, to: today, duration: null });
  assert.equal(taskSchedule(task('start-only', { startDate: today })), null);
  assert.equal(taskSchedule(task('reversed', { startDate: '2026-10-10', dueDate: today })), null);
  assert.equal(taskSchedule(task('invalid', { dueDate: '2026-02-30' })), null);
});

test('sorting by due date keeps undated tasks last; priority orders high before low', () => {
  assert.equal(filterTasks(tasks, filterSchema.parse({ sort: 'due' }), userEmail, today).at(-1).id, 'undated');
  const priority = filterTasks(tasks, filterSchema.parse({ sort: 'priority' }), userEmail, today);
  assert.equal(priority[0].id, 'overdue');
  assert.equal(priority.at(-1).id, 'week-end');
});

function actionHarness() {
  const h = harness();
  h.state.session = { user: { email: userEmail, name: 'Current user' } };
  h.state.collections.workspaces.push({ _id: new ObjectId(workspaceA), name: 'Workspace A', members: [{ email: userEmail }, { email: 'teammate@example.test' }] });
  h.state.collections.users.push({ _id: new ObjectId(), email: userEmail, name: 'Current user' }, { _id: new ObjectId(), email: 'teammate@example.test', name: 'Teammate' }, { _id: new ObjectId(), email: 'outsider@example.test', name: 'Outsider' });
  h.state.collections.tasks.push(
    { _id: new ObjectId(), title: 'My task', workspaceId: new ObjectId(workspaceA), createdBy: userEmail, assignees: [userEmail], startDate: '2026-10-08', dueDate: '2026-10-10', status: 'todo', priority: 'medium' },
    { _id: new ObjectId(), title: 'Teammate task', workspaceId: new ObjectId(workspaceA), createdBy: 'teammate@example.test', assignees: ['teammate@example.test'] },
    { _id: new ObjectId(), title: 'Private task', workspaceId: new ObjectId(workspaceB), createdBy: userEmail, assignees: [userEmail] },
    { _id: new ObjectId(), title: 'Legacy assignment', workspaceId: new ObjectId(workspaceA), assignee: userEmail },
  );
  return { ...h, actions: h.load('app/actions/task.ts') };
}

test('global and My Tasks loaders never include inaccessible workspaces or unrelated directory users', async () => {
  const h = actionHarness();
  const global = await h.actions.getTaskViews();
  assert.equal(global.success, true);
  assert.deepEqual(global.tasks.map(t => t.title).sort(), ['Legacy assignment', 'My task', 'Teammate task']);
  assert.deepEqual(global.members.map(m => m.email).sort(), [userEmail, 'teammate@example.test'].sort());
  const mine = await h.actions.getTaskViews(true);
  assert.deepEqual(mine.tasks.map(t => t.title).sort(), ['Legacy assignment', 'My task']);
  assert.equal(global.tasks.find(t => t.title === 'My task').isOwner, true);
  assert.equal(global.tasks.find(t => t.title === 'Teammate task').canChangeStatus, false);
  assert.equal(global.tasks.find(t => t.title === 'Teammate task').href, `/workspaces/${workspaceA}`);
  h.state.session = null;
  assert.equal((await h.actions.getTaskViews()).success, false);
});

test('serializer preserves legacy dates/assignments without inventing planned start dates', () => {
  const record = serializeTask({ _id: new ObjectId(), workspaceId: new ObjectId(workspaceA), assignee: userEmail, dueDate: today }, userEmail, 'Workspace');
  assert.equal(record.startDate, null);
  assert.deepEqual(record.assignees, [userEmail]);
  assert.equal(record.canChangeStatus, true);
});

test('saved filters can be reused, favorited and deleted only by their authenticated owner', async () => {
  const h = actionHarness();
  const saved = await h.actions.saveTaskFilter({ name: '  My overdue work  ', filter: { relation: 'assigned', due: 'overdue', tags: ['api'], tagLogic: 'and' }, userEmail: 'attacker@example.test' });
  assert.equal(saved.success, true);
  let listed = await h.actions.getSavedTaskFilters();
  assert.equal(listed.filters[0].name, 'My overdue work');
  assert.deepEqual(filterTasks(tasks, listed.filters[0].filter, userEmail, today).map(t => t.id), ['overdue']);
  assert.equal((await h.actions.favoriteTaskFilter(saved.id, true)).success, true);
  listed = await h.actions.getSavedTaskFilters();
  assert.equal(listed.filters[0].favorite, true);
  h.state.session.user.email = 'attacker@example.test';
  assert.deepEqual((await h.actions.getSavedTaskFilters()).filters, []);
  assert.equal((await h.actions.favoriteTaskFilter(saved.id, false)).success, false);
  assert.equal((await h.actions.deleteTaskFilter(saved.id)).success, false);
  h.state.session.user.email = userEmail;
  assert.equal((await h.actions.deleteTaskFilter(saved.id)).success, true);
  assert.deepEqual((await h.actions.getSavedTaskFilters()).filters, []);
});

test('saved-filter actions reject malformed criteria and anonymous writes', async () => {
  const h = actionHarness();
  assert.equal((await h.actions.saveTaskFilter({ name: 'Broken', filter: { due: 'custom', from: '2026-02-30' } })).success, false);
  assert.equal((await h.actions.favoriteTaskFilter('bad-id', true)).success, false);
  h.state.session = null;
  assert.equal((await h.actions.saveTaskFilter({ name: 'Test', filter: {} })).success, false);
  assert.equal(h.state.writes.length, 0);
});

test('inline updates preserve omitted start dates, enforce chronology and owner/status permissions', async () => {
  const h = actionHarness();
  const doc = h.state.collections.tasks[0];
  const input = { title: 'Edited task', description: '', priority: 'high', status: 'todo', dueDate: '2026-10-11', assignees: [userEmail], tags: ['api'], workspaceId: workspaceA };
  assert.equal((await h.actions.updateTask(String(doc._id), input)).success, true);
  assert.equal(doc.startDate, '2026-10-08');
  assert.equal((await h.actions.updateTask(String(doc._id), { ...input, dueDate: '2026-10-07' })).success, false);
  assert.equal((await h.actions.updateTask(String(doc._id), { ...input, startDate: '2026-10-12' })).success, false);
  assert.equal((await h.actions.updateTask(String(doc._id), { ...input, status: 'done' })).success, false);
  assert.equal((await h.actions.updateTask(String(doc._id), { ...input, startDate: null })).success, true);
  assert.equal(doc.startDate, null);
  h.state.session.user.email = 'teammate@example.test';
  assert.equal((await h.actions.updateTask(String(doc._id), input)).success, false);
});

test('task creation rejects reversed schedules and persists valid start dates', async () => {
  const h = actionHarness();
  const input = { title: 'Scheduled task', status: 'todo', priority: 'medium', workspaceId: workspaceA, startDate: '2026-10-10', dueDate: '2026-10-09' };
  assert.equal((await h.actions.createTask(input)).success, false);
  assert.equal((await h.actions.createTask({ ...input, dueDate: '2026-10-12' })).success, true);
  assert.equal(h.state.collections.tasks.at(-1).startDate, '2026-10-10');
});

test('calendar and Gantt render milestones, durations, and undated tasks without fabricating dates', () => {
  const { load } = harness();
  const { CalendarView, TimelineView } = load('components/tasks/ScheduleViews.tsx');
  const scheduled = [...tasks, task('range', { startDate: '2026-10-09', dueDate: '2026-10-11' })];
  const calendar = renderToStaticMarkup(React.createElement(CalendarView, { tasks: scheduled, today }));
  assert.match(calendar, /October 2026/);
  assert.match(calendar, /Without a due date \(1\)/);
  const timeline = renderToStaticMarkup(React.createElement(TimelineView, { tasks: scheduled, today }));
  assert.match(timeline, /Milestone/);
  assert.match(timeline, /3 days/);
  assert.match(timeline, /Incomplete schedules \(1\)/);
  assert.match(timeline, /Task undated/);
});
