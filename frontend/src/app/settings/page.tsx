"use client";

import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useForm } from "react-hook-form";
import { Settings, Shield, Globe, HardDrive, Cpu, Loader2, Save } from "lucide-react";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch settings config
  const { data: settings = {}, isLoading } = useQuery<Record<string, string>>({
    queryKey: ["settings-config"],
    queryFn: () => api.get("/settings/"),
  });

  const { register, handleSubmit } = useForm({
    values: {
      mfa_required: settings.mfa_required === "true",
      rate_limit_per_minute: settings.rate_limit_per_minute || "60",
      allowed_email_domains: settings.allowed_email_domains || "socialhub.corp",
      media_max_upload_size_mb: settings.media_max_upload_size_mb || "50",
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (payload: Record<string, string>) => api.put("/settings/", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-config"] });
      setSuccessMsg("System configuration updated successfully!");
      setTimeout(() => setSuccessMsg(null), 3000);
    },
  });

  const onSubmit = (data: any) => {
    updateSettingsMutation.mutate({
      mfa_required: String(data.mfa_required),
      rate_limit_per_minute: String(data.rate_limit_per_minute),
      allowed_email_domains: String(data.allowed_email_domains),
      media_max_upload_size_mb: String(data.media_max_upload_size_mb),
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure workspace properties, API request rate limiting thresholds, and security policies.
          </p>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold max-w-2xl text-left">
            {successMsg}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl text-left">
            
            {/* Security Policies */}
            <div className="glass-panel rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex gap-3 items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <Shield className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-sm">Security & Access Toggles</h3>
              </div>

              <div className="flex justify-between items-center text-xs">
                <div>
                  <span className="font-semibold block">Force Two-Factor Authentication</span>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-normal max-w-md">
                    Require all staff accounts to enroll in a multi-factor authenticator app (TOTP) during login verification.
                  </p>
                </div>
                <input
                  type="checkbox"
                  {...register("mfa_required")}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* General Corporate configs */}
            <div className="glass-panel rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex gap-3 items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <Globe className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-sm">Corporate Domain Restrictions</h3>
              </div>

              <div className="space-y-1 text-xs">
                <span className="font-semibold block mb-1">Allowed Email Domains</span>
                <p className="text-[10px] text-slate-400 mb-2 leading-normal">
                  Limit team member invites to the specified domains (separated by commas).
                </p>
                <input
                  {...register("allowed_email_domains")}
                  placeholder="company.com, brand.corp"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs focus:outline-none text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Infrastructure settings */}
            <div className="glass-panel rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex gap-3 items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <HardDrive className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-sm">Asset Limits & Rate Control</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
                <div>
                  <span className="font-semibold block mb-1.5">Max Upload Size (MB)</span>
                  <input
                    type="number"
                    {...register("media_max_upload_size_mb")}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs focus:outline-none text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <span className="font-semibold block mb-1.5">API Rate Limits (req/min)</span>
                  <input
                    type="number"
                    {...register("rate_limit_per_minute")}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs focus:outline-none text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={updateSettingsMutation.isPending}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-lg shadow-indigo-600/10 flex items-center gap-1.5"
              >
                {updateSettingsMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Save Configuration
                  </>
                )}
              </button>
            </div>

          </form>
        )}

      </div>
    </DashboardLayout>
  );
}
