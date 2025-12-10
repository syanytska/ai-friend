# AI Friend — Moru 🐰

**A playful AI chat companion powered by Next.js, NextAuth, and Groq**

Meet Moru, your cheerful bunny friend who's here to chat, remember your personal details, and keep conversations fun and light! This full-stack application features Google OAuth authentication, conversation management, intelligent fact extraction, and a beautiful purple-themed UI.

## ✨ Features

- **🐰 Moru the Bunny**: Your playful AI companion with a fun personality and bunny-themed responses
- **🔐 Google OAuth**: Secure authentication with NextAuth
- **💬 Multi-Conversation**: Create, rename, and delete multiple chat conversations
- **🧠 Smart Memory**: Moru remembers your name, age, favorites, likes, and struggles
- **⚡ Fast Responses**: Deterministic fact lookups for instant answers to simple questions
- **🎨 Beautiful UI**: Purple gradient theme with mirrored logo design
- **📱 Responsive Design**: Works great on desktop and mobile
- **🔒 Privacy-First**: All conversations are private and scoped to your account

## 🎨 UI Highlights

- Purple gradient background with mirrored Moru logos
- "Welcome friends" greeting
- Purple message bubbles for your messages (with white text)
- Yellow message bubbles for Moru's responses
- Smooth conversation switching
- Clean, modern design with Tailwind CSS

## 🚀 Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4
- **Backend**: Next.js API Routes (server-side)
- **Database**: Prisma ORM with SQLite (dev) / PostgreSQL (production-ready)
- **Authentication**: NextAuth with Google OAuth
- **AI Model**: Groq SDK (llama-3.1-8b-instant)
- **Styling**: Tailwind CSS with custom gradients

## 📂 Project Structure

### Frontend (UI)
- `src/app/page.tsx` — Main chat interface with sidebar and message history
- `src/app/welcome/page.tsx` — Welcome/landing page with sign-in
- `src/app/layout.tsx` — Root layout
- `src/app/providers.tsx` — SessionProvider wrapper

### Backend (API Routes)
- `src/app/api/auth/[...nextauth]/route.ts` — NextAuth configuration
- `src/app/api/chat/route.ts` — Main chat endpoint with fact extraction and Groq integration
- `src/app/api/conversations/route.ts` — CRUD operations for conversations
- `src/app/api/messages/route.ts` — Fetch messages for a conversation

### Database
- `prisma/schema.prisma` — Database schema (User, Message, Conversation, Fact models)
- `prisma/migrations/` — Database migration history
- `src/lib/db.ts` — Prisma client singleton

## 🛠️ Setup & Installation

### Prerequisites
- Node.js 18+ installed
- Google Cloud Console project for OAuth credentials

### 1. Clone the repository
```bash
git clone https://github.com/syanytska/ai-friend.git
cd ai-friend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
Create a `.env.local` file in the root directory:

```bash
# Database
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key-here"

# Google OAuth (get from Google Cloud Console)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Groq API (get from https://console.groq.com)
GROQ_API_KEY="your-groq-api-key"
```

### 4. Set up the database
```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 5. Run the development server
```bash
npm run dev
```
###Troubleshooting (Windows / PowerShell)
If you run npm install and see this error:
```bash
File C:\Program Files\nodejs\npm.ps1 cannot be loaded because running scripts is disabled on this system.
For more information, see about_Execution_Policies at https:/go.microsoft.com/fwlink/?LinkID=135170.
```
it’s a PowerShell security setting, not a problem with Node or this project.
You can fix it in one of these ways:
✅## Option 1 (recommended): Use Command Prompt instead of PowerShell
#Open Command Prompt (not PowerShell).
#Navigate to the project folder:
```bash
cd C:\Users\user\Downloads\ai-friend-main
```
Run:
```bash
npm install
npm run dev
```
✅ Option 2: Temporarily allow scripts in the current PowerShell window
If you prefer using PowerShell, run this in the same PowerShell window before npm install:
```bash
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
npm install
npm run dev
```
This only affects that one PowerShell session and closes when you exit the window.
Open [http://localhost:3000](http://localhost:3000) in your browser!

## 🎮 How It Works

### Fact Extraction
Moru automatically extracts and remembers facts from your conversations:
- **Name**: "My name is Alex" or "I'm Alex"
- **Age**: "I'm 25 years old" or "I am 25"
- **Favorites**: "My favorite color is blue"
- **Likes**: "I like hiking"
- **Struggles**: "I struggle with focus because I get distracted"

### Deterministic Responses
For simple fact queries, Moru responds instantly without calling the AI model:
- "What's my name?" → Instant lookup
- "How old am I?" → Instant lookup
- "What's my favorite color?" → Instant lookup
- "What do I struggle with?" → Lists all struggles

### AI-Powered Conversations
For complex questions and general chat, Moru uses the Groq LLM with your conversation history and stored facts as context.

## 📝 Available Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

npx prisma studio    # Open Prisma Studio (database GUI)
npx prisma migrate dev --name <name>  # Create a new migration
npx prisma generate  # Regenerate Prisma Client
```

## 🔐 Security Features

- **Middleware auth guard**: Protected routes require authentication
- **Server-side session checks**: Every API route verifies ownership
- **Database scoping**: All queries filtered by `userId`
- **Cascade deletes**: Deleting a conversation removes all messages
- **Environment secrets**: Sensitive keys stored in `.env.local` (never committed)

## 🚀 Deployment (Production)

### Environment Setup
1. Set up PostgreSQL database (recommended: Vercel Postgres, Supabase, or Railway)
2. Update `DATABASE_URL` in production environment
3. Set production `NEXTAUTH_URL` to your domain
4. Generate a strong `NEXTAUTH_SECRET`: `openssl rand -base64 32`
5. Create production Google OAuth credentials with production callback URL

### Deploy to Vercel (Recommended)
```bash
npm run build  # Test build locally first
# Deploy via Vercel CLI or GitHub integration
# Add environment variables in Vercel dashboard
# Run: npx prisma migrate deploy (in production)
```

## 🐰 Meet Moru

Moru is your playful bunny companion who:
- Uses fun bunny puns ("hoppy to help!", "lettuce talk about that!")
- Adds playful actions (*hops excitedly*, *twitches nose*)
- Keeps conversations light and entertaining
- Never takes things too seriously!

## 📚 Documentation

For detailed development notes and project history, see `docs/JOURNAL.md`.

## 🤝 Contributing

This is a class project, but feel free to fork and build your own version!

## 📄 License

This project is built for educational purposes.

---

**Built with ❤️ and 🐰 by syanytska**

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

