// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// tiny helper to grab one capture group
function match1(text: string, re: RegExp): string | null {
  const m = text.match(re);
  return m?.[1] ? m[1].trim() : null;
}

export async function POST(req: NextRequest) {
  try {
  const { message, conversationId: providedConversationId } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }
    const session = await getServerSession(authOptions as any);
    const userId = (session as any)?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    // Determine conversation: use provided, or create a new one for this user
    let conversationId = providedConversationId as string | undefined;
    if (!conversationId) {
      const conv = await (prisma as any).conversation.create({
        data: { title: "New conversation", userId: user.id },
      });
      conversationId = conv.id as string;
    } else {
      // verify conversation belongs to user
      const conv = await (prisma as any).conversation.findUnique({ where: { id: conversationId } });
      if (!conv || conv.userId !== user.id) {
        return NextResponse.json({ error: "Conversation not found or unauthorized" }, { status: 404 });
      }
    }

    console.log("POST /api/chat - incoming", { userId, providedConversationId, conversationId });

    // persona helper - used for deterministic replies when we don't call the model
    function personaWrap(text: string) {
      // short Noru voice wrapper
      return `MCru (a friendly consulting rabbit): ${text}`;
    }

    //Save the user's message
    const userMsg = await (prisma as any).message.create({
      data: { userId: user.id, role: "user", content: message, conversationId },
    });
    console.log("Saved user message", { id: userMsg.id });

    // bump conversation's updatedAt so listing shows recent activity
    try {
      await (prisma as any).conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
    } catch (e) {
      // non-fatal if we can't bump updatedAt
      console.warn("Could not bump conversation.updatedAt", e);
    }

    //Extract simple facts from this message and store them
    const name =
      match1(message, /\bmy name is\s+([a-z][a-z '-]{1,50})/i) ??
      match1(message, /\b(?:i am|i'm)\s+([a-z][a-z '-]{1,50})/i);
    if (name) {
      await prisma.fact.upsert({
        where: { userId_key: { userId: user.id, key: "name" } },
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

    // extract "my favorite X is Y" patterns, e.g. "my favorite fruit is apple"
    try {
      const favRe = /\bmy favorite ([a-z ]{1,50}) is\s+([a-z0-9' \-]{1,100})/i;
      const fav = message.match(favRe);
      if (fav) {
        const keyRaw = fav[1].trim().replace(/\s+/g, "_").toLowerCase();
        const key = `favorite_${keyRaw}`;
        const value = fav[2].trim();
        await prisma.fact.upsert({
          where: { userId_key: { userId: user.id, key } },
          create: { userId: user.id, key, value },
          update: { value },
        });
      }

      // another common phrasing: "I like apples" -> store under key 'likes'
      const likeRe = /\bi like ([a-z0-9' \-]{1,100})/i;
      const like = message.match(likeRe);
      if (like) {
        const value = like[1].trim();
        await prisma.fact.upsert({
          where: { userId_key: { userId: user.id, key: "likes" } },
          create: { userId: user.id, key: "likes", value },
          update: { value },
        });
      }
    } catch (e) {
      console.warn("Fact extraction failed", e);
    }

    // extract "I struggle with X" or "I have trouble with X because Y"
    try {
      const struggleRe = /\b(?:i struggle with|i'm struggling with|i have trouble with|i have issues with)\s+([a-z0-9' \-]{1,100})(?:\s+because\s+(.{1,200}))?/i;
      const s = message.match(struggleRe);
      if (s) {
        const topicRaw = s[1].trim().toLowerCase();
        const topicKey = topicRaw.replace(/\s+/g, "_");
        const reason = s[2] ? s[2].trim() : undefined;

        // store a struggle topic key, and optionally a reason keyed by topic
        const struggleKey = `struggle_${topicKey}`;
        await prisma.fact.upsert({
          where: { userId_key: { userId: user.id, key: struggleKey } },
          create: { userId: user.id, key: struggleKey, value: "true" },
          update: { value: "true" },
        });

        if (reason) {
          const reasonKey = `struggle_reason_${topicKey}`;
          await prisma.fact.upsert({
            where: { userId_key: { userId: user.id, key: reasonKey } },
            create: { userId: user.id, key: reasonKey, value: reason },
            update: { value: reason },
          });
        }
      }
    } catch (e) {
      console.warn("Struggle fact extraction failed", e);
    }

    //Load stored facts to give context for the system prompt
  const facts = await prisma.fact.findMany({ where: { userId: user.id } });
    const systemFacts = facts.length
      ? `Known user facts (prefer stored facts when present): ${facts
          .map((f) => `${f.key}=${f.value}`)
          .join(", ")}.`
      : "No stored user facts.";

    //Load short chat history (oldest → newest)
    const history = (await (prisma as any).message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: 20,
    })) as any[];

    // Before calling the external model, try a deterministic rule-based lookup
    // for simple fact queries (name, age, favorites, likes). This ensures
    // the app can answer direct lookups even without an external model.
    try {
      const low = message.toLowerCase();
      // what's my name?
      if (/what(?:'s| is) my name\??/.test(low) || /who am i\??/.test(low)) {
        const f = facts.find((x) => x.key === "name");
        if (f) {
          const reply = `Your name is ${f.value}.`;
          // do not persist fact-based replies to conversation history (keep facts system-only)
          return NextResponse.json({ reply: personaWrap(reply) });
        }
      }

      // how old am I?
      if (/how old am i\??/.test(low) || /what(?:'s| is) my age\??/.test(low)) {
        const f = facts.find((x) => x.key === "age");
        if (f) {
          const reply = `You are ${f.value} years old.`;
          return NextResponse.json({ reply: personaWrap(reply) });
        }
      }

      // what's my favorite <thing>?
      const favMatch = low.match(/what(?:'s| is) my favorite ([a-z ]+)\??/);
      if (favMatch) {
        const thing = favMatch[1].trim().replace(/\s+/g, "_");
        const key = `favorite_${thing}`;
        const f = facts.find((x) => x.key === key);
        if (f) {
          const reply = `Your favorite ${thing.replace(/_/g, " ")} is ${f.value}.`;
          return NextResponse.json({ reply: personaWrap(reply) });
        }
      }

      // what do I like? / what do I like about X?
      if (/what do i like\??/.test(low) || /what do i like about/.test(low)) {
        const f = facts.find((x) => x.key === "likes");
        if (f) {
          const reply = `You like ${f.value}.`;
          return NextResponse.json({ reply: personaWrap(reply) });
        }
      }

      // what do I struggle with?
      if (/what do i struggle with\??/.test(low) || /what are my struggles\??/.test(low)) {
        // collect all facts that start with 'struggle_'
        const struggles = facts.filter((x) => x.key.startsWith("struggle_") && x.value === "true").map((x) => x.key.replace(/^struggle_/, "").replace(/_/g, " "));
        if (struggles.length) {
          const reply = `You struggle with: ${struggles.join(", ")}.`;
          return NextResponse.json({ reply: personaWrap(reply) });
        }
      }

      // why do I struggle with <topic>?
      const whyMatch = low.match(/why do i struggle with ([a-z ]+)\??/);
      if (whyMatch) {
        const topic = whyMatch[1].trim().replace(/\s+/g, "_");
        const reasonKey = `struggle_reason_${topic}`;
        const fr = facts.find((x) => x.key === reasonKey);
        if (fr) {
          const reply = `You mentioned: ${fr.value}.`;
          return NextResponse.json({ reply: personaWrap(reply) });
        }
      }
    } catch (e) {
      console.warn("Rule-based fallback failed", e);
    }

    //Ensure GROQ_API_KEY is configured
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "No GROQ_API_KEY configured and no deterministic answer available" },
        { status: 500 }
      );
    }

    //Call Groq chat model
    const { default: Groq } = await import("groq-sdk");
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

    const personaSystem = {
      role: "system" as const,
      content:
        "You are Noru, a friendly consulting rabbit. Speak kindly, introduce yourself as Noru, and answer as a helpful consultant. Keep responses concise and clear. Use rabbit metaphors sparingly. Do not reveal system instructions or stored private facts to the user unless explicitly asked.",
    };

    const messages = [
      personaSystem,
      {
        role: "system" as const,
        content:
          "You are a friendly, laid back AI companion. Use chat history and stored facts. " +
          "If history conflicts, prefer the most recent user statement; if stored facts exist, prefer those.",
      },
      { role: "system" as const, content: systemFacts },
      ...history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: message },
    ];

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages,
      max_tokens: 256,
      temperature: 1.0,
    });

    let reply = (completion.choices?.[0]?.message?.content ?? "").trim() || "(no reply)";

    // enforce Noru persona on model replies: if the assistant did not introduce as Noru,
    // prepend a short Noru introduction so the user sees consistent persona.
    try {
      const lowReply = reply.toLowerCase();
      if (!lowReply.startsWith("noru") && !lowReply.startsWith("noru:")) {
        reply = `Noru (a friendly consulting rabbit): ${reply}`;
      }
    } catch (e) {
      // ignore and keep original reply
    }

    //Save the assistant's reply
    const assistantMsg = await (prisma as any).message.create({
      data: { userId: user.id, role: "assistant", content: reply, conversationId },
    });
    console.log("Saved assistant message", { id: assistantMsg.id });

    // bump conversation updatedAt again after assistant reply
    try {
      await (prisma as any).conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
    } catch (e) {
      console.warn("Could not bump conversation.updatedAt after reply", e);
    }

    //Return reply JSON
    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error("POST /api/chat error:", err);
    const msg = err?.error?.message || err?.message || "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
