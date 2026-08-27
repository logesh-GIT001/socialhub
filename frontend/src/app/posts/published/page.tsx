"use client";

import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import {
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Calendar,
  User,
  RefreshCw,
  Loader2,
} from "lucide-react";

export default function PublishedPostsPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();

  // Fetch all posts
  const { data: posts = [], isLoading } = useQuery<any[]>({
    queryKey: ["posts-list"],
    queryFn: () => api.get("/posts/"),
  });

  const processedPosts = posts.filter(
    (p) => p.status === "published" || p.status === "failed"
  );

  // Retry publish mutation
  const retryMutation = useMutation({
    mutationFn: (id: number) => api.post(`/posts/${id}/publish-now`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts-list"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      alert("Re-publication attempt completed successfully!");
    },
    onError: (err: any) => {
      alert(`Publication retry failed: ${err.message}`);
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Queue Logs</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Logs of sent communications and details of network execution failures.
          </p>
        </div>

        {/* Content list */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : processedPosts.length === 0 ? (
          <div className="glass-panel rounded-3xl p-12 text-center max-w-lg mx-auto space-y-4">
            <ShieldCheck className="w-12 h-12 text-slate-400 mx-auto" />
            <h3 className="font-bold text-base">No queue records</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              No posts have been processed by the system publisher loop yet. Approved posts will show up here.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {processedPosts.map((post) => {
              const failed = post.status === "failed";
              return (
                <div
                  key={post.id}
                  className={`glass-panel rounded-3xl p-6 border flex flex-col justify-between transition-all ${
                    failed
                      ? "border-red-500/20 bg-red-500/[0.01]"
                      : "border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row gap-6 justify-between items-start text-left">
                    
                    {/* Log Details */}
                    <div className="flex-1 space-y-4 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          LOG ID: #{post.id}
                        </span>
                        
                        {/* Status Label */}
                        {failed ? (
                          <span className="px-2 py-0.5 rounded text-[8px] font-semibold bg-red-500/10 text-red-500 uppercase flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Execution Failed
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[8px] font-semibold bg-emerald-500/10 text-emerald-500 uppercase flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> Published
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
                        {post.content}
                      </p>

                      {/* Display platform results */}
                      <div className="space-y-2">
                        <span className="text-[9px] font-bold uppercase text-slate-400 block">
                          Channel Statuses
                        </span>
                        <div className="flex flex-wrap gap-2.5">
                          {post.platforms.map((plat: any) => {
                            const pf = plat.status === "success";
                            return (
                              <div
                                key={plat.id}
                                className={`px-3 py-1.5 rounded-xl border text-[10px] flex items-center gap-1.5 capitalize ${
                                  pf
                                    ? "bg-emerald-500/[0.02] border-emerald-500/15 text-emerald-500"
                                    : "bg-red-500/[0.02] border-red-500/15 text-red-500"
                                }`}
                              >
                                <span className="font-semibold">{plat.platform}</span>
                                <span>&bull;</span>
                                <span className="text-[9px]">
                                  {pf ? `ID: ${plat.platform_post_id}` : plat.error_message}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Attached Assets */}
                      {post.media.length > 0 && (
                        <div className="flex gap-2">
                          {post.media.map((m: any) => (
                            <div key={m.id} className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100">
                              <img src={`http://localhost:8000${m.file_path}`} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Meta */}
                      <div className="flex gap-4 text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          Author: <span className="font-semibold text-slate-600 dark:text-slate-350">{post.creator_name}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Processed: {new Date(post.published_at || post.updated_at).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Fails Action Panel */}
                    {failed && hasPermission("posts:publish") && (
                      <div className="shrink-0 w-full lg:w-auto pt-4 lg:pt-0 lg:border-l border-slate-100 dark:border-slate-800 lg:pl-6">
                        <button
                          onClick={() => retryMutation.mutate(post.id)}
                          disabled={retryMutation.isPending}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-600/10"
                        >
                          {retryMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <RefreshCw className="w-3.5 h-3.5" /> Force Retry Now
                            </>
                          )}
                        </button>
                      </div>
                    )}

                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
