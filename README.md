# TaskFlow

A responsive team project-management application built with Next.js, Auth.js, MongoDB and TypeScript.

## Features

- Credentials authentication with hashed passwords
- Light / dark theme with persistent preference
- Dashboard overview with status counts, Monday–Sunday due tasks, and top assignees
- Workspaces with owners and members
- Create a workspace and invite members
- Join a workspace using a 6-character code
- Workspace-scoped task creation
- Assignee dropdown limited to workspace members
- Assignment notifications
- Overdue alerts for task creators and assignees, checked every 30 seconds while using the app and on return (IST deadlines; once per task, recipient, and due date)
- My Tasks view across workspaces
- Global tasks and My Tasks with shared List and Kanban views
- Inline task editing with save/cancel and validation feedback
- Filters for workspace, assignee, creator, multiple statuses/priorities, and tags with AND/OR matching
- Due-date filters for overdue, today, Monday–Sunday weeks, and inclusive custom ranges (IST)
- Optional planned start dates and due dates
- Kanban drag-and-drop
- Status flow: To Do ↔ In Progress ↔ Completed, one stage at a time
- Task and workspace edit/delete permissions
- Confirmation dialogs for destructive actions
- Profile view and editing, including validated PNG/JPEG/WebP avatar upload (512 KB maximum), resizing, and removal
- Comments
- Server-side validation with Zod
- Responsive desktop/tablet/mobile UI with keyboard status controls, accessible form labels, modal focus containment, and Escape-to-close

## Setup

```bash
npm install
```

Copy `.env.example` to `.env.local` and add your MongoDB Atlas URI and Auth.js secret.

```bash
cp .env.example .env.local
```

Then run:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Production checks

```bash
npm run lint
npm run test:auth
npm run test:tasks
npm run test:notifications
npm run test:profile
npm run test:crud
npm run build
```

## Workspace model

A workspace has one owner and one or more members. Tasks belong to exactly one workspace. Only workspace members can access its tasks. Owners can manage workspace membership and delete/edit the workspace. Task creators own their tasks; assignees can view and comment. The task status can only move one stage at a time.

All current workspace members can create tasks. Only a task's creator can edit or delete it; creators and assignees can change its status and add comments. Only a comment's author can delete it, while they still have access to the task. Workspace ownership does not grant permission to edit another person's task or delete their comments. Deleting a workspace removes its tasks, comments, and announcements. Removed members lose access.

Existing tasks do not need a migration: `startDate` is optional. Task filtering always stays within the current task view and workspace permissions.

## Environment variables

Never commit `.env.local` or real MongoDB credentials. Use `.env.example` as the template.
