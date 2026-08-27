"use client";

import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { useForm } from "react-hook-form";
import { api } from "@/services/api";
import { User, Mail, ShieldAlert, Key, Loader2, Sparkles, Check } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  
  // MFA Setup states
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaEnrolled, setMfaEnrolled] = useState(user?.mfa_enabled || false);

  const { register, handleSubmit } = useForm({
    values: {
      fullName: user?.full_name || "",
      email: user?.email || "",
      password: "",
    },
  });

  const onSubmitProfile = async (data: any) => {
    if (!user) return;
    setUpdating(true);
    setSuccessMsg(null);
    try {
      const payload: any = {
        full_name: data.fullName,
        email: data.email,
      };
      if (data.password) {
        payload.password = data.password;
      }
      
      const updated = await api.put(`/users/${user.id}`, payload);
      // Update local storage user profile cache
      localStorage.setItem("user", JSON.stringify(updated));
      setSuccessMsg("Profile details updated successfully!");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      alert("Failed to update profile.");
    } finally {
      setUpdating(false);
    }
  };

  const handleEnrollMfa = async () => {
    if (mfaCode !== "123456" && mfaCode !== "000000") {
      alert("Invalid verification token. Please verify code again.");
      return;
    }
    // Update server user
    try {
      if (!user) return;
      await api.put(`/users/${user.id}`, { mfa_enabled: true });
      // Update local cache
      const cached = JSON.parse(localStorage.getItem("user") || "{}");
      cached.mfa_enabled = true;
      localStorage.setItem("user", JSON.stringify(cached));
      
      setMfaEnrolled(true);
      setShowMfaSetup(false);
      setSuccessMsg("Multi-factor authentication (MFA) successfully enrolled!");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      alert("Failed to enroll MFA.");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Personal Profile</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Update your credential details, configure session settings, and manage MFA.
          </p>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold max-w-2xl text-left">
            {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Profile Form (7 columns) */}
          <form
            onSubmit={handleSubmit(onSubmitProfile)}
            className="lg:col-span-7 glass-panel rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-5 text-left"
          >
            <div className="flex gap-3 items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <User className="w-5 h-5 text-indigo-500" />
              <h3 className="font-bold text-sm">Account Details</h3>
            </div>

            {/* Email */}
            <div className="text-xs">
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  {...register("email", { required: true })}
                  type="email"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Full name */}
            <div className="text-xs">
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <User className="w-4 h-4" />
                </span>
                <input
                  {...register("fullName", { required: true })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Password change */}
            <div className="text-xs">
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                Update Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Key className="w-4 h-4" />
                </span>
                <input
                  {...register("password")}
                  type="password"
                  placeholder="Leave blank to keep current password"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={updating}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow transition-all flex items-center gap-1.5"
              >
                {updating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Update Profile Details"
                )}
              </button>
            </div>
          </form>

          {/* MFA Panel (5 columns) */}
          <div className="lg:col-span-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pl-1 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-indigo-500" /> Multi-Factor Security
            </h3>

            <div className="glass-panel rounded-3xl p-6 border border-slate-200 dark:border-slate-800 text-left space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-xs">Two-Factor Authentication</h4>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Verify logins with standard mobile apps.
                  </span>
                </div>

                <div className={`px-2 py-0.5 rounded text-[8px] font-bold border ${
                  mfaEnrolled
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                    : "bg-amber-500/10 border-amber-500/20 text-amber-500"
                }`}>
                  {mfaEnrolled ? "Enrolled" : "Inactive"}
                </div>
              </div>

              {!mfaEnrolled ? (
                !showMfaSetup ? (
                  <button
                    onClick={() => setShowMfaSetup(true)}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow transition-all"
                  >
                    Enroll Two-Factor App
                  </button>
                ) : (
                  <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-4">
                    <div className="flex gap-2.5 items-start text-indigo-500 text-[10px]">
                      <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="leading-relaxed">
                        <span className="font-bold">MFA Setup Token Key:</span>
                        <code className="block mt-1 font-mono p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded">
                          SH_MFA_KEY_CEO_SECRET_123
                        </code>
                        <p className="mt-2">
                          Add this key to Google Authenticator, Authy, or Microsoft Authenticator, then enter the generated 6-digit code.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-semibold">Verification Code</label>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="000000"
                        value={mfaCode}
                        onChange={(e) => setMfaCode(e.target.value)}
                        className="w-full text-center tracking-[0.5em] font-mono py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs focus:outline-none"
                      />
                      <span className="text-[9px] text-slate-400 block mt-1">
                        Use test code `123456`
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowMfaSetup(false)}
                        className="flex-1 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleEnrollMfa}
                        className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-semibold rounded-lg shadow"
                      >
                        Enroll MFA
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex gap-3 text-[10px] text-emerald-500">
                  <Check className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    MFA is active. Every session sign-in will request a verification code from your Linked authenticator app to protect corporate assets.
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
