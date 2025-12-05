import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }
  try {
    const accounts = await (prisma as any).account.findMany({ include: { user: true } });
    return NextResponse.json(accounts);
  } catch (err: any) {
    console.error("GET /api/debug/accounts error:", err);
    return NextResponse.json({ error: "Could not read accounts" }, { status: 500 });
  }
}
