"use client";

import { useState } from "react";
import { toast } from "sonner";
import { authFetch } from "@/hooks/useAuthFetch";

interface AddUserFormProps {
  tenant: string;
  onCreated: () => void;
  onCancel: () => void;
}

const inputClass =
  "w-full p-2 bg-zinc-900 text-white text-sm rounded-md border border-zinc-700 focus:border-blue-500 focus:outline-none";

export default function AddUserForm({ tenant, onCreated, onCancel }: AddUserFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "viewer">("viewer");
  const [submitting, setSubmitting] = useState(false);

  const email = `${username}@${tenant}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await authFetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create user");
        return;
      }
      toast.success(`User ${email} created`);
      setUsername("");
      setPassword("");
      setRole("viewer");
      onCreated();
    } catch {
      toast.error("Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-zinc-900/60 border border-zinc-700 rounded-lg p-4 mb-4">
      <h4 className="text-sm font-medium text-white mb-3">Add User</h4>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Username</label>
          <div className="flex items-center">
            <input
              type="text"
              required
              pattern="[^\s@]+"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="jdoe"
              className={`${inputClass} rounded-r-none`}
            />
            <span className="p-2 bg-zinc-800 text-sm text-gray-400 border border-l-0 border-zinc-700 rounded-r-md whitespace-nowrap">
              @{tenant}
            </span>
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Password</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="min. 8 characters"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value as "admin" | "viewer")} className={inputClass}>
            <option value="viewer">viewer</option>
            <option value="admin">admin</option>
          </select>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Create User"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-1.5 bg-zinc-700 text-white text-sm rounded-md hover:bg-zinc-600"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
