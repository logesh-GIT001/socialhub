"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Bell, Sun, Moon, LogOut, ShieldAlert, User, ChevronDown } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const queryClient = useQueryClient();

  // Query notifications list
  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ["notifications"],
    queryFn: () => api.get("/notifications/"),
    refetchInterval: 15000, // Poll notifications every 15s
    enabled: !!user,
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Mutations to read notifications
  const markAllReadMutation = useMutation({
    mutationFn: () => api.post("/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markSingleReadMutation = useMutation({
    mutationFn: (id: number) => api.post(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 backdrop-blur-md sticky top-0 z-40 select-none">
      
      {/* Search / Section Title */}
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-slate-500 dark:text-slate-400">
          Corporate Workspace
        </h2>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 relative">
        
        {/* Theme Toggler */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/40 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          title="Toggle Light/Dark Theme"
        >
          {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>

        {/* Notifications Icon & Drawer */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
            }}
            className={`p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/40 hover:text-slate-700 dark:hover:text-slate-200 transition-colors relative ${
              showNotifications ? "bg-slate-100 dark:bg-slate-800/40 text-slate-800 dark:text-slate-100" : ""
            }`}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-indigo-600 text-white font-mono text-[9px] font-bold flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-4 z-50">
              <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
                <span className="font-semibold text-xs text-slate-700 dark:text-slate-200">
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllReadMutation.mutate()}
                    className="text-[10px] text-indigo-500 hover:text-indigo-600"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                {notifications.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No new notifications.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => !notif.is_read && markSingleReadMutation.mutate(notif.id)}
                      className={`p-2 rounded-xl text-left border cursor-pointer transition-colors ${
                        notif.is_read
                          ? "bg-slate-50/50 dark:bg-slate-950/20 border-transparent text-slate-500"
                          : "bg-indigo-500/5 border-indigo-500/10 text-slate-700 dark:text-slate-200 hover:bg-indigo-500/10"
                      }`}
                    >
                      <div className="flex justify-between font-semibold text-[11px] mb-0.5">
                        <span>{notif.title}</span>
                        {!notif.is_read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block self-center" />
                        )}
                      </div>
                      <p className="text-[10px] leading-relaxed break-words">{notif.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Vertical divider */}
        <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-1" />

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 text-white font-bold text-xs flex items-center justify-center">
              {user?.full_name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="hidden sm:block text-left max-w-[100px]">
              <div className="text-xs font-semibold truncate leading-none mb-0.5">
                {user?.full_name || "Employee"}
              </div>
              <div className="text-[9px] text-slate-400 truncate leading-none">
                {user?.roles?.[0]?.name || "Staff"}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-2 z-50">
              <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 mb-1">
                <p className="text-[10px] text-slate-400 truncate leading-none mb-1">Signed in as</p>
                <p className="text-xs font-semibold truncate text-slate-800 dark:text-slate-200">
                  {user?.email}
                </p>
              </div>

              {/* Roles Badges */}
              <div className="px-3 py-1 flex flex-wrap gap-1 mb-2">
                {user?.roles?.map((r) => (
                  <span
                    key={r.id}
                    className="px-1.5 py-0.5 rounded text-[8px] font-semibold bg-indigo-500/10 text-indigo-500 border border-indigo-500/10"
                  >
                    {r.name}
                  </span>
                ))}
              </div>

              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-red-500 hover:bg-red-500/10 transition-colors text-left"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
