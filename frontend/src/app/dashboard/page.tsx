"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  Eye,
  Heart,
  Share2,
  AlertTriangle,
  Clock,
  CheckCircle,
  FileText,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch dashboard aggregate metrics
  const { data: summary, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["dashboard-summary"],
    queryFn: () => api.get("/posts/dashboard/summary"),
    refetchInterval: 30000,
  });

  // Fetch engagement timeline & platform metrics
  const { data: analytics, isLoading: analyticsLoading } = useQuery<any>({
    queryKey: ["analytics-summary"],
    queryFn: () => api.get("/analytics/summary"),
  });

  // Fetch recent audit logs for activity list
  const { data: auditLogs = [] } = useQuery<any[]>({
    queryKey: ["recent-audit"],
    queryFn: () => api.get("/audit/", { limit: 5 }),
  });

  // Fetch post drafts or pending review list
  const { data: posts = [] } = useQuery<any[]>({
    queryKey: ["dashboard-posts"],
    queryFn: () => api.get("/posts/"),
  });

  const pendingApprovals = posts.filter((p) => p.status === "in_review").slice(0, 3);

  const statCards = [
    {
      title: "Active Audience",
      value: summary?.total_followers_estimate ? summary.total_followers_estimate.toLocaleString() : "0",
      change: summary?.total_followers_estimate ? "Connected network audience" : "No channel audience yet",
      icon: Users,
      color: "from-blue-500/10 to-sky-500/5 text-blue-500",
    },
    {
      title: "Total Impressions",
      value: analytics?.total_impressions ? analytics.total_impressions.toLocaleString() : "0",
      change: analytics?.total_impressions ? "Recorded publication views" : "No impressions recorded",
      icon: Eye,
      color: "from-purple-500/10 to-indigo-500/5 text-purple-500",
    },
    {
      title: "Content Reactions",
      value: analytics?.total_likes ? analytics.total_likes.toLocaleString() : "0",
      change: analytics?.total_likes ? "Likes & reactions" : "No reactions yet",
      icon: Heart,
      color: "from-pink-500/10 to-rose-500/5 text-pink-500",
    },
    {
      title: "Shares & Reposts",
      value: analytics?.total_shares ? analytics.total_shares.toLocaleString() : "0",
      change: analytics?.total_shares ? "Audience reshares" : "No shares yet",
      icon: Share2,
      color: "from-green-500/10 to-emerald-500/5 text-green-500",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-indigo-950 dark:from-white dark:to-indigo-200 bg-clip-text text-transparent">
              Workspace Overview
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Social account status, publishing queue health, and engagement analytics.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/posts/create"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/10 hover:shadow-indigo-700/20 transition-all"
            >
              Compose Content
            </Link>
          </div>
        </div>

        {/* 4 Stats Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {statCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                className="glass-panel rounded-2xl p-5 hover:scale-[1.01] transition-transform duration-200"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {card.title}
                  </span>
                  <div className={`p-2 rounded-xl bg-gradient-to-br ${card.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold tracking-tight">{card.value}</div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                  {card.change}
                </div>
              </div>
            );
          })}
        </div>

        {/* Queue Health Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Drafts", count: summary?.draft_posts_count || 0, icon: FileText, color: "text-slate-400 bg-slate-400/5 border-slate-400/10" },
            { label: "In Review", count: summary?.pending_approvals_count || 0, icon: Clock, color: "text-amber-500 bg-amber-500/5 border-amber-500/10" },
            { label: "Approved/Scheduled", count: summary?.scheduled_posts_count || 0, icon: CheckCircle, color: "text-emerald-500 bg-emerald-500/5 border-emerald-500/10" },
            { label: "Failed Posts", count: summary?.failed_posts_count || 0, icon: AlertTriangle, color: "text-red-500 bg-red-500/5 border-red-500/10" },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className={`p-4 rounded-xl border flex items-center gap-3.5 ${item.color}`}>
                <div className="p-2 rounded-lg bg-current/10">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-medium opacity-80">{item.label}</div>
                  <div className="text-xl font-bold leading-tight mt-0.5">{item.count}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Analytics Chart & Side Panels (Grid) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Recharts Area Plot (8 columns) */}
          <div className="lg:col-span-8 glass-panel rounded-2xl p-6 flex flex-col justify-between min-h-[380px]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-sm tracking-tight flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-500" />
                  Reach & Audience Growth
                </h3>
                <p className="text-[11px] text-slate-400">
                  Aggregated profile impressions across all platforms.
                </p>
              </div>
            </div>

            <div className="flex-1 w-full h-[280px]">
              {mounted && !analyticsLoading && analytics?.engagement_trend && analytics.engagement_trend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={analytics.engagement_trend}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.08)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      stroke="rgba(156,163,175,0.4)"
                    />
                    <YAxis tick={{ fontSize: 10 }} stroke="rgba(156,163,175,0.4)" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(15,23,42,0.9)",
                        borderColor: "rgba(255,255,255,0.1)",
                        color: "#fff",
                        borderRadius: "12px",
                        fontSize: "11px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="reach"
                      stroke="#6366f1"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorReach)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-xs text-slate-400 gap-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <TrendingUp className="w-8 h-8 text-slate-300 dark:text-slate-700 stroke-1" />
                  <span>No impression history yet. Connect accounts and publish posts to populate metrics.</span>
                </div>
              )}
            </div>
          </div>

          {/* Pending Approval Widget (4 columns) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Approvals Box */}
            <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
                <span className="text-xs font-semibold tracking-tight text-slate-700 dark:text-slate-300">
                  Awaiting Approval
                </span>
                <Link
                  href="/posts/approval"
                  className="text-[10px] text-indigo-500 hover:underline flex items-center gap-0.5"
                >
                  Queue <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto max-h-[140px]">
                {pendingApprovals.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No posts require immediate review.
                  </div>
                ) : (
                  pendingApprovals.map((post) => (
                    <div
                      key={post.id}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-colors w-full min-w-0"
                    >
                      <p className="text-xs truncate font-medium w-full block">{post.content}</p>
                      <div className="flex justify-between items-center mt-2 text-[9px] text-slate-400">
                        <span>By {post.creator_name || "Author"}</span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-semibold uppercase">
                          In Review
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent System Activity Logs */}
            <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
                <span className="text-xs font-semibold tracking-tight text-slate-700 dark:text-slate-300">
                  Recent Activity
                </span>
                <Link
                  href="/audit"
                  className="text-[10px] text-indigo-500 hover:underline flex items-center gap-0.5"
                >
                  All Logs <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="space-y-3.5 flex-1 max-h-[150px] overflow-y-auto pr-1 scrollbar-thin">
                {auditLogs.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No recent activity records.
                  </div>
                ) : (
                  auditLogs.slice(0, 4).map((log) => (
                    <div key={log.id} className="flex gap-3 text-left">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium leading-none text-slate-700 dark:text-slate-300">
                          {log.user_name || "System"} performed{" "}
                          <span className="font-semibold text-indigo-400">
                            {log.action.replace(/_/g, " ")}
                          </span>
                        </p>
                        <span className="text-[9px] text-slate-400 mt-0.5 block">
                          {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
