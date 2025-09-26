import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Ensure a user exists (guest for now)
    const guest = await prisma.user.upsert({
      where: { id: "guest" },
      update: {},
      create: { id: "guest", displayName: "Guest" },
    });

    // ✅ Save USER message WITH userId
    await prisma.message.create({
      data: { userId: guest.id, role: "user", content: message },
    });

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: "No GROQ_API_KEY configured" }, { status: 500 });
    }

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

    // ✅ Save AI reply WITH userId
    await prisma.message.create({
      data: { userId: guest.id, role: "assistant", content: reply },
    });

    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error("Chat route error:", err?.message || err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
