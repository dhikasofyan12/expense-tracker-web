import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserId, jsonError } from "@/lib/api";

const query = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
});

const monthFmt = new Intl.DateTimeFormat("id-ID", {
  month: "short",
  timeZone: "UTC",
});

export async function GET(req: Request) {
  const userId = await getUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const parsed = query.safeParse({
    month: new URL(req.url).searchParams.get("month"),
  });
  if (!parsed.success) return jsonError("Parameter month harus YYYY-MM", 400);

  const [y, m] = parsed.data.month.split("-").map(Number);
  const monthStart = (offset: number) =>
    new Date(Date.UTC(y, m - 1 + offset, 1));
  const range = { gte: monthStart(0), lt: monthStart(1) };

  const trendMonths = [-5, -4, -3, -2, -1, 0].map((o) => ({
    start: monthStart(o),
    end: monthStart(o + 1),
  }));

  const [byType, byCategory, recent, trend] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["type"],
      where: { userId, date: range },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["category"],
      where: { userId, date: range, type: "EXPENSE" },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 5,
    }),
    prisma.transaction.findMany({
      where: { userId, date: range, type: "EXPENSE" },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 5,
      select: {
        id: true,
        category: true,
        description: true,
        date: true,
        amount: true,
      },
    }),
    Promise.all(
      trendMonths.map(async ({ start, end }) => {
        const rows = await prisma.transaction.groupBy({
          by: ["type"],
          where: { userId, date: { gte: start, lt: end } },
          _sum: { amount: true },
        });
        const pick = (t: "INCOME" | "EXPENSE") =>
          Number(rows.find((r) => r.type === t)?._sum.amount ?? 0);
        return {
          month: `${start.getUTCFullYear()}-${String(
            start.getUTCMonth() + 1
          ).padStart(2, "0")}`,
          label: monthFmt.format(start),
          income: pick("INCOME"),
          expense: pick("EXPENSE"),
        };
      })
    ),
  ]);

  const sumOf = (t: "INCOME" | "EXPENSE") =>
    Number(byType.find((r) => r.type === t)?._sum.amount ?? 0);

  const income = sumOf("INCOME");
  const expense = sumOf("EXPENSE");

  return Response.json({
    month: parsed.data.month,
    income,
    expense,
    balance: income - expense,
    topCategories: byCategory.map((r) => ({
      category: r.category,
      total: Number(r._sum.amount ?? 0),
    })),
    recentExpenses: recent.map((r) => ({
      id: r.id,
      category: r.category,
      description: r.description,
      date: r.date.toISOString(),
      amount: Number(r.amount),
    })),
    trend,
  });
}