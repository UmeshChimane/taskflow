# TaskFlow

A responsive team project-management application built with Next.js, Auth.js, MongoDB and TypeScript.

## Features

- Credentials authentication with hashed passwords
- Light / dark theme with persistent preference
- Dashboard overview
- Workspaces with owners and members
- Create a workspace and invite members
- Join a workspace using a 6-character code
- Workspace-scoped task creation
- Assignee dropdown limited to workspace members
- Assignment notifications
- My Tasks view across workspaces
- Task filtering and sorting
- Kanban drag-and-drop
- Status flow: To Do ↔ In Progress ↔ Completed, one stage at a time
- Task and workspace edit/delete permissions
- Confirmation dialogs for destructive actions
- Profile view and editing
- Comments
- Server-side validation with Zod
- Responsive desktop/tablet/mobile UI

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
npm run build
```

## Workspace model

A workspace has one owner and one or more members. Tasks belong to exactly one workspace. Only workspace members can access its tasks. Owners can manage workspace membership and delete/edit the workspace. Task creators own their tasks; assignees can view and comment. The task status can only move one stage at a time.

## Environment variables

Never commit `.env.local` or real MongoDB credentials. Use `.env.example` as the template.
