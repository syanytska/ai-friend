import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

const COOKIE = "af_uid";

export async function getOrCreateUserId() {
  const jar = cookies();                          // no await
  let id = jar.get(COOKIE)?.value ?? null;

  const exists = id ? await prisma.user.findUnique({ where: { id } }) : null;

  if (!id || !exists) {
    const user = await prisma.user.create({ data: {} });
    id = user.id;

    jar.set(COOKIE, id);                          // simple set
  }

  return id!;
}
