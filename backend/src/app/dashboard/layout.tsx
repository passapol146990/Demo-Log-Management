import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ReactNode } from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import { AlertsProvider } from "@/contexts/AlertsContext";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  const payload = token ? verifyToken(token) : null;

  if (!payload) {
    redirect("/login");
  }

  return (
    <AlertsProvider>
      <div className="flex h-screen bg-zinc-900">
        <Sidebar user={payload} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Topbar />
          <main className="flex-1 p-8 text-white overflow-y-auto overflow-x-auto">{children}</main>
        </div>
      </div>
    </AlertsProvider>
  );
}
