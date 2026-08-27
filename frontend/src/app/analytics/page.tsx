"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  BarChart3,
  TrendingUp,
  Award,
  Globe,
  Loader2,
  Calendar,
} from "lucide-react";

export default function AnalyticsPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch engagement timeline & platform metrics
  const { data: analytics, isLoading } = useQuery<any>({
    queryKey: ["analytics-summary"],
    queryFn: () => api.get("/analytics/summary"),
  });

  return (
    <DashboardLayout>
      <div className="space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Performance Analytics</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Aggregate engagement results, network reach comparisons, and high-performance updates.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Reach/Audience area chart */}
              <div className="glass-panel rounded-3xl p-6 min-h-[380px] flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-sm flex items-center gap-1.5 mb-1">
                    <TrendingUp className="w-4 h-4 text-indigo-500" /> Daily Impressions Trend
                  </h3>
                  <p className="text-[10px] text-slate-400">Total views recorded across channels.</p>
                </div>

                <div className="w-full h-72 mt-6">
                  {mounted && analytics?.engagement_trend && analytics.engagement_trend.length > 0 ? (
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
                        <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="rgba(156,163,175,0.4)" />
                        <YAxis tick={{ fontSize: 9 }} stroke="rgba(156,163,175,0.4)" />
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
                      <TrendingUp className="w-7 h-7 text-slate-300 dark:text-slate-700 stroke-1" />
                      <span>No impression history recorded yet.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Platform comparision bar chart */}
              <div className="glass-panel rounded-3xl p-6 min-h-[380px] flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-sm flex items-center gap-1.5 mb-1">
                    <BarChart3 className="w-4 h-4 text-indigo-500" /> Channel Audience Distribution
                  </h3>
                  <p className="text-[10px] text-slate-400">Comparing active followers per channel.</p>
                </div>

                <div className="w-full h-72 mt-6">
                  {mounted && analytics?.platform_metrics && analytics.platform_metrics.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={analytics.platform_metrics}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.08)" />
                        <XAxis dataKey="platform" tick={{ fontSize: 9 }} stroke="rgba(156,163,175,0.4)" className="capitalize" />
                        <YAxis tick={{ fontSize: 9 }} stroke="rgba(156,163,175,0.4)" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(15,23,42,0.9)",
                            borderColor: "rgba(255,255,255,0.1)",
                            color: "#fff",
                            borderRadius: "12px",
                            fontSize: "11px",
                          }}
                        />
                        <Bar dataKey="followers" fill="#818cf8" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-xs text-slate-400 gap-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                      <BarChart3 className="w-7 h-7 text-slate-300 dark:text-slate-700 stroke-1" />
                      <span>No channel audience metrics available yet.</span>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Best performing posts */}
            <div className="glass-panel rounded-3xl p-6 border border-slate-200 dark:border-slate-800">
              <div className="flex gap-3 items-center border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
                <Award className="w-5 h-5 text-indigo-500" />
                <div>
                  <h3 className="font-bold text-sm">Best Performing Publications</h3>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Updates driving maximum clicks, shares, and engagement rates.
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {(!analytics?.best_performing_posts || analytics.best_performing_posts.length === 0) ? (
                  <div className="py-10 text-center text-xs text-slate-400">
                    No published posts to evaluate yet. Create and publish posts to see performance rankings.
                  </div>
                ) : (
                  analytics.best_performing_posts.map((post: any) => (
                    <div
                      key={post.post_id}
                      className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/10 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center text-left"
                    >
                      <div className="flex-1 space-y-2 min-w-0">
                        <p className="text-xs font-semibold leading-relaxed break-words whitespace-pre-wrap">
                          {post.content}
                        </p>
                        
                        <div className="flex gap-1.5">
                          {post.platforms.map((p: string) => (
                            <span
                              key={p}
                              className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-indigo-500/15 text-indigo-500 capitalize"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Stats summary */}
                      <div className="flex gap-6 text-xs text-slate-500 shrink-0 font-mono text-[10px]">
                        <div>
                          <span className="block font-normal text-slate-400">Reactions</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{post.total_likes}</span>
                        </div>
                        <div>
                          <span className="block font-normal text-slate-400">Comments</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{post.total_comments}</span>
                        </div>
                        <div>
                          <span className="block font-normal text-slate-400">Shares</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{post.total_shares}</span>
                        </div>
                      </div>

                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
