import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET() {
  try {
    const session = await getServerSession(authOptions as any);
    const userId = (session as any)?.user?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const convs = await (prisma as any).conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });

    return NextResponse.json(convs);
  } catch (err: any) {
    console.error("GET /api/conversations error:", err);
    return NextResponse.json({ error: "Could not load conversations" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions as any);
    const userId = (session as any)?.user?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const title = (body?.title as string) || "New conversation";

    const conv = await (prisma as any).conversation.create({
      data: { title, userId },
    });

    // Do not write facts into the conversation history automatically. Facts are
    // kept as system-side data and will be included in model calls as system
    // messages when generating replies. This prevents facts from being shown
    // in the chat unless explicitly returned by the model or requested by the user.

    return NextResponse.json(conv, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/conversations error:", err);
    return NextResponse.json({ error: "Could not create conversation" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions as any);
    const userId = (session as any)?.user?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const conversationId = body?.conversationId as string | undefined;
    const title = body?.title as string | undefined;
    if (!conversationId || !title) return NextResponse.json({ error: "conversationId and title are required" }, { status: 400 });

    // verify ownership
    const conv = await (prisma as any).conversation.findUnique({ where: { id: conversationId } });
    if (!conv || conv.userId !== userId) return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });

    const updated = await (prisma as any).conversation.update({ where: { id: conversationId }, data: { title } });
    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("PATCH /api/conversations error:", err);
    return NextResponse.json({ error: "Could not update conversation" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions as any);
    const userId = (session as any)?.user?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const conversationId = body?.conversationId as string | undefined;
    if (!conversationId) return NextResponse.json({ error: "conversationId is required" }, { status: 400 });

    const conv = await (prisma as any).conversation.findUnique({ where: { id: conversationId } });
    if (!conv || conv.userId !== userId) return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });

    // delete messages first to avoid FK issues, then delete conversation
    await (prisma as any).message.deleteMany({ where: { conversationId } });
    await (prisma as any).conversation.delete({ where: { id: conversationId } });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE /api/conversations error:", err);
    return NextResponse.json({ error: "Could not delete conversation" }, { status: 500 });
  }
}
