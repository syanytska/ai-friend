import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  try {
    const session = await getServerSession(authOptions as any);
    const userId = (session as any)?.user?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const facts = await (prisma as any).fact.findMany({ where: { userId } });
    return NextResponse.json(facts);
  } catch (err: any) {
    console.error("GET /api/debug/facts error:", err);
    return NextResponse.json({ error: "Could not read facts" }, { status: 500 });
  }
}
