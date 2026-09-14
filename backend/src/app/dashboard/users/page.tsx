import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { redirect } from "next/navigation";
import UsersTable from "@/components/dashboard/UsersTable";

export default async function UsersPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  const payload = token ? verifyToken(token) : null;

  if (!payload) redirect("/login");
  if (payload.role !== "admin") redirect("/dashboard");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>
        <p className="text-gray-400 text-sm mt-1">
          Admin-only. Users are scoped to tenant <span className="font-mono text-gray-300">{payload.tenant}</span> —
          other tenants are never visible here.
        </p>
      </div>
      <UsersTable />
    </div>
  );
}
