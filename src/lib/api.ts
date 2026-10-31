import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function getUserId() {
  const session = await getSession();
  return session?.user.id ?? null;
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}