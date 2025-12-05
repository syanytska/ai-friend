import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any);
    const userId = (session as any)?.user?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const facts = await prisma.fact.findMany({ where: { userId } });
    // return only UI-related keys
    const settings: Record<string, string> = {};
    for (const f of facts) settings[f.key] = f.value;
    return NextResponse.json({ settings });
  } catch (err: any) {
    console.error("GET /api/user/settings error", err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any);
    const userId = (session as any)?.user?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { key, value } = await req.json();
    if (!key) return NextResponse.json({ error: "Key required" }, { status: 400 });

    const up = await prisma.fact.upsert({
      where: { userId_key: { userId, key } },
      create: { userId, key, value: value ?? "" },
      update: { value: value ?? "" },
    });

    return NextResponse.json({ ok: true, setting: up });
  } catch (err: any) {
    console.error("POST /api/user/settings error", err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
