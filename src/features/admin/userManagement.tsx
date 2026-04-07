"use client";

import { useState, useEffect } from "react";
import { UserPlus, Trash2, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { listUsers, createUser, deleteUser } from "@/services/userService";
import type { User } from "@/types/auth";

const ROLE_OPTIONS = ["Admin", "SME"];

export default function UserManagement() {
  const { isUserSME, user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createGmail, setCreateGmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createUsername, setCreateUsername] = useState("");
  const [createRole, setCreateRole] = useState("Admin");
  const [createLoading, setCreateLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const fetchUsers = async () => {
    try {
      setError(null);
      const data = await listUsers();
      setUsers(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isUserSME) return;
    fetchUsers();
  }, [isUserSME]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createGmail.trim() || !createPassword.trim() || !createUsername.trim()) {
      setError("Gmail, password and username are required");
      return;
    }
    setCreateLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await createUser({
        gmail: createGmail.trim(),
        password: createPassword,
        username: createUsername.trim(),
        role: createRole,
      });
      setSuccessMessage("User created successfully");
      setCreateGmail("");
      setCreatePassword("");
      setCreateUsername("");
      setCreateRole("SME");
      setShowCreateForm(false);
      await fetchUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create user");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleRemoveUser = async (target: User) => {
    if (target.id === currentUser?.id) return;
    if (target.role === currentUser?.role) return; // Same role: no remove
    setActionLoadingId(target.id);
    setError(null);
    try {
      await deleteUser(target.id);
      setSuccessMessage(`User "${target.username}" removed`);
      await fetchUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove user");
    } finally {
      setActionLoadingId(null);
    }
  };

  if (!isUserSME) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
          <p className="font-medium">Access restricted</p>
          <p className="text-sm mt-1">Only SME role can access User Management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1D2229]">User Management</h1>
        <button
          type="button"
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-[#085C9C] text-white rounded-lg hover:bg-[#074a82] transition-colors"
        >
          <UserPlus size={18} />
          Create user
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 text-sm">
          <AlertCircle size={18} />
          {error}
        </div>
      )}
      {successMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-green-800 text-sm">
          {successMessage}
        </div>
      )}

      {/* Create user form */}
      {showCreateForm && (
        <form onSubmit={handleCreateUser} className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
          <h2 className="text-lg font-semibold text-[#1D2229]">Create user account</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gmail</label>
              <input
                type="email"
                value={createGmail}
                onChange={(e) => setCreateGmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#085C9C] focus:border-[#085C9C] text-gray-900"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#085C9C] focus:border-[#085C9C] text-gray-900"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={createUsername}
                onChange={(e) => setCreateUsername(e.target.value)}
                placeholder="Display name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#085C9C] focus:border-[#085C9C] text-gray-900"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={createRole}
                onChange={(e) => setCreateRole(e.target.value)}
                className="cursor-pointer w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#085C9C] focus:border-[#085C9C] text-gray-900 bg-white"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={createLoading}
              className="px-4 py-2 bg-[#085C9C] text-white rounded-lg hover:bg-[#074a82] disabled:opacity-50"
            >
              {createLoading ? "Creating..." : "Create user"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* User list */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <h2 className="px-4 py-3 font-semibold text-[#1D2229] border-b border-gray-200">All users</h2>
        {loading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#085C9C]" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-2 text-xs font-semibold text-gray-600 uppercase">Username</th>
                  <th className="px-4 py-2 text-xs font-semibold text-gray-600 uppercase">Gmail</th>
                  <th className="px-4 py-2 text-xs font-semibold text-gray-600 uppercase">Role</th>
                  <th className="px-4 py-2 text-xs font-semibold text-gray-600 uppercase w-28">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="px-4 py-2 text-gray-900">{u.username}</td>
                    <td className="px-4 py-2 text-gray-600">{u.gmail}</td>
                    <td className="px-4 py-2">
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-[#273C8F]/10 text-[#273C8F]">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {u.id === currentUser?.id ? (
                        <span className="text-xs text-gray-400">(you)</span>
                      ) : u.role === currentUser?.role ? (
                        <span
                          className="text-xs text-gray-400 cursor-default"
                          title="Your role cannot remove this account."
                        >
                          —
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRemoveUser(u)}
                          disabled={actionLoadingId === u.id}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                        >
                          {actionLoadingId === u.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && users.length === 0 && (
          <div className="p-6 text-center text-gray-500 text-sm">No users found.</div>
        )}
      </div>
    </div>
  );
}
