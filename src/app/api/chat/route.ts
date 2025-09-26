import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Save user message
    await prisma.message.create({
      data: { role: "user", content: message },
    });

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "No GROQ_API_KEY configured in .env.local" },
        { status: 500 }
      );
    }

    // Talk to Groq
    const { default: Groq } = await import("groq-sdk");
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: "You are a friendly, concise AI companion." },
        { role: "user", content: message },
      ],
    });

    const reply = completion.choices[0]?.message?.content ?? "(no reply)";

    // Save assistant reply
    await prisma.message.create({
      data: { role: "assistant", content: reply },
    });

    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error("Chat route error:", err?.message || err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
