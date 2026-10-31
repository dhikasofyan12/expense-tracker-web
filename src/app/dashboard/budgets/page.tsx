import type { Metadata } from "next";
import BudgetsManager from "./BudgetsManager";

export const metadata: Metadata = { title: "Anggaran" };

export default function BudgetsPage() {
  return <BudgetsManager />;
}