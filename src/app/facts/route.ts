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
