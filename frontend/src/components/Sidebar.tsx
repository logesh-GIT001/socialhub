"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  PenSquare,
  FileText,
  CheckSquare,
  Calendar,
  Radio,
  Image,
  BarChart3,
  Users,
  ShieldCheck,
  FileSpreadsheet,
  Settings,
  User,
  Shield,
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const { hasPermission } = useAuth();

  const navigationItems = [
    {
      label: "Overview",
      href: "/dashboard",
      icon: LayoutDashboard,
      show: true,
    },
    {
      label: "Campaigns & Posts",
      heading: true,
      show: hasPermission("posts:view") || hasPermission("posts:create"),
    },
    {
      label: "Create Post",
      href: "/posts/create",
      icon: PenSquare,
      show: hasPermission("posts:create"),
    },
    {
      label: "Drafts",
      href: "/posts/drafts",
      icon: FileText,
      show: hasPermission("posts:view"),
    },
    {
      label: "Approval Queue",
      href: "/posts/approval",
      icon: CheckSquare,
      show: hasPermission("posts:approve"),
    },
    {
      label: "Calendar Schedule",
      href: "/calendar",
      icon: Calendar,
      show: hasPermission("posts:view"),
    },
    {
      label: "Published Posts",
      href: "/posts/published",
      icon: ShieldCheck,
      show: hasPermission("posts:view"),
    },
    {
      label: "Assets & Channels",
      heading: true,
      show: hasPermission("social_accounts:view") || hasPermission("media:view"),
    },
    {
      label: "Social Accounts",
      href: "/social",
      icon: Radio,
      show: hasPermission("social_accounts:view"),
    },
    {
      label: "Media Library",
      href: "/media",
      icon: Image,
      show: hasPermission("media:view"),
    },
    {
      label: "Analytics",
      href: "/analytics",
      icon: BarChart3,
      show: hasPermission("analytics:view"),
    },
    {
      label: "Administration",
      heading: true,
      show: hasPermission("users:manage") || hasPermission("audit:view"),
    },
    {
      label: "User Directory",
      href: "/users",
      icon: Users,
      show: hasPermission("users:manage"),
    },
    {
      label: "Audit Logs",
      href: "/audit",
      icon: FileSpreadsheet,
      show: hasPermission("audit:view"),
    },
    {
      label: "Settings",
      href: "/settings",
      icon: Settings,
      show: hasPermission("settings:manage"),
    },
  ];

  return (
    <aside className="w-[var(--sidebar-w)] hidden md:flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 backdrop-blur-md select-none shrink-0 h-screen sticky top-0">
      
      {/* Brand logo header */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-200 dark:border-slate-800">
        <div className="p-2 rounded-xl bg-indigo-600 text-white">
          <Shield className="w-5 h-5" />
        </div>
        <span className="font-bold text-slate-800 dark:text-white leading-none">
          SocialHub <span className="text-indigo-500 font-medium">Corp</span>
        </span>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5 scrollbar-thin">
        {navigationItems.map((item, idx) => {
          if (!item.show) return null;

          if (item.heading) {
            return (
              <div
                key={idx}
                className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 pl-3 pt-4 pb-1"
              >
                {item.label}
              </div>
            );
          }

          const Icon = item.icon!;
          const isActive = pathname === item.href;

          return (
            <Link
              key={idx}
              href={item.href!}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 glow-card glow-card-active"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/40"
              }`}
            >
              <Icon
                className={`w-4 h-4 transition-colors group-hover:scale-105 duration-200 ${
                  isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"
                }`}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Profile quick access footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <Link
          href="/profile"
          className="flex items-center gap-3 p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-600/10 dark:bg-indigo-400/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <User className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold truncate text-slate-800 dark:text-slate-200">
              Profile
            </div>
            <div className="text-[10px] text-slate-400 truncate">Workspace settings</div>
          </div>
        </Link>
      </div>
    </aside>
  );
}
