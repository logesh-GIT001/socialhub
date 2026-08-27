"use client";

import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useForm } from "react-hook-form";
import {
  Users,
  UserPlus,
  Trash2,
  Mail,
  User as UserIcon,
  Shield,
  Loader2,
  X,
  Lock,
  Edit2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

export default function UsersPage() {
  const queryClient = useQueryClient();
  
  // Modals visibility states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Query users list
  const { data: users = [], isLoading } = useQuery<any[]>({
    queryKey: ["users-list"],
    queryFn: () => api.get("/users/"),
  });

  // react-hook-form for Invite modal
  const inviteForm = useForm({
    defaultValues: {
      email: "",
      fullName: "",
      password: "",
      roles: [] as string[],
      bypassApproval: false,
      extraPermissions: [] as string[],
    },
  });

  // react-hook-form for Edit modal
  const editForm = useForm({
    defaultValues: {
      email: "",
      fullName: "",
      password: "",
      roles: [] as string[],
      bypassApproval: false,
      extraPermissions: [] as string[],
    },
  });

  // Create user mutation
  const inviteMutation = useMutation({
    mutationFn: (payload: any) => api.post("/users/", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-list"] });
      setShowInviteModal(false);
      inviteForm.reset();
    },
    onError: (err: any) => {
      setErrorMessage(err.message || "Failed to create user.");
    },
  });

  // Update user mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) =>
      api.put(`/users/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-list"] });
      setEditingUser(null);
      editForm.reset();
    },
    onError: (err: any) => {
      setErrorMessage(err.message || "Failed to update user.");
    },
  });

  // Toggle account active state mutation
  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      api.put(`/users/${id}`, { is_active: active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-list"] });
    },
  });

  // Delete user mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-list"] });
    },
  });

  const onSubmitInvite = (data: any) => {
    setErrorMessage(null);
    const customPerms = [...data.extraPermissions];
    if (data.bypassApproval) {
      customPerms.push("posts:bypass_approval");
    }

    inviteMutation.mutate({
      email: data.email,
      full_name: data.fullName,
      password: data.password,
      roles: data.roles,
      custom_permissions: customPerms,
      is_active: true,
    });
  };

  const onSubmitUpdate = (data: any) => {
    if (!editingUser) return;
    setErrorMessage(null);
    
    const customPerms = [...data.extraPermissions];
    if (data.bypassApproval) {
      customPerms.push("posts:bypass_approval");
    }

    const payload: any = {
      email: data.email,
      full_name: data.fullName,
      roles: data.roles,
      custom_permissions: customPerms,
    };

    // Only update password if provided
    if (data.password && data.password.trim() !== "") {
      payload.password = data.password;
    }

    updateMutation.mutate({
      id: editingUser.id,
      payload,
    });
  };

  const openEditModal = (user: any) => {
    setErrorMessage(null);
    setEditingUser(user);
    
    // Check if bypass permission is in user's custom permissions list
    const hasBypass = user.custom_permissions?.includes("posts:bypass_approval") || false;
    // Extract other custom permissions excluding bypass_approval
    const otherPerms = user.custom_permissions?.filter((p: string) => p !== "posts:bypass_approval") || [];
    
    editForm.reset({
      email: user.email,
      fullName: user.full_name,
      password: "", // Keep password blank
      roles: user.roles.map((r: any) => r.name),
      bypassApproval: hasBypass,
      extraPermissions: otherPerms,
    });
  };

  const rolesAvailable = [
    "CEO",
    "Administrator",
    "Marketing Manager",
    "Marketing Executive",
    "HR",
    "Designer",
    "Reviewer",
  ];

  const permissionsAvailable = [
    { key: "posts:create", label: "Create Posts" },
    { key: "posts:approve", label: "Approve Posts" },
    { key: "social_accounts:connect", label: "Connect Channels" },
    { key: "analytics:view", label: "View Analytics" },
    { key: "users:manage", label: "Manage Team" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Configure system roles, credentials, publishing approvals, and granular override policies.
            </p>
          </div>
          <button
            onClick={() => {
              setErrorMessage(null);
              inviteForm.reset({
                email: "",
                fullName: "",
                password: "",
                roles: [],
                bypassApproval: false,
                extraPermissions: [],
              });
              setShowInviteModal(true);
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/10 flex items-center gap-1.5 transition-all"
            type="button"
          >
            <UserPlus className="w-4 h-4" /> Invite User
          </button>
        </div>

        {/* User table listing */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : (
          <div className="glass-panel rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-4">User Info</th>
                    <th className="px-6 py-4">Assigned Roles</th>
                    <th className="px-6 py-4">Publishing Policy</th>
                    <th className="px-6 py-4">MFA State</th>
                    <th className="px-6 py-4">Access Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-350">
                  {users.map((member) => {
                    const hasBypass = member.custom_permissions?.includes("posts:bypass_approval") || 
                      member.roles.some((r: any) => r.permissions?.some((p: any) => p.name === "posts:bypass_approval"));
                    
                    return (
                      <tr key={member.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-all">
                        {/* Name / Email */}
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                            {member.full_name}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{member.email}</div>
                        </td>

                        {/* Roles list */}
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {member.roles.map((r: any) => (
                              <span
                                key={r.id}
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 capitalize"
                              >
                                {r.name}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Publishing policy */}
                        <td className="px-6 py-4">
                          {hasBypass ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              <CheckCircle className="w-3 h-3" /> Direct Post
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                              <AlertCircle className="w-3 h-3" /> Needs Approval
                            </span>
                          )}
                        </td>

                        {/* MFA Enabled */}
                        <td className="px-6 py-4">
                          <span className={`text-xs font-semibold ${member.mfa_enabled ? "text-emerald-500" : "text-slate-450 dark:text-slate-500"}`}>
                            {member.mfa_enabled ? "Enabled" : "Disabled"}
                          </span>
                        </td>

                        {/* Status Active switch */}
                        <td className="px-6 py-4">
                          <button
                            onClick={() =>
                              toggleActiveMutation.mutate({ id: member.id, active: !member.is_active })
                            }
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border transition-all ${
                              member.is_active
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                : "bg-red-500/10 border-red-500/20 text-red-500"
                            }`}
                          >
                            {member.is_active ? "Active" : "Suspended"}
                          </button>
                        </td>

                        {/* Edit / Delete actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(member)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/40 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                              title="Edit User Policies & Roles"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Delete account for ${member.full_name}? This cannot be undone.`)) {
                                  deleteMutation.mutate(member.id);
                                }
                              }}
                              className="p-1.5 rounded-lg border border-red-500/10 bg-red-500/5 hover:bg-red-500 text-red-500 hover:text-white transition-colors"
                              title="Remove User"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Invite User Dialog Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 text-left">
              
              <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Invite Employee</h3>
                <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-slate-200">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                  {errorMessage}
                </div>
              )}

              <form onSubmit={inviteForm.handleSubmit(onSubmitInvite)} className="space-y-4 text-xs text-slate-800 dark:text-slate-200">
                {/* Full name */}
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Full Name
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                      <UserIcon className="w-4 h-4" />
                    </span>
                    <input
                      {...inviteForm.register("fullName", { required: true })}
                      placeholder="Jane Doe"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none text-xs text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      {...inviteForm.register("email", { required: true })}
                      type="email"
                      placeholder="jane@company.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none text-xs text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* Temp Password */}
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Temporary Password
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      {...inviteForm.register("password", { required: true })}
                      type="password"
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none text-xs text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* Roles Selector */}
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Assign Roles
                  </label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {rolesAvailable.map((role) => (
                      <label key={role} className="flex items-center gap-2 p-2.5 border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 rounded-xl cursor-pointer hover:bg-slate-100">
                        <input
                          type="checkbox"
                          value={role}
                          {...inviteForm.register("roles")}
                          className="rounded border-slate-350 text-indigo-600"
                        />
                        <span className="text-xs font-semibold truncate capitalize">{role}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Publishing Policy Toggle */}
                <div className="p-3 border border-indigo-500/10 bg-indigo-500/5 rounded-2xl">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-bold block text-slate-800 dark:text-slate-200">Publishing Policy Override</span>
                      <p className="text-[10px] text-slate-450 dark:text-slate-400 mt-0.5 leading-normal max-w-sm">
                        Permit this employee to publish updates directly to active company channels without validation reviews.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      {...inviteForm.register("bypassApproval")}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                  </div>
                </div>

                {/* Extra Actions Overrides */}
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Granular Action Overrides
                  </label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {permissionsAvailable.map((perm) => (
                      <label key={perm.key} className="flex items-center gap-2 p-2 border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/10 rounded-xl cursor-pointer hover:bg-slate-100">
                        <input
                          type="checkbox"
                          value={perm.key}
                          {...inviteForm.register("extraPermissions")}
                          className="rounded border-slate-350 text-indigo-600"
                        />
                        <span className="text-[11px] font-medium truncate">{perm.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={inviteMutation.isPending}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow transition-all flex items-center justify-center gap-1.5"
                >
                  {inviteMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Create User Profile"
                  )}
                </button>

              </form>
            </div>
          </div>
        )}

        {/* Edit User Dialog Modal */}
        {editingUser && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 text-left">
              
              <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Edit User Policies & Role</h3>
                <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-200">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                  {errorMessage}
                </div>
              )}

              <form onSubmit={editForm.handleSubmit(onSubmitUpdate)} className="space-y-4 text-xs text-slate-800 dark:text-slate-200">
                {/* Full name */}
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Full Name
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                      <UserIcon className="w-4 h-4" />
                    </span>
                    <input
                      {...editForm.register("fullName", { required: true })}
                      placeholder="Jane Doe"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none text-xs text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      {...editForm.register("email", { required: true })}
                      type="email"
                      placeholder="jane@company.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none text-xs text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* Reset Password */}
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Update Password (Optional)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      {...editForm.register("password")}
                      type="password"
                      placeholder="Leave blank to keep existing password"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none text-xs text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* Roles Selector */}
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Assign Roles
                  </label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {rolesAvailable.map((role) => (
                      <label key={role} className="flex items-center gap-2 p-2.5 border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 rounded-xl cursor-pointer hover:bg-slate-100">
                        <input
                          type="checkbox"
                          value={role}
                          {...editForm.register("roles")}
                          className="rounded border-slate-350 text-indigo-600"
                        />
                        <span className="text-xs font-semibold truncate capitalize">{role}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Publishing Policy Toggle */}
                <div className="p-3 border border-indigo-500/10 bg-indigo-500/5 rounded-2xl">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-bold block text-slate-800 dark:text-slate-200">Publishing Policy Override</span>
                      <p className="text-[10px] text-slate-450 dark:text-slate-400 mt-0.5 leading-normal max-w-sm">
                        Permit this employee to publish updates directly to active company channels without validation reviews.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      {...editForm.register("bypassApproval")}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                  </div>
                </div>

                {/* Extra Actions Overrides */}
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Granular Action Overrides
                  </label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {permissionsAvailable.map((perm) => (
                      <label key={perm.key} className="flex items-center gap-2 p-2 border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/10 rounded-xl cursor-pointer hover:bg-slate-100">
                        <input
                          type="checkbox"
                          value={perm.key}
                          {...editForm.register("extraPermissions")}
                          className="rounded border-slate-350 text-indigo-600"
                        />
                        <span className="text-[11px] font-medium truncate">{perm.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow transition-all flex items-center justify-center gap-1.5"
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Save Configurations"
                  )}
                </button>

              </form>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
