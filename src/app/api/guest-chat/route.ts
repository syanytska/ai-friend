import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = body?.message;
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // If server has GROQ_API_KEY, call the model; otherwise return a canned reply.
    if (!process.env.GROQ_API_KEY) {
      const reply = "(local-only) I can't talk to the model here — set GROQ_API_KEY to enable hosted replies.";
      return NextResponse.json({ reply });
    }

    const { default: Groq } = await import("groq-sdk");
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

    const messages = [
      { role: "system" as const, content: "You are a helpful assistant answering a single-turn question for a guest user." },
      { role: "user" as const, content: message },
    ];

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages,
      max_tokens: 256,
      temperature: 1.0,
    });

    const reply = (completion.choices?.[0]?.message?.content ?? "").trim() || "(no reply)";
    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error("POST /api/guest-chat error:", err);
    return NextResponse.json({ error: "Could not generate reply" }, { status: 500 });
  }
}
