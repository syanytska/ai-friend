// src/lib/auth.ts
import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

const COOKIE = "af_uid";

export async function getOrCreateUserId() {
  // Some Next versions type this as Promise<ReadonlyRequestCookies>
  const jar = await cookies(); // ← add await
  const existing = jar.get(COOKIE)?.value ?? null;

  if (existing) {
    const found = await prisma.user.findUnique({ where: { id: existing } });
    if (found) return { id: existing, needsCookie: false };
  }
  // Create a new user. The schema provides defaults for id/createdAt/updatedAt,
  // but TypeScript may complain about an empty object for the generated create type.
  // Cast to `any` as a minimal, low-risk workaround to satisfy the compiler.
  const user = await prisma.user.create({ data: {} as any });
  return { id: user.id, needsCookie: true };
}
