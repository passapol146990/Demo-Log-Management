"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("username");
    router.push("/login");
    router.refresh();
  };

  return (
    <button onClick={handleLogout} className="text-red-400 hover:text-red-300 text-sm">
      Logout
    </button>
  );
}
