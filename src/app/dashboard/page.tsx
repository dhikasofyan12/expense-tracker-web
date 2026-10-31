import { getSession } from "@/lib/session";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const session = await getSession();
  const name = session?.user.name || "teman";

  return (
    <>
      <h1 style={{ margin: 0 }}>What&apos;s Good, {name}</h1>
      <DashboardClient />
    </>
  );
}