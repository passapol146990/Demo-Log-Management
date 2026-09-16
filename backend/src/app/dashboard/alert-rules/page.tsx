import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { redirect } from "next/navigation";
import AlertRulesManager from "@/components/dashboard/AlertRulesManager";

export default async function AlertRulesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  const payload = token ? verifyToken(token) : null;

  if (!payload) redirect("/login");
  if (payload.role !== "admin") redirect("/dashboard");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Alert Rules</h1>
        <p className="text-gray-400 text-sm mt-1">
          Define conditions that trigger alerts. The worker evaluates enabled rules every 10s.
        </p>
      </div>
      <AlertRulesManager />
    </div>
  );
}
