import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserId, jsonError } from "@/lib/api";

const query = z.object({
  year: z.string().regex(/^20\d{2}$/),
});

export async function GET(req: Request) {
  const userId = await getUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const parsed = query.safeParse({
    year: new URL(req.url).searchParams.get("year"),
  });
  if (!parsed.success) return jsonError("Parameter year harus YYYY", 400);

  const y = Number(parsed.data.year);
  const range = {
    gte: new Date(Date.UTC(y, 0, 1)),
    lt: new Date(Date.UTC(y + 1, 0, 1)),
  };

  const [days, allTime, bounds] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["date", "type"],
      where: { userId, date: range },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["type"],
      where: { userId },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.transaction.aggregate({
      where: { userId },
      _min: { date: true },
      _max: { date: true },
    }),
  ]);

  const months = Array.from({ length: 12 }, (_, i) => ({
    month: `${y}-${String(i + 1).padStart(2, "0")}`,
    income: 0,
    expense: 0,
  }));

  for (const r of days) {
    const idx = r.date.getUTCMonth();
    const amount = Number(r._sum.amount ?? 0);
    if (r.type === "INCOME") months[idx].income += amount;
    else months[idx].expense += amount;
  }

  const pick = (t: "INCOME" | "EXPENSE") =>
    Number(allTime.find((r) => r.type === t)?._sum.amount ?? 0);
  const allIncome = pick("INCOME");
  const allExpense = pick("EXPENSE");

  return Response.json({
    year: y,
    months,
    yearIncome: months.reduce((s, m) => s + m.income, 0),
    yearExpense: months.reduce((s, m) => s + m.expense, 0),
    allTime: {
      income: allIncome,
      expense: allExpense,
      balance: allIncome - allExpense,
      count: allTime.reduce((s, r) => s + r._count._all, 0),
    },
    firstYear: bounds._min.date ? bounds._min.date.getUTCFullYear() : null,
    lastYear: bounds._max.date ? bounds._max.date.getUTCFullYear() : null,
  });
}