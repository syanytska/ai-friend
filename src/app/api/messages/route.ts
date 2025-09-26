import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const userId = "guest";
  const messages = await prisma.message.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  return NextResponse.json(messages);
}
