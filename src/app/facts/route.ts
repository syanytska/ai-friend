// src/app/api/facts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET  -> list all facts for the demo user
export async function GET() {
  try {
    const facts = await prisma.fact.findMany({
      where: { userId: "guest" },
      orderBy: { key: "asc" },
    });
    return NextResponse.json(facts);
  } catch (e: any) {
    console.error("/api/facts GET error:", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

// OPTIONAL helpers (uncomment if you want to set/clear facts via API)

/*
// POST -> upsert a fact { key, value }
export async function POST(req: NextRequest) {
  try {
    const { key, value } = await req.json();
    if (!key || typeof value !== "string") {
      return NextResponse.json({ error: "key and value are required" }, { status: 400 });
    }
    const fact = await prisma.fact.upsert({
      where: { userId_key: { userId: "guest", key } },
      create: { userId: "guest", key, value },
      update: { value },
    });
    return NextResponse.json(fact);
  } catch (e: any) {
    console.error("/api/facts POST error:", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

// DELETE -> delete one fact by key (?key=name)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    if (!key) return NextResponse.json({ error: "key is required" }, { status: 400 });

    await prisma.fact.deleteMany({ where: { userId: "guest", key } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("/api/facts DELETE error:", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
*/
