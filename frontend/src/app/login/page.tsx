"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Shield, Lock, Mail, Eye, EyeOff, Loader2, Sparkles, Moon, Sun } from "lucide-react";

export default function LoginPage() {
  const { login, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showMfa, setShowMfa] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Clear any stale local storage or context state on mount
    logout();
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: "",
      password: "",
      mfaToken: "",
    },
  });

  const emailValue = watch("email");
  const passwordValue = watch("password");

  const onSubmit = async (data: any) => {
    setError(null);
    setLoading(true);
    try {
      await login(data.email, data.password, showMfa ? data.mfaToken : undefined);
    } catch (err: any) {
      if (err.message.includes("MFA code required") || err.message.includes("202")) {
        setShowMfa(true);
      } else {
        setError(err.message || "Invalid credentials. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200">
      
      {/* Brand & Artwork Panel (Left) */}
      <div className="hidden lg:flex lg:col-span-7 relative flex-col justify-between p-12 bg-gradient-to-br from-indigo-900 via-slate-950 to-purple-950 overflow-hidden select-none border-r border-slate-800">
        
        {/* Animated Background Mesh */}
        <div className="absolute inset-0 opacity-40">
          <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full bg-indigo-500/20 blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] rounded-full bg-purple-500/20 blur-[120px] animate-pulse" />
        </div>

        {/* Top Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30">
            <Shield className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            SocialHub <span className="text-indigo-400">Enterprise</span>
          </span>
        </div>

        {/* Hero Copy */}
        <div className="relative z-10 my-auto max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-6 rounded-full text-xs font-medium bg-white/10 text-indigo-300 border border-white/10 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5" /> Security & Publishing Combined
          </div>
          <h1 className="text-4xl xl:text-5xl font-bold tracking-tight text-white mb-6 leading-tight">
            Centralized Access Control for All Social Networks.
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed">
            Connect corporate pages once using OAuth 2.0. Allow your marketing, design, and HR teams to compose and review content without sharing passwords.
          </p>
        </div>

        {/* Footer info */}
        <div className="relative z-10 flex justify-between items-center text-sm text-slate-400">
          <span>&copy; {new Date().getFullYear()} SocialHub Enterprise.</span>
          <span>AES-256 Encrypted Session</span>
        </div>
      </div>

      {/* Login Form Panel (Right) */}
      <div className="lg:col-span-5 flex flex-col justify-center px-8 sm:px-16 xl:px-24 py-12 relative">
        
        {/* Theme switcher (top corner) */}
        <button
          onClick={toggleTheme}
          className="absolute top-8 right-8 p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
          type="button"
        >
          {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>

        <div className="w-full max-w-md mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight mb-2">Welcome Back</h2>
            <p className="text-slate-500 dark:text-slate-400">
              Sign in to manage your workspace and active queues.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {!showMfa ? (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">
                    Company Email
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      {...register("email", { required: "Email is required" })}
                      type="email"
                      placeholder="name@company.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  {errors.email && (
                    <span className="text-xs text-red-500 mt-1 block">{errors.email.message}</span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      {...register("password", { required: "Password is required" })}
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm text-slate-900 dark:text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <span className="text-xs text-red-500 mt-1 block">{errors.password.message}</span>
                  )}
                </div>
              </>
            ) : (
              <div className="p-5 rounded-2xl border border-indigo-500/20 bg-indigo-500/5">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-semibold text-sm">Two-Factor Authentication</h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                  MFA is enabled on this account. Open your authenticator app (e.g. Google Authenticator) and enter the 6-digit verification code below.
                </p>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">
                    Verification Code
                  </label>
                  <input
                    {...register("mfaToken", {
                      required: showMfa ? "MFA token is required" : false,
                      maxLength: 6,
                      minLength: 6,
                    })}
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    className="w-full text-center tracking-[1em] text-lg font-mono py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 dark:text-slate-100"
                  />
                  {errors.mfaToken && (
                    <span className="text-xs text-red-500 mt-1 block">
                      {errors.mfaToken.message || "MFA token must be exactly 6 digits"}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 mt-2 block">
                    Tip: For testing, use `123456`
                  </span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-lg shadow-indigo-600/10 hover:shadow-indigo-700/25 transition-all text-sm disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : showMfa ? (
                "Verify Code"
              ) : (
                "Sign In"
              )}
            </button>

            {showMfa && (
              <button
                type="button"
                onClick={() => {
                  setShowMfa(false);
                  setError(null);
                }}
                className="w-full text-center text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 mt-2"
              >
                Go back to password login
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
