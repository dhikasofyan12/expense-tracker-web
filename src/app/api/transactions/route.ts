import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, jsonError } from "@/lib/api";
import { listQuery, transactionInput, toDbDate } from "@/lib/validations/transaction";

export async function GET(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) return jsonError("Belum login.", 401);

  const parsed = listQuery.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  );
  if (!parsed.success) return jsonError(parsed.error.issues[0].message, 400);
  const { month, type, page, limit } = parsed.data;

  const where: Record<string, unknown> = { userId };
  if (type) where.type = type;
  if (month) {
    const [y, m] = month.split("-").map(Number);
    where.date = {
      gte: new Date(Date.UTC(y, m - 1, 1)),
      lt: new Date(Date.UTC(y, m, 1)),
    };
  }

  const [data, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.transaction.count({ where }),
  ]);

  return NextResponse.json({ data, meta: { page, limit, total } });
}

export async function POST(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) return jsonError("Belum login.", 401);

  const body = await request.json().catch(() => null);
  const parsed = transactionInput.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0].message, 400);

  const { date, ...rest } = parsed.data;
  const created = await prisma.transaction.create({
    data: { ...rest, date: toDbDate(date), userId },
  });

  return NextResponse.json(created, { status: 201 });
}