# Architecture — AI Friend

This document maps the repository files to the functional areas (frontend, backend, database) and lists the most important entry points.

Top-level layout
- `src/` — main application code. Next.js App Router is used so frontend pages and server API routes live under `src/app/`.

Frontend (client)
- `src/app/layout.tsx` — Root layout (renders `<Providers>` and global fonts/styles)
- `src/app/providers.tsx` — Client providers and wrapping (initializes `SessionProvider` with server session)
- `src/app/page.tsx` — Main chat application (client component)
- `src/app/welcome/page.tsx` — Welcome screen shown after sign-in
- `src/components/` — UI components such as `Composer.tsx`

Backend (server / API)
- `src/app/api/` — App Router API routes (these run on the server)
  - `src/app/api/auth/[...nextauth]/route.ts` — NextAuth configuration and adapter
  - `src/app/api/conversations/route.ts` — List/create conversations
  - `src/app/api/messages/route.ts` — Fetch messages for a conversation
  - `src/app/api/chat/route.ts` — Chat endpoint that saves messages and calls external model
  - `src/app/api/debug/*` — Dev-only debug endpoints (inspect DB rows)
  - `src/app/api/guest-chat` and `src/app/api/transfer-local` — guest / transfer endpoints (dev flow)

Database (Prisma)
- `prisma/schema.prisma` — Schema and models (User, Message, Conversation, Fact, NextAuth models)
- `prisma/migrations/` — SQL migration history
- `src/lib/db.ts` — Creates and exports the Prisma client for server code

Key design notes
- Authentication is handled by NextAuth with the Prisma adapter. The `session` callback attaches `user.id` to the client session object.
- Conversations are stored in the `Conversation` model and messages reference a conversation via `conversationId`.
- The UI sorts conversations by `updatedAt` and the server bumps `updatedAt` when messages are written so active conversations surface to the top.

Development notes
- Start dev server: `npm run dev` (uses Turbopack in this project)
- If you update `prisma/schema.prisma`, run:
  - `npx prisma migrate dev --name <name>`
  - `npx prisma generate`

Cleaning up dev-only APIs
- If you want a production-ready repo, delete or secure the dev-only endpoints:
  - `src/app/api/debug/*`
  - `src/app/api/guest-chat/route.ts`
  - `src/app/api/transfer-local/route.ts`

If you want me to reorganize the filesystem (move frontend to `frontend/` and server to `backend/`) I can propose a safe plan and apply it. This will require updating import paths and possibly your Next.js configuration; tell me if you want that and I will draft and apply the changes.
