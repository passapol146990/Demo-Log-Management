"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { useAlerts } from "@/contexts/AlertsContext";

export default function AlertBell() {
  const { unreadCount, isLive, markAllRead } = useAlerts();
  const [pulse, setPulse] = useState(false);
  const router = useRouter();

  const handleClick = () => {
    markAllRead();
    setPulse(true);
    setTimeout(() => setPulse(false), 300);
    router.push("/dashboard/alerts");
  };

  return (
    <button
      onClick={handleClick}
      className={`relative p-2 rounded-full hover:bg-zinc-700 transition-transform ${pulse ? "scale-90" : "scale-100"}`}
      title={isLive ? "Live alerts" : "Reconnecting..."}
    >
      <Bell className="w-5 h-5 text-gray-300" />
      <span
        className={`absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full ${isLive ? "bg-green-500" : "bg-gray-500"}`}
      />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-bold animate-pulse">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}
