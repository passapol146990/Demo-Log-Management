import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  const payload = token ? verifyToken(token) : null;

  if (!payload) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-zinc-900">
      <aside className="w-64 bg-zinc-800 p-4 text-white">
        <h2 className="text-xl font-bold mb-6">Log Management</h2>
        <nav className="space-y-2">
          <a href="/dashboard" className="block p-2 rounded hover:bg-zinc-700">Dashboard</a>
          <a href="/dashboard/search" className="block p-2 rounded hover:bg-zinc-700">Log Search</a>
          <a href="/dashboard/alerts" className="block p-2 rounded hover:bg-zinc-700">Alerts</a>
        </nav>
        <div className="absolute bottom-4 w-64 p-4">
          <p className="text-gray-400 text-sm">{payload.role} / {payload.tenant}</p>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="mt-2 text-red-400 hover:text-red-300 text-sm">Logout</button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-8 text-white">{children}</main>
    </div>
  );
}
