// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// tiny helper to grab one capture group
function match1(text: string, re: RegExp): string | null {
  const m = text.match(re);
  return m?.[1] ? m[1].trim() : null;
}

export async function POST(req: NextRequest) {
  try {
    // 1) parse
    const { message } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // 2) ensure user (single demo user)
    const user = await prisma.user.upsert({
      where: { id: "guest" },
      update: {},
      create: { id: "guest", displayName: "Guest" },
    });

    // 3) save user message
    await prisma.message.create({
      data: { userId: user.id, role: "user", content: message },
    });

    // 3.5) OPTIONAL: extract simple facts from THIS message and persist
    const name =
      match1(message, /\bmy name is\s+([a-z][a-z '-]{1,50})/i) ??
      match1(message, /\b(?:i am|i'm)\s+([a-z][a-z '-]{1,50})/i);
    if (name) {
      await prisma.fact.upsert({
        where: { userId_key: { userId: user.id, key: "name" } }, // requires @@unique([userId, key])
        create: { userId: user.id, key: "name", value: name },
        update: { value: name },
      });
    }

    const age =
      match1(message, /\b(?:i am|i'm)\s+(\d{1,3})\b/i) ??
      match1(message, /\b(\d{1,3})\s*years?\s*old\b/i);
    if (age) {
      await prisma.fact.upsert({
        where: { userId_key: { userId: user.id, key: "age" } },
        create: { userId: user.id, key: "age", value: age },
        update: { value: age },
      });
    }

    // 4) load stored facts → single short system line
    const facts = await prisma.fact.findMany({ where: { userId: user.id } });
    const systemFacts = facts.length
      ? `Known user facts (prefer stored facts when present): ${facts
          .map((f) => `${f.key}=${f.value}`)
          .join(", ")}.`
      : "No stored user facts.";

    // 5) load short history (oldest → newest) and append current user turn
    const history = await prisma.message.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      take: 19, // leave room to append current input
    });

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: "No GROQ_API_KEY configured" }, { status: 500 });
    }

    // 6) call Groq chat
    const { default: Groq } = await import("groq-sdk");
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

    const messages = [
      {
        role: "system" as const,
        content:
          "You are a friendly, concise AI companion. Use chat history and provided facts. " +
          "If history conflicts, prefer the most recent user statement; if stored facts exist, prefer those.",
      },
      { role: "system" as const, content: systemFacts },
      ...history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: message }, // ensure latest user turn is present
    ];

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages,
      max_tokens: 256,
      temperature: 0.7,
    });

    const choice = completion.choices?.[0];
    let reply = (choice?.message?.content ?? "").trim();
    if (!reply) reply = "(no reply)";

    // 7) save assistant reply
    await prisma.message.create({
      data: { userId: user.id, role: "assistant", content: reply },
    });

    // 8) return JSON
    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error("POST /api/chat error:", err);
    const msg = err?.error?.message || err?.message || "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
