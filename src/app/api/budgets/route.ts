import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth"; // <- sesuaikan: instance Better Auth kamu
import { prisma } from "@/lib/prisma"; // <- sesuaikan: PrismaClient kamu

const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Format bulan harus YYYY-MM");

const putSchema = z.object({
  month: monthSchema,
  items: z
    .array(
      z.object({
        category: z.string().trim().min(1, "Kategori wajib diisi").max(40),
        limit: z.number().int("Batas harus bilangan bulat").min(0).max(1_000_000_000_000),
      }),
    )
    .min(1)
    .max(30),
});

async function currentUserId(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  return session?.user.id ?? null;
}

export async function GET(req: NextRequest) {
  const userId = await currentUserId(req);
  if (!userId) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  const month = monthSchema.safeParse(req.nextUrl.searchParams.get("month"));
  if (!month.success) {
    return NextResponse.json({ error: month.error.issues[0]?.message ?? "Parameter month tidak valid" }, { status: 400 });
  }

  const rows = await prisma.budget.findMany({
    where: { userId, month: month.data },
    orderBy: { category: "asc" },
    select: { category: true, limit: true },
  });
  return NextResponse.json({ data: rows.map((r: { category: string; limit: unknown }) => ({ category: r.category, limit: Number(r.limit) })) });
}

/** Upsert massal. limit = 0 berarti hapus anggaran kategori itu. */
export async function PUT(req: NextRequest) {
  const userId = await currentUserId(req);
  if (!userId) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body harus berupa JSON" }, { status: 400 });
  }
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid" }, { status: 400 });
  }

  const { month, items } = parsed.data;
  await prisma.$transaction(
    items.map(({ category, limit }) =>
      limit === 0
        ? prisma.budget.deleteMany({ where: { userId, month, category } })
        : prisma.budget.upsert({
            where: { userId_category_month: { userId, category, month } },
            update: { limit },
            create: { userId, category, month, limit },
          }),
    ),
  );
  return NextResponse.json({ ok: true });
}