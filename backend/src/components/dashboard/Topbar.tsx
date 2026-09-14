"use client";

import AlertBell from "@/components/dashboard/AlertBell";

export default function Topbar() {
  return (
    <header className="h-14 shrink-0 flex items-center justify-end px-6 border-b border-zinc-800 bg-zinc-900">
      <AlertBell />
    </header>
  );
}
