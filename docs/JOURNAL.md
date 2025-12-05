# AI-Friend Project Journal
**Sept 1 — Nov 25, 2025**

---

## September 1 — 6 hours — Project Initialization & Environment Setup

**What I did:**
Spun up a new Next.js 15 app with TypeScript, Tailwind, and ESLint. Set up `tsconfig.json` with strict mode and path aliases (`@/lib`, `@/components`, `@/app`) to keep imports clean. Turned on Turbopack in `next.config.ts` for faster dev reloads. Installed the core stack: Next.js, React, Prisma (ORM), NextAuth (Google OAuth), Groq SDK (LLM), and OpenAI as backup. Kept everything in one full-stack project (frontend, API routes, database) instead of splitting things up—way easier to manage and deploy for a class project.

**What I learned:**
App Router in Next.js 15 is really nice for full-stack work. It gives a clean split between server and client components, which matters a lot for keeping auth server-side and avoiding hydration bugs. Turbopack noticeably speeds up dev builds. Prisma is a game-changer for having a type-safe DB layer without hand-writing SQL or managing migrations manually. I can focus on app logic instead of reinventing boring infrastructure.

**What I struggled with:**
Deciding between Pages Router and App Router took some thinking. App Router won because it's modern and works better with server components. Setting up the `@/` path aliases was picky—had to make sure `tsconfig.json` and `next.config.ts` matched exactly or things would randomly break between dev and build. Tailwind v4 was slightly different from what I knew, so I skimmed a migration guide.

---

## September 4 — 5 hours — Database Schema & Prisma Models

**What I did:**
Set up the Prisma schema in `prisma/schema.prisma` using SQLite for dev. Defined the User model with NextAuth fields (name, email, emailVerified, image) plus my own (displayName, timestamps). Added Account, Session, and VerificationToken for OAuth stuff. Created Conversation with id, title, userId, timestamps, and an index on `[userId, updatedAt]` for quick "recent chats" queries. Built Message with id, role (user/assistant enum), content, conversationId, userId, timestamps, and an index on `[userId, createdAt]`. Added Fact with id, key, value, userId, timestamps, plus a unique constraint on `[userId, key]` so each user has at most one value per fact (name, age, favorites, struggles, etc.). Then ran `prisma migrate dev --name init` to create the DB and generate the client.

**What I learned:**
Prisma's schema language is pretty intuitive. The Prisma adapter for NextAuth handles account linking automatically—no custom "find or create user" logic needed. Indexes on `[userId, updatedAt]` and `[userId, createdAt]` matter for speed when there's a lot of data. The unique constraint on `[userId, key]` for Fact is a nice way to safely "upsert" facts without duplicates. SQLite works great for dev and I can swap to Postgres later without rewriting the schema.

**What I struggled with:**
Designing the schema was tricky. I thought about denormalizing (like storing message counts on Conversation), but that opens the door to race conditions and complexity. Kept it normalized. Understanding Prisma's `@relation` directives and cascade delete took some reading, especially for "delete conversation → delete messages." Composite unique keys also took a minute to get the syntax right.

---

## September 7 — 4 hours — Env Vars & Prisma Client Singleton

**What I did:**
Made `src/lib/db.ts` as a Prisma client singleton so hot reloads in dev don't spawn a million connections. I stash the client on `globalThis` in dev. Set up `.env.local` with `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GROQ_API_KEY`. Created `.env.local.example` and committed it (never the real file) so people know what vars they need.

**What I learned:**
Good env setup prevents tons of headaches. You never commit `.env.local`, but `.env.local.example` is perfect for showing what's required. The Prisma singleton pattern is important in dev so you don't get "too many PrismaClient instances" warnings.

**What I struggled with:**
My first attempt at the singleton didn't actually cache across hot reloads properly. Checked the official Prisma docs and switched to the recommended pattern with `globalThis.prisma`. I also added helpful comments in `.env.local.example` for each key so people understand what they're for.

---

## September 10 — 5 hours — NextAuth & Google OAuth Wiring

