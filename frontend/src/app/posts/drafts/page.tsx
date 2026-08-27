"use client";

import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import {
  FileText,
  Calendar,
  Layers,
  Send,
  Trash2,
  AlertCircle,
  Copy,
  PenSquare,
  Loader2,
  RefreshCcw,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DraftsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Fetch all posts
  const { data: posts = [], isLoading } = useQuery<any[]>({
    queryKey: ["posts-list"],
    queryFn: () => api.get("/posts/"),
  });

  const drafts = posts.filter((p) => p.status === "draft");

  // Delete draft mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/posts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts-list"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });

  // Submit for review mutation
  const submitReviewMutation = useMutation({
    mutationFn: (id: number) => api.put(`/posts/${id}`, { status: "in_review" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts-list"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });

  // Duplicate draft mutation
  const duplicateMutation = useMutation({
    mutationFn: (post: any) =>
      api.post("/posts/", {
        content: post.content,
        platforms: post.platforms.map((p: any) => p.platform),
        media_ids: post.media.map((m: any) => m.id),
        campaign_id: post.campaign?.id || null,
        scheduled_at: post.scheduled_at || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts-list"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Drafts Manager</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Refine copy, update media files, and submit campaigns for publication review.
            </p>
          </div>
          <Link
            href="/posts/create"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/10 transition-all"
          >
            Create Post
          </Link>
        </div>

        {/* Content list */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : drafts.length === 0 ? (
          <div className="glass-panel rounded-3xl p-12 text-center max-w-lg mx-auto space-y-4">
            <FileText className="w-12 h-12 text-slate-400 mx-auto" />
            <h3 className="font-bold text-base">No drafts found</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              You do not have any saved content drafts in this workspace. Create a post draft to get started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {drafts.map((post) => (
              <div
                key={post.id}
                className="glass-panel rounded-3xl p-6 flex flex-col justify-between border border-slate-200 dark:border-slate-800 hover:border-indigo-500/20 hover:shadow-2xl transition-all"
              >
                
                {/* Content Box */}
                <div className="space-y-4 text-left">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Draft ID: #{post.id}
                    </span>
                    {/* Platform icons badges */}
                    <div className="flex gap-1">
                      {post.platforms.map((p: any) => (
                        <span
                          key={p.id}
                          className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-indigo-500/10 text-indigo-500 capitalize"
                        >
                          {p.platform}
                        </span>
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap line-clamp-3 break-words">
                    {post.content}
                  </p>

                  {/* Rejection comment flag */}
                  {post.rejection_comment && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-2.5 items-start text-red-500 text-[10px] w-full min-w-0">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="font-bold block text-left">Reviewer Feedback:</span>
                        <p className="mt-0.5 leading-normal text-left break-words">{post.rejection_comment}</p>
                      </div>
                    </div>
                  )}

                  {/* Attached images count */}
                  {post.media.length > 0 && (
                    <div className="flex gap-2">
                      {post.media.slice(0, 3).map((m: any) => (
                        <div key={m.id} className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100">
                          <img src={`http://localhost:8000${m.file_path}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                      {post.media.length > 3 && (
                        <div className="w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">
                          +{post.media.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footnotes & Actions */}
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <div className="text-[9px] text-slate-400 space-y-0.5">
                    {post.scheduled_at && (
                      <span className="flex items-center gap-1 font-semibold text-indigo-400">
                        <Calendar className="w-3 h-3" />
                        {new Date(post.scheduled_at).toLocaleString()}
                      </span>
                    )}
                    {post.campaign && (
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        {post.campaign.name}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-1.5">
                    {/* Duplicate button */}
                    <button
                      onClick={() => duplicateMutation.mutate(post)}
                      className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/40 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      title="Duplicate Draft"
                      type="button"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {/* Delete button */}
                    <button
                      onClick={() => deleteMutation.mutate(post.id)}
                      className="p-2 rounded-lg border border-red-500/10 bg-red-500/5 hover:bg-red-500 text-red-500 hover:text-white transition-colors"
                      title="Delete Draft"
                      type="button"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {/* Submit Review */}
                    <button
                      onClick={() => submitReviewMutation.mutate(post.id)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[10px] shadow flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" /> Review
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
