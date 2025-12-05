# AI Friend — Project Overview

This repository is a Next.js (App Router) + NextAuth + Prisma project that provides a small chat UI with per-user conversations backed by a SQLite database.

This README gives a quick map of where the frontend, backend, and database code live so you can find the right files quickly.

Frontend (UI)
- `src/app/` — Next.js App Router pages and layouts (React components)
  - `src/app/page.tsx` — Main chat UI (sidebar, conversation list, composer)
  - `src/app/welcome/page.tsx` — Welcome page shown after sign-in
  - `src/app/layout.tsx` — Root layout (mounts providers)
  - `src/app/providers.tsx` — Client providers (wraps `SessionProvider`)

- `src/components/` — Reusable UI components
  - `src/components/Composer.tsx` — Chat input component

Backend (server routes / APIs)
- `src/app/api/` — App Router API routes (Next.js server code)
  - `src/app/api/auth/[...nextauth]/route.ts` — NextAuth handler and `authOptions`
  - `src/app/api/conversations/route.ts` — List/create conversations for the signed-in user
  - `src/app/api/messages/route.ts` — Fetch messages for a conversation
  - `src/app/api/chat/route.ts` — Chat endpoint that saves messages and calls the model
  - `src/app/api/*` — other API routes (transfer-local, guest-chat, debug) — see `docs/ARCHITECTURE.md`

Database (Prisma)
- `prisma/schema.prisma` — Prisma schema (models: User, Message, Conversation, Fact, NextAuth models)
- `prisma/migrations/` — Migration SQL files recorded when schema changed
- `src/lib/db.ts` — Exports Prisma client instance used by server code

Auth
- `next-auth` is configured in `src/app/api/auth/[...nextauth]/route.ts` and uses the Prisma Adapter. The session callback exposes `session.user.id` for client code.

Useful commands
- Install deps: `npm install`
- Start dev server: `npm run dev`
- Run Prisma migrate (dev):
  - `npx prisma migrate dev --name <name>`
  - `npx prisma generate`

Environment variables (needed)
- `DATABASE_URL` — Prisma database (sqlite file path or other DB url)
- `NEXTAUTH_SECRET` — NextAuth secret
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — OAuth provider credentials
- `GROQ_API_KEY` — (optional) for model completions

Notes & next steps
- The app currently enforces authentication for pages via middleware and server-side checks. There are a few dev-only endpoints left (`/api/debug/*`, `/api/guest-chat`, `/api/transfer-local`) — remove them if you want a production-clean codebase.
- If you'd like me to physically move files into separate `frontend/` and `backend/` folders, I can do that, but it will require small code updates (imports, paths) and a careful pass to update references.

If you want me to: (reply with one)
- "Remove dev endpoints" — I'll delete debug/guest endpoints.
- "Reorganize into frontend/backend folders" — I'll propose an exact move plan and perform it.
- "Add server-side last-active conversation" — I'll add a DB column and small migration to store last active conversation per user.
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