**What I did:**
Set up NextAuth in `src/app/api/auth/[...nextauth]/route.ts` with Google provider. Used `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from env vars, set `prompt: "select_account"` to force the account chooser (multi-account support), and `access_type: "offline"` for potential refresh tokens later. Hooked up the Prisma adapter for automatic account linking. In the session callback, I attached the Prisma `user.id` onto the session so the client knows who's logged in. Added logging in signIn and lifecycle events to debug auth issues. Exported `authOptions` so I can reuse it with `getServerSession(authOptions)` in other API routes.

**What I learned:**
The session callback is the key piece—that's where the external Google identity gets mapped to my internal user ID. Once that's there, the rest of the app just uses `session.user.id`. The Prisma adapter saves me from writing my own "find or create user" logic. Logging in sign-in flows is invaluable when something feels off. `prompt: "select_account"` matters when people have multiple Google accounts so they don't accidentally log into the wrong one.

**What I struggled with:**
Had to untangle the difference between callbacks (run during the flow) and events (fire after the fact). I put logs in the wrong place at first. Once I moved logging to signIn, things made sense. Also had to watch the Account table while signing in multiple times to confirm the Prisma adapter wasn't duplicating accounts.

---

## September 13 — 5 hours — Conversations & Messages API

**What I did:**
Built the API routes for conversations and messages. `src/app/api/conversations/route.ts` has GET (list user's conversations, ordered by `updatedAt DESC`, limited to 100), POST (create new), PATCH (rename), and DELETE (delete + cascade messages). `src/app/api/messages/route.ts` has GET (fetch messages for a conversation, ordered by `createdAt ASC`, limited to 500). Every route starts with `getServerSession(authOptions)` to get the user, then uses `where: { userId }` in Prisma so users only see their own stuff. Wrapped everything in try/catch with proper HTTP codes (401, 404, 500).

**What I learned:**
Security is non-negotiable: every endpoint has to check ownership. One missed check and you're leaking someone's private chat. Using `getServerSession()` at the start of every API route is the right pattern in Next.js. Scoping queries with `where: { userId }` plus indexes keeps things fast and makes injection attacks basically a non-issue with Prisma. Take limits prevent huge payloads.

**What I struggled with:**
Went back and forth on how `/api/messages` should work. Considered POST but `GET /api/messages?conversationId=...` is simpler and more REST-y. Cascade deletes also needed thought—tested by hand and used curl with session cookies to make sure unauthorized users couldn't sneak in.

---

## September 16 — 6 hours — Main Chat UI & Local State

**What I did:**
Built the main chat page in `src/app/page.tsx` as a `"use client"` component. Set up state for message, history, conversations, activeConversationId, pendingConversationId, loading, and error. Used three useEffects: on mount load conversations, when activeConversationId changes load that conversation's messages, and persist the active conversation ID to localStorage. Built a sidebar with the conversation list, buttons to create/rename/delete. The main area shows "Signed in as", sign in/out buttons, message history with different styles for user vs assistant, timestamps, and a banner when a conversation is pending. Added the Composer at the bottom.

**What I learned:**
In Next.js, `useEffect` is essential for anything touching localStorage or client-only state. The server render doesn't know about the browser state, so I wait until mount to sync things. It's fine to keep non-sensitive stuff like activeConversationId in localStorage because the server enforces ownership. Breaking state into clear chunks makes the component easier to reason about.

**What I struggled with:**
Hydration issues were annoying—the UI would render one thing on the server and change on the client, causing warnings. Moved all localStorage access and session-dependent display into useEffect and things calmed down. The "pending conversation" UX also took thought: auto-switching felt weird, so I went with a banner that lets the user confirm they want to start a new chat.

---

## September 19 — 4 hours — Fact Extraction from Messages

**What I did:**
Added logic in `/api/chat` to extract structured "facts" from messages using regex. Looks for patterns like "my name is X", "I'm X" (names), "I'm 25", "25 years old" (age), "my favorite Y is Z" (stored as `favorite_Y`), "I like X" (likes), "I struggle with X (because Y)" (struggles). For each match, I call `prisma.fact.upsert()` using `where: { userId_key }` so I either create or update that fact. Made a small helper `match1()` to cleanly grab capture groups. Facts are stored separately and not shown in chat—just used for context and deterministic lookups.

**What I learned:**
Simple regex rules go a long way for basic patterns. The upsert pattern plus the unique `[userId, key]` constraint ensures the latest info always wins. Separating facts from messages keeps the conversation history clean and makes it easy to reuse user info across chats.

**What I struggled with:**
Language is messy. Things like "I like Alice in Wonderland" vs "my name is Alice" can confuse naive patterns. Tried a bunch of patterns at first, then backed off to a more conservative set to avoid false positives. Also debated storing facts on messages, but a dedicated Fact model turned out cleaner.

---

## September 22 — 4 hours — Deterministic Fact Fallbacks

**What I did:**
Extended `/api/chat` to answer simple "fact" questions directly from the database before calling the LLM. Load the user's facts, then check if the incoming message matches patterns like "what's my name?", "how old am I?", "what's my favorite X?", "what do I struggle with?". If there's a matching fact, return a hard-coded answer like "Your name is Alice." and skip the Groq API call. If I don't have that fact, either say I don't know or let it fall through to the LLM.

**What I learned:**
This is basically a mini production pattern: cheap deterministic logic where it makes sense, and LLM for everything else. For facts, a DB lookup is actually better than an LLM—instant and 100% correct. Also avoids sending private facts to the LLM when I don't need to.

**What I struggled with:**
The tricky part is deciding what counts as a "simple" question. Too aggressive and I might answer incorrectly. Too strict and I lose the benefit. Aimed for obvious patterns like "what's my X?" and let more complicated questions go to the LLM.

---

## September 25 — 3 hours — Welcome Page & Signed-In State

**What I did:**
Built a `/welcome` page in `src/app/welcome/page.tsx` that behaves differently based on auth state. If not signed in: peach background, big Moru logo, "You have to sign in to chat" message, and a "Sign in with Google" button that returns to `/welcome` after sign-in. If signed in: "Welcome To Moru" and "Let's Chat" with a button to go to `/` plus a small email display. Used `useSession()` plus `useEffect` to avoid hydration issues. After sign-out, people go back to `/welcome` instead of a broken page.

**What I learned:**
Having a dedicated welcome screen makes the app feel less confusing. New users immediately understand they need to log in, and returning users see a friendly landing. The `status` from `useSession()` (loading, unauthenticated, authenticated) is important and I need to handle all three.

**What I struggled with:**
Again, hydration—the server doesn't know the session yet, so I had to show a loading state while it figures it out. Also had to think through the sign-in redirect flow so users land somewhere sensible after OAuth.

---

## September 28 — 2 hours — Decided NOT to use Settings Modal

**What I did:**
Started building a SettingsModal component to let users upload logos and backgrounds, but after building it out and thinking it through, I realized it was feature creep for MVP. Base64 file uploads bloat payloads massively (1MB → 4MB), and uploading files in a dialog adds UI friction without clear value. Users signing in with Google already have their identity visible. I decided to defer UI customization entirely and focus on core chat functionality. Left the component in the codebase as a reference but never integrated it into the main page.

**What I learned:**
Sometimes finishing a component doesn't mean you should use it. Adding a settings modal felt like scope creep when users just want to chat. The fact that it's not integrated and not missed proves it wasn't critical. Also learned that base64 is not viable for real file uploads—cloud storage is necessary at scale.

**What I struggled with:**
It was mentally hard to abandon a component I'd already built. But stepping back, I realized users don't need UI customization to get value from the app. Made the pragmatic call to defer it. The `/api/assets/upload` endpoint remains unfinished, and the Fact model only stores personal facts (name, age, favorites, struggles)—keeps the schema simpler.

---

## October 4 — 5 hours — Groq LLM Integration & Persona

**What I did:**
Wired Groq into `/api/chat`. After checking deterministic fact fallbacks, I build an array of messages: a persona system message ("You are Noru, a friendly consulting rabbit…"), a system message with user facts, the last 20 messages of history, and the new user message. Call `groq.chat.completions.create()` with `model: "llama-3.1-8b-instant"`, `max_tokens: 256`, `temperature: 1.0`. If the reply doesn't mention Noru properly, I prepend something like "Noru (a friendly consulting rabbit):" to keep the persona consistent. Then save the assistant message to the DB and send it back.

**What I learned:**
Token budgeting matters. Shorter system prompts + limited history + capped output keeps each call affordable and fast. Groq is cheaper and faster than OpenAI for this use case. Post-processing the response to enforce the persona is a quick way to fix occasional prompt drift without going too deep into prompt engineering.

**What I struggled with:**
Finding the right amount of history to send took experimentation. Too little and the bot forgets context. Too much and cost jumps up. Landed on the last 20 messages as a reasonable balance. Persona consistency also needed tinkering—the model sometimes answered like a generic assistant, so the Noru wrapper helped.

---

## October 7 — 3 hours — User Settings API via Fact Model

**What I did:**
Made `/api/user/settings/route.ts` with GET and POST. GET fetches all facts for the user and returns them as settings. POST takes `{ key, value }` and does upsert on the Fact model with `userId_key` as the unique key. Basically turned the Fact table into a generic "user key/value store."

**What I learned:**
Reusing the Fact model for both personal info and settings keeps the schema simple. I don't need a whole separate Settings table when the structure is the same. Upserts with `[userId, key]` make updates simple and safe.

**What I struggled with:**
The main question was whether to split out settings into their own model. In the end, it felt like overkill. As long as I'm consistent about key naming, it's easy enough to distinguish them conceptually.

---

## October 10 — 4 hours — Middleware-Based Auth Guard

**What I did:**
Added `middleware.ts` at the root to guard routes at the HTTP layer. It lets public paths through (like `/api/auth/*`, `/welcome`, `/login`). For protected paths like `/api/chat`, `/api/conversations`, `/`, etc., it calls `getToken()` from `next-auth/next`. If there's no token on a protected route, redirect to `/welcome`. If there is a token, the request continues. Defense in depth.

**What I learned:**
Middleware is a good way to enforce "you must be logged in to hit these URLs" without copy-pasting logic everywhere. `getToken()` is fast and reads the session JWT from cookies—no DB access needed. Having auth checked at multiple layers (middleware, API endpoint, DB scoping) helps avoid security bugs from slipping through.

**What I struggled with:**
Deciding which routes are public vs protected took careful thinking. I initially forgot to allow `/api/auth/*`, which broke the sign-in flow. I also wanted `/welcome` to be visible both logged in and logged out. Ended up with a whitelist for truly public routes and treat the rest as protected.

---

## October 13 — 5 hours — End-to-End Auth & Fact Testing

**What I did:**
Clicked through the entire flow: Start at `/` → redirect to `/welcome` when logged out. Click "Sign in with Google" → pick account → come back to `/welcome` signed in. Click "Start Chatting" → go to `/`. Create a conversation and send "My name is Alice and I'm 30 years old." Check Prisma Studio → see the message saved and facts extracted. Ask "What's my name?" → get a deterministic response without hitting Groq. Ask something more general → verify it goes through Groq. Refresh the page → confirm conversation history and active conversation restore correctly.

**What I learned:**
Actually using the app like a real user is super helpful. Confirmed that auth, facts, and fallbacks all fit together the way I planned. Seeing facts show up in Prisma Studio is a nice sanity check. Proved that "remember which conversation you were on" logic works.

**What I struggled with:**
Google OAuth can be picky about redirect URLs. Had to make sure `NEXTAUTH_URL` exactly matched what I put in the Google console. Used Prisma Studio for DB inspecting since I didn't have sqlite3 in my PATH.

---

## October 16 — 4 hours — Rename & Delete Conversations

**What I did:**
Added support for renaming and deleting: PATCH `/api/conversations` → `{ conversationId, title }` updates the title after checking ownership. DELETE `/api/conversations` → `{ conversationId }` deletes messages first, then the conversation. On the frontend, sidebar got "Rename" (using `window.prompt`) and "Delete" (with confirm) buttons. After either action, reload the conversations list.

**What I learned:**
Even simple UX like rename and delete makes the app feel more complete. The pattern of "do the API call → on success, reload the list" is straightforward and reliable. Ownership checks on these routes are just as important as read routes.

**What I struggled with:**
`window.prompt()` isn't glamorous, but it works. I'd like a proper modal eventually, but this was faster to finish the functionality. Deciding to delete messages first, then the conversation, required understanding how foreign keys work in Prisma.

---

## October 19 — 4 hours — Hardening Regex Fact Extraction

**What I did:**
Tightened and extended regex patterns: Names added "I am X" and "I'm X." Age added "I am 25" and "25 years old." Favorites got better handling. Likes added "I enjoy X." Struggles added "I have trouble with X" with optional reason capture. Tested lots of example sentences, watched the Fact table, and logged whenever a fact was extracted.

**What I learned:**
Regex is powerful but fragile. More patterns = more coverage, but also more chances to grab the wrong thing. Found a balance where I catch the most common patterns without going too wild. Having logs for "fact extracted" helps verify the system is working as expected.

**What I struggled with:**
Debugging regex by hand is tedious. Used online regex testers to make it less painful. Also had to decide how strict to be—like not treating every "favorite ___" phrase as a structured fact if it might be ambiguous.

---

## October 22 — 4 hours — History Pagination & Performance Testing

**What I did:**
Stress-tested conversation history: sent ~25 messages in one conversation, navigated away and back, checked everything displayed in order. Made a second conversation with ~10 messages, switched between the two. Sent a super long message (1000+ characters). Tested very short conversations. Verified in Prisma Studio that `take: 500` limit works and queries are fast.

**What I learned:**
`take: 500` per conversation is a good starting point. It's a lot of messages and still loads quickly. Switching between conversations feels snappy and the localStorage-stored activeConversationId works as expected.

**What I struggled with:**
Manually creating that many messages got old, but it did the job. Noticed that `toLocaleString()` for timestamps can look different by locale, which is fine for now but something to think about later.

---

## October 25 — 3 hours — TypeScript Strict Mode & Lint Cleanup

**What I did:**
Turned on strict TypeScript mode (`strict: true` in tsconfig.json), ran `npm run lint`, and cleaned up warnings. Added explicit types where I had lazy `any`s and updated state types in `src/app/page.tsx`. Ran `npm run build` to confirm everything compiles cleanly.

**What I learned:**
Strict TS catches a lot of bugs early. Explicit types make the code easier to understand later. Running lint + build regularly keeps the codebase from silently drifting into a broken state.

**What I struggled with:**
Some libraries still need `as any` in a few unavoidable places. Tried to keep those to an absolute minimum. Updating earlier code to satisfy strict mode took a bit of refactoring.

---

## October 28 — 3 hours — Fallback System Validation

**What I did:**
Tested the deterministic fallback system: "What's my name?" (with stored name) → instant answer, no Groq. "How old am I?" → instant. "What's my favorite color?" → instant. "What do I struggle with?" → lists them. More complex stuff like "Can you recommend outdoor activities for someone my age?" → goes through Groq. Also confirmed that when facts don't exist, the system doesn't break—it either says it doesn't know yet or falls through to the LLM.

**What I learned:**
The fallback system behaves as intended: simple fact lookups are cheap and deterministic, while nuanced questions go through the LLM. Saves tokens and keeps private facts out of the LLM when not needed.

**What I struggled with:**
Verifying when Groq was being called or not meant watching logs. Also had to decide what to say when a requested fact doesn't exist; went with friendly "I don't know yet" behavior or letting Groq handle it.

---

## October 31 — 4 hours — Stress & Edge-Case Testing

**What I did:**
Hit the chat API with rapid-fire tests: 10 messages in quick succession, switching conversations rapidly, messages with emoji/Unicode/super long content (5000+ chars), empty messages (rejected), and fake SQL injection strings. Checked the DB afterward to make sure counts and timestamps looked good.

**What I learned:**
The system holds up under aggressive usage. Prisma's parameterized queries make SQL injection a non-issue. Unicode and emoji work fine in both DB and UI. Long messages are saved and rendered correctly.

**What I struggled with:**
Long messages plus LLM token limits are something to watch. For now, trusting that Groq handles oversized input reasonably, but I'd add checks if I wanted to be extra safe.

---

## November 3 — 4 hours — Error Handling & Logging Strategy

**What I did:**
Wrapped DB and LLM operations in try/catch. Started returning more specific HTTP codes (400, 401, 404, 500) instead of generic errors. Standardized logging so each request logs userId, conversationId, and what operation's happening. Tested error cases like missing Groq API key, unauthorized access, missing fields, Groq rate limits, and DB errors.

**What I learned:**
Good logging is basically how you debug in production. Being consistent about what you log (user, action, result) makes it way easier to piece together what happened later. Having clear error messages and proper HTTP codes helps the frontend behave correctly.

**What I struggled with:**
Walked a fine line between logging enough for debugging and not logging sensitive data. Decided to log IDs and lengths, but not message content or fact values. Figuring out when to treat something as 400 vs 500 is a bit fuzzy sometimes.

---

## November 6 — 3 hours — Production Build & Turbopack Check

**What I did:**
Ran `npm run build` to compile everything, checked for TypeScript and lint issues, then ran `npm run start` to try the production build locally. Clicked around: created conversations, sent messages, and made sure everything worked the same as dev. Confirmed Turbopack builds are fast and static assets from `/public/` are served properly.

**What I learned:**
Running the production build locally is a good final sanity check and catches problems before deployment. Next.js's build pipeline + Turbopack works well with this stack. Type/lint setup is pretty stable at this point.

**What I struggled with:**
The first build failed because of lingering `any`s that strict mode rejected. After cleaning those up, everything worked. Also double-checked that env vars are wired properly in production mode.

---

## November 9 — 4 hours — README & Deployment Docs

**What I did:**
Wrote a README.md with project overview, tech stack (Next.js, Prisma, NextAuth, Groq), setup instructions (clone, install, .env.local, `npm run dev`), all required env variables in `.env.local.example`, deployment notes (production DATABASE_URL, NEXTAUTH_URL, etc.), explanation of fact extraction and deterministic fallbacks, and a troubleshooting section for common issues like OAuth callback problems. Also made a `.env.production.example` for when moving to PostgreSQL.

**What I learned:**
Good docs help future me just as much as anyone else. Being explicit about environment variables and setup steps prevents "why doesn't this run?" confusion. Writing down design decisions and trade-offs makes it easier to explain the project.

**What I struggled with:**
Figuring out how detailed to be. I didn't want a 30-page README but also didn't want something useless. Settled on high-level explanations plus specific setup notes, letting code comments carry deeper details.

---

## November 12 — 4 hours — Full User Lifecycle Testing

**What I did:**
Walked through the entire user journey like I was a real user, not the developer. Started fresh: signed in with my Google account, got redirected to `/welcome` (signed in), clicked "Start Chatting" to go to `/`. Created my first conversation titled "Getting Started", then sent a message: "My name is Alex and I'm interested in machine learning." Watched the fact extraction happen in the background. Created a second conversation "Project Ideas" and switched between them a bunch of times. Sent follow-up messages in both, asked some fact queries ("What's my name?") to confirm deterministic answers, and some open-ended ones ("Why should I care about ML?") to confirm they hit Groq. Then I tested renaming a conversation, deleted one, signed out (confirmed redirect to `/welcome`), signed back in (session restored correctly). For the multi-user test, I created a separate Google test account, signed in with that, and verified I could only see conversations from that account—data isolation worked perfectly. Also checked that localStorage keys like `activeConv:${userId}` were properly scoped by user so the two accounts didn't interfere.

**What I learned:**
The full flow feels solid. Auth → conversations → messaging → facts → fallbacks → multi-user behavior all play nicely together. Each user only sees their own conversations and facts, which is crucial for privacy. The UI stayed responsive even when switching rapidly between conversations or reloading. No weird state inconsistencies or race conditions showed up. The persistent active conversation ID in localStorage means users don't lose their place when they refresh.

**What I struggled with:**
Creating a second test Google account took a few minutes of setup, but it was worth it to actually prove the multi-user story works, not just in theory. I also had to carefully verify that the second account truly had zero visibility into the first account's data—checked the DB directly to confirm the conversations belonged to different userIds.

---

## November 15 — 4 hours — Cost & Performance Optimization

**What I did:**
Sat down and did a serious "back-of-the-envelope" analysis on token usage and performance. Calculated: system persona prompt ~100 tokens, facts context ~50 tokens, last 20 messages of history ~500 tokens, output capped at 256 tokens max = roughly 900 tokens per Groq LLM call at peak. For Groq's free tier pricing, that works out to be dirt cheap per request. I also added some defensive logic: if the message history somehow balloons (like after a really long conversation), truncate to the last 10 messages instead of 20. Made a note about caching for repeated queries (future optimization: Redis or in-memory cache for "what's my name?" answers even before hitting the DB). Double-checked all the DB indexes on Conversation (`[userId, updatedAt]`) and Message (`[userId, createdAt]`) to make sure they're actually there. Then I stress-tested with larger data sets: spun up a test account and manually sent a ton of messages to it, then loaded a conversation with 1000+ messages and checked the query speed (still fast, <200ms). Created 100+ conversations and listed them (still fast, <100ms).

**What I learned:**
This design is already pretty darn efficient for a class project. The deterministic fallbacks are doing real work—they remove a huge chunk of unnecessary LLM calls, which saves cost and latency. Indexes are doing their job; queries feel snappy even with a lot of data. Token budgeting was the right call early on because it prevents runaway costs as conversations get longer. The trade-off between history length and context quality is well-balanced at 20 messages for most user flows.

**What I struggled with:**
Tuning history length is always a trade-off. More messages = better context and more natural conversation flow, but also higher token usage and cost. Shorter history = cheaper but choppy, disjointed conversations. Landed on 20 messages as a reasonable default after thinking about typical chat patterns. Decided not to over-optimize premature—left heavier stuff like Redis caching and smart truncation algorithms for future iterations when I actually see scaling problems. Also realized I should test with even bigger conversations (like 5000+ messages) someday, but for MVP this is fine.

---

## November 18 — 4 hours — Security & Abuse Scenario Testing

**What I did:**
Put on my "attacker hat" and tried to break my own app. Started by manually editing localStorage to a fake conversation ID from a different user's account, then refreshed the page—the API correctly rejected it with a 404. Then I crafted some raw HTTP requests using curl, trying to fetch conversations from user B while logged in as user A, and trying to modify user B's conversations—all rejected with 401 Unauthorized. Tested cascade deletes: created a conversation with 20 messages, deleted the conversation, then checked the DB to confirm all 20 messages were gone (cascade delete worked). Tried extreme inputs: sent a conversation title that's 5000+ characters long—it saved and displayed correctly. Tested Groq rate limiting: sent 30 requests in rapid succession and got a 429 rate limit error from Groq's API, which the app caught and returned to the user as a friendly error message (no crash). Tested network failure: temporarily blocked the Groq API endpoint in my hosts file and sent a chat message—got an error message returned, logged server-side, no crash.

**What I learned:**
The layered security approach actually works: middleware checks auth, API routes re-check with `getServerSession()`, and DB queries use `where: { userId }` to scope everything. Owning a conversation ID or knowing its structure isn't enough—it has to belong to your current userId or the whole request fails. Cascade deletes in Prisma prevent orphaned data, which would otherwise create data inconsistency bugs. Edge cases like super long strings are handled gracefully by the DB and UI. External API failures are caught and returned as friendly errors instead of exposing stack traces or crashing the server.

**What I struggled with:**
Thinking like an attacker is a different mindset than building features. I had to force myself to actually try to break things instead of assuming they'd work. I also initially over-worried about SQLite's performance under load, wondering if 1000+ messages would cause slowdowns, but indexes made queries consistently fast. Another thing: I wanted to test SQL injection attempts, so I tried sending messages like `'); DROP TABLE messages; --` as user input—Prisma's parameterized queries made that a non-issue, which is good, but it also meant I had to trust that parameterization was actually happening correctly under the hood.

---

## November 21 — 4 hours — Production Prep & Deployment Plan

**What I did:**
Got serious about making this deployable. Started by setting up a separate PostgreSQL database for production (instead of SQLite) in my `.env.production` file—I used a placeholder URL format so when I actually deploy to Vercel, I'll just swap in the real DB. Set proper `NEXTAUTH_URL` for the live domain (I'll use the actual domain once deployed). Generated a proper strong `NEXTAUTH_SECRET` using `openssl rand -base64 32` instead of my dev "super-secret-key-for-nextauth". Created separate Google OAuth credentials in the Google Console specifically for the production domain, keeping those separate from my dev credentials (different client IDs). Set up a production `GROQ_API_KEY` and made sure it has better rate limits than the free tier. Reviewed `next.config.ts` and `tsconfig.json` line-by-line to make sure no debug flags or dev-only stuff was left in. Wrote detailed deployment steps in the README (Vercel is recommended, but documented alternatives). Made sure to note that on first production deploy, I need to run `prisma migrate deploy` to actually create the database schema.

**What I learned:**
Production and dev environments are fundamentally different and need completely separate setups, especially for OAuth and databases. Vercel makes it super straightforward to manage environment variables and handle builds—you just paste your secrets into their dashboard. Writing down deployment steps now, while everything is fresh in my head, saves me from having to guess or dig through docs later. Postgres is a real production database, whereas SQLite is just a file-based thing for local dev. The migration from SQLite to Postgres is automatic because I defined the schema in Prisma, not with SQL directly.

**What I struggled with:**
Managing separate OAuth apps (one for localhost, one for the production domain) is a bit tedious—Google's console makes you set up different callback URLs for each. If I mess up the callback URL, the OAuth flow just silently fails in confusing ways. I double-checked the README and my env file templates multiple times to make sure I didn't accidentally swap secrets or URLs. I also had to think through: what if I deploy and then realize I forgot to set an env var? The build would fail. So I documented what happens if a key is missing and how to fix it.

---

## November 24 — 5 hours — Final Acceptance Testing

**What I did:**
Did one more comprehensive pass, treating this like the final version of the project I'm shipping. Created several new conversations across different categories (random chat, project ideas, questions), and sent over 50 messages total testing a wide variety of inputs. Tested fact extraction extensively: messages with names in different formats ("I'm Alex", "My name is Alex", "Alex is the name"), ages, favorite things, likes, and struggles with reasons ("I struggle with focus because I get distracted"). Sent deterministic queries ("What's my name?", "How old am I?", "What do I like?") and watched the instant responses come back without hitting Groq. Sent open-ended reasoning questions ("Should I learn Python or JavaScript for web dev?") and got back thoughtful LLM responses with the Noru persona. Switched between conversations rapidly, reloaded the page multiple times, and verified that history loaded back correctly and the active conversation ID persisted. Switched Google accounts one more time to triple-check data isolation. Ran the full TypeScript compile check (`npm run build`), ESLint (`npm run lint`), and the production build (`npm run start`) to make sure everything was clean and prod-ready. Checked the final output: no TypeScript errors, no lint warnings, build succeeds.

**What I learned:**
The app feels genuinely complete now. Auth works smoothly, conversations are fast and reliable, messaging feels natural, Noru's persona is consistent, fact extraction is accurate enough, deterministic fallbacks work great for simple queries, and multi-user isolation is rock solid. All the pieces fit together cohesively. The code is type-checked, linted, and comprehensively documented. This isn't just a rough prototype—it's a real, working, production-adjacent application that I'm actually proud to use myself. Testing it like a real user, not as the developer, revealed no major issues or gotchas.

**What I struggled with:**
Running through so many different test scenarios by hand is genuinely time-consuming and tedious. After the 50th message, I was a bit tired of manually creating test data. If I were to take this further professionally, I'd definitely set up automated E2E tests with Cypress or Playwright to cover the critical user journeys (auth → create conversation → send messages → check facts → sign out). For my final project, manual testing was thorough and gave me real confidence in the app because I used it exactly like a real user would.

---

## November 25 — 4 hours — Finalization & Future Work Log

**What I did:**
Spent the day polishing and wrapping up the project as my final version. Cleaned out any leftover debug code or console.logs. Ran formatters and linters one last time to make sure everything is pristine. Made a final commit to git with a message summarizing the main features: "Final project complete: Full-stack auth, conversations, messaging, fact extraction, deterministic fallbacks, multi-user support." Updated the README with a "Status: Complete" section. Wrote down all the future improvement ideas in a separate section so they're documented but don't weigh on my mind: async file uploads + cloud storage (S3/Supabase) instead of base64, full migration to PostgreSQL in dev (not just production), query caching with Redis or in-memory, infinite scroll for very long conversation histories, a proper settings UI modal instead of `window.prompt()`, conversation export to PDF or markdown, full-text search across conversations, fact management UI where users can view/edit/delete their stored facts, and dark mode toggle. Also noted some things that worked out well: the Groq integration is solid, the fact extraction approach is surprisingly effective for an MVP, the deterministic fallbacks saved significant API costs, and the multi-user isolation is bulletproof.

**What I learned:**
It's genuinely important to draw a line and say "this is finished," and I've reached that point. Perfectionism is a trap—the project is in a great place and calling it complete is the right call. This isn't a tiny prototype—it's a full, working, production-adjacent full-stack application with frontend, backend, and database all integrated using real-world tools (Prisma, NextAuth, Groq). I could confidently present this project in a job interview or to other developers. The timeline (Sept 1 — Nov 25, roughly 3 months) was very reasonable for building an app of this quality while balancing other class work.

**What I struggled with:**
The hardest part was deciding where to actually stop. There's always another feature I could build, another edge case to handle, another optimization to make. I kept reminding myself: "This is good enough for the class. You can iterate on it later if you want." The temptation to add the settings modal back or implement cloud storage was real, but I forced myself to be pragmatic about scope. Also, reflecting on 3 months of work in a few hours was a bit surreal—I forgot how many small decisions and bug fixes went into this thing.

---

**Project Summary:**
- **Duration**: September 1 — November 25, 2025 (~3 months, built mostly on weeknights and weekends)
- **Tech Stack**: Next.js 15, React 19, TypeScript, Prisma, SQLite (dev)/Postgres (prod-ready), NextAuth, Groq LLM
- **Features**: Google OAuth, conversations (CRUD), messaging, Groq LLM with Noru persona, fact extraction from messages, deterministic fact lookups, multi-user isolation, responsive UI with Tailwind
- **Status**: Final project complete and ready for deployment
