// src/app/api/messages/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const userId = "guest";

    const messages = await prisma.message.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      take: 200, // adjust as needed
    });

    return NextResponse.json(messages);
  } catch (err: any) {
    console.error("Error fetching messages:", err);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
