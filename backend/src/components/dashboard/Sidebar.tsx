"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TokenPayload } from "@/lib/auth";
import LogoutButton from "@/components/dashboard/LogoutButton";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/search", label: "Log Search" },
  { href: "/dashboard/alerts", label: "Alerts" },
];

const ADMIN_NAV_ITEMS = [
  { href: "/dashboard/users", label: "User Management" },
  { href: "/dashboard/alert-rules", label: "Alert Rules" },
];

export default function Sidebar({ user }: { user: TokenPayload }) {
  const [username] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("username") ?? user.sub : user.sub
  );
  const pathname = usePathname();

  const navClass = (href: string) =>
    `block p-2 rounded transition-colors ${
      pathname === href ? "bg-zinc-700 text-white" : "hover:bg-zinc-700 text-gray-300"
    }`;

  return (
    <aside className="w-64 h-full shrink-0 bg-zinc-800 p-4 text-white flex flex-col">
      <h2 className="text-xl font-bold mb-6">Log Management</h2>
      <nav className="space-y-2 flex-1">
        {NAV_ITEMS.map((item) => (
          <Link key={item.href} href={item.href} prefetch className={navClass(item.href)}>
            {item.label}
          </Link>
        ))}
        {user.role === "admin" && (
          <>
            <p className="pt-4 pb-1 px-2 text-xs uppercase tracking-wide text-gray-500">Admin</p>
            {ADMIN_NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} prefetch className={navClass(item.href)}>
                {item.label}
              </Link>
            ))}
          </>
        )}
      </nav>
      <div className="p-2 border-t border-zinc-700 pt-4">
        <p className="text-white text-sm font-medium truncate">{username}</p>
        <p className="text-gray-400 text-sm mb-2">
          {user.role} / {user.tenant}
        </p>
        <LogoutButton />
      </div>
    </aside>
  );
}
