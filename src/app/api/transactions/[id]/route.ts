import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, jsonError } from "@/lib/api";
import { transactionUpdate, toDbDate } from "@/lib/validations/transaction";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const userId = await getUserId();
  if (!userId) return jsonError("Belum login.", 401);
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = transactionUpdate.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0].message, 400);

  const owned = await prisma.transaction.findFirst({ where: { id, userId } });
  if (!owned) return jsonError("Transaksi tidak ditemukan.", 404);

  const { date, ...rest } = parsed.data;
  const updated = await prisma.transaction.update({
    where: { id },
    data: { ...rest, ...(date ? { date: toDbDate(date) } : {}) },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const userId = await getUserId();
  if (!userId) return jsonError("Belum login.", 401);
  const { id } = await params;

  const { count } = await prisma.transaction.deleteMany({ where: { id, userId } });
  if (count === 0) return jsonError("Transaksi tidak ditemukan.", 404);

  return new NextResponse(null, { status: 204 });
}