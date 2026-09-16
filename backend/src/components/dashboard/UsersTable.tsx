"use client";

import { Fragment, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus, KeyRound, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { authFetch } from "@/hooks/useAuthFetch";
import AddUserForm from "@/components/dashboard/AddUserForm";

interface SafeUser {
  email: string;
  role: "admin" | "viewer";
  tenant: string;
}

function roleBadgeClass(role: string): string {
  return role === "admin"
    ? "bg-blue-500/15 text-blue-400 ring-1 ring-inset ring-blue-500/30"
    : "bg-zinc-600/40 text-gray-300 ring-1 ring-inset ring-zinc-500/30";
}

async function fetchUsersList(): Promise<{ users: SafeUser[]; tenant: string }> {
  const res = await authFetch("/api/users");
  const data = await res.json();
  return { users: data.users || [], tenant: data.tenant || "" };
}

async function fetchCurrentEmail(): Promise<string> {
  const res = await authFetch("/api/auth/me");
  const data = await res.json();
  return data.user?.sub || "";
}

export default function UsersTable() {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [resetTarget, setResetTarget] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [busyEmail, setBusyEmail] = useState<string | null>(null);

  const { data, isLoading: loading } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsersList,
  });
  const users = data?.users ?? [];
  const tenant = data?.tenant ?? "";

  const { data: currentEmail = "" } = useQuery({
    queryKey: ["auth", "me", "email"],
    queryFn: fetchCurrentEmail,
    staleTime: Infinity,
    refetchInterval: false,
  });

  const fetchUsers = () => queryClient.invalidateQueries({ queryKey: ["users"] });

  const handleRoleChange = async (email: string, role: "admin" | "viewer") => {
    setBusyEmail(email);
    try {
      const res = await authFetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update role");
        return;
      }
      toast.success(`${email} is now ${role}`);
      fetchUsers();
    } catch {
      toast.error("Failed to update role");
    } finally {
      setBusyEmail(null);
    }
  };

  const handleResetPassword = async (email: string) => {
    if (resetPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setBusyEmail(email);
    try {
      const res = await authFetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: resetPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to reset password");
        return;
      }
      toast.success(`Password reset for ${email}`);
      setResetTarget(null);
      setResetPassword("");
    } catch {
      toast.error("Failed to reset password");
    } finally {
      setBusyEmail(null);
    }
  };

  const handleDelete = async (email: string) => {
    setBusyEmail(email);
    try {
      const res = await authFetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to delete user");
        return;
      }
      toast.success(`${email} deleted`);
      setDeleteTarget(null);
      fetchUsers();
    } catch {
      toast.error("Failed to delete user");
    } finally {
      setBusyEmail(null);
    }
  };

  if (loading) {
    return (
      <div className="p-16 flex justify-center">
        <div className="w-6 h-6 border-2 border-zinc-600 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-400 text-sm">
          Users in tenant <span className="font-mono text-gray-300">{tenant}</span>
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">{users.length} user(s)</span>
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add User
            </button>
          )}
        </div>
      </div>

      {showAddForm && (
        <AddUserForm
          tenant={tenant}
          onCreated={() => {
            setShowAddForm(false);
            fetchUsers();
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 text-xs uppercase tracking-wide border-b border-zinc-700">
            <th className="text-left p-2 font-medium">Email</th>
            <th className="text-left p-2 font-medium">Role</th>
            <th className="text-right p-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <Fragment key={u.email}>
              <tr className="border-t border-zinc-800">
                <td className="p-2 text-gray-200">
                  {u.email}
                  {u.email === currentEmail && <span className="ml-2 text-xs text-gray-500">(you)</span>}
                </td>
                <td className="p-2">
                  <select
                    value={u.role}
                    disabled={busyEmail === u.email}
                    onChange={(e) => handleRoleChange(u.email, e.target.value as "admin" | "viewer")}
                    className={`px-2 py-1 rounded text-xs font-semibold border-none bg-transparent cursor-pointer disabled:opacity-50 ${roleBadgeClass(u.role)}`}
                  >
                    <option value="admin" className="bg-zinc-800 text-white">
                      admin
                    </option>
                    <option value="viewer" className="bg-zinc-800 text-white">
                      viewer
                    </option>
                  </select>
                </td>
                <td className="p-2">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => {
                        setResetTarget(resetTarget === u.email ? null : u.email);
                        setResetPassword("");
                      }}
                      title="Reset password"
                      className="p-1.5 rounded hover:bg-zinc-700 text-gray-400 hover:text-white"
                    >
                      <KeyRound className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(deleteTarget === u.email ? null : u.email)}
                      title="Delete user"
                      disabled={u.email === currentEmail}
                      className="p-1.5 rounded hover:bg-red-500/10 text-gray-400 hover:text-red-400 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
              {resetTarget === u.email && (
                <tr className="bg-zinc-900/60 border-t border-zinc-800">
                  <td colSpan={3} className="p-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        autoFocus
                        placeholder="New password (min. 8 characters)"
                        value={resetPassword}
                        onChange={(e) => setResetPassword(e.target.value)}
                        className="flex-1 max-w-xs p-1.5 bg-zinc-900 text-white text-sm rounded-md border border-zinc-700 focus:border-blue-500 focus:outline-none"
                      />
                      <button
                        onClick={() => handleResetPassword(u.email)}
                        disabled={busyEmail === u.email}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Save
                      </button>
                      <button
                        onClick={() => setResetTarget(null)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-zinc-700 text-white text-xs rounded-md hover:bg-zinc-600"
                      >
                        <X className="w-3.5 h-3.5" />
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              {deleteTarget === u.email && (
                <tr className="bg-red-500/5 border-t border-zinc-800">
                  <td colSpan={3} className="p-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-red-300">Delete {u.email}? This cannot be undone.</span>
                      <button
                        onClick={() => handleDelete(u.email)}
                        disabled={busyEmail === u.email}
                        className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700 disabled:opacity-50"
                      >
                        {busyEmail === u.email ? "Deleting..." : "Confirm Delete"}
                      </button>
                      <button
                        onClick={() => setDeleteTarget(null)}
                        className="px-3 py-1.5 bg-zinc-700 text-white text-xs rounded-md hover:bg-zinc-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
