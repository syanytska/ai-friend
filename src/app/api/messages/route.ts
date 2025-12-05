// src/app/api/messages/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any);
    const userId = (session as any)?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conversationId = req.nextUrl.searchParams.get("conversationId");
    if (!conversationId) {
      return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
    }

    // Verify conversation belongs to user
  const conv = await (prisma as any).conversation.findUnique({ where: { id: conversationId } });
    if (!conv || conv.userId !== userId) {
      return NextResponse.json({ error: "Conversation not found or unauthorized" }, { status: 404 });
    }

    const messages = await (prisma as any).message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: 500,
    });

    console.log("GET /api/messages", { userId, conversationId, count: messages.length });

    return NextResponse.json(messages);
  } catch (err: any) {
    console.error("Error fetching messages:", err);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
