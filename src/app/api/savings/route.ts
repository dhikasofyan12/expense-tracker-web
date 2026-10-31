import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserId, jsonError } from "@/lib/api";

const query = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
});

export async function GET(req: Request) {
  const userId = await getUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const parsed = query.safeParse({
    month: new URL(req.url).searchParams.get("month"),
  });
  if (!parsed.success) return jsonError("Parameter month harus YYYY-MM", 400);

  const [y, m] = parsed.data.month.split("-").map(Number);
  const at = (offset: number) => new Date(Date.UTC(y, m - 1 + offset, 1));

  const [current, previous, allTime] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["type"],
      where: { userId, date: { gte: at(0), lt: at(1) } },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["date"],
      where: {
        userId,
        type: "EXPENSE",
        date: { gte: at(-3), lt: at(0) },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["type"],
      where: { userId },
      _sum: { amount: true },
    }),
  ]);

  const pick = (rows: typeof current, t: "INCOME" | "EXPENSE") =>
    Number(rows.find((r) => r.type === t)?._sum.amount ?? 0);

  const income = pick(current, "INCOME");
  const expense = pick(current, "EXPENSE");

  const perMonth = new Map<string, number>();
  for (const r of previous) {
    const key = `${r.date.getUTCFullYear()}-${r.date.getUTCMonth()}`;
    perMonth.set(key, (perMonth.get(key) ?? 0) + Number(r._sum.amount ?? 0));
  }
  const monthsWithData = [...perMonth.values()].filter((v) => v > 0);

  let avgExpense = 0;
  let monthsUsed = 0;
  let basis: "previous" | "current" | "none" = "none";
  if (monthsWithData.length > 0) {
    avgExpense = Math.round(
      monthsWithData.reduce((s, v) => s + v, 0) / monthsWithData.length
    );
    monthsUsed = monthsWithData.length;
    basis = "previous";
  } else if (expense > 0) {
    avgExpense = expense;
    monthsUsed = 1;
    basis = "current";
  }

  return Response.json({
    month: parsed.data.month,
    income,
    expense,
    avgExpense,
    monthsUsed,
    basis,
    saved: pick(allTime, "INCOME") - pick(allTime, "EXPENSE"),
  });
}