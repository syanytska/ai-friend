import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions as any);
    const userId = (session as any)?.user?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const title = (body?.title as string) || "Imported conversation";
    const messages = (body?.messages as Array<any>) || [];

    // Create conversation
    const conv = await (prisma as any).conversation.create({
      data: { title, userId },
    });

    // Insert messages for the conversation
    for (const m of messages) {
      await (prisma as any).message.create({
        data: {
          userId,
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
          conversationId: conv.id,
          // createdAt can be set if provided
          createdAt: m.createdAt ? new Date(m.createdAt) : undefined,
        },
      });
    }

    return NextResponse.json(conv, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/transfer-local error:", err);
    return NextResponse.json({ error: "Could not import local conversation" }, { status: 500 });
  }
}
