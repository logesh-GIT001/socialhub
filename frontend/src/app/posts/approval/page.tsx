"use client";

import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import {
  CheckSquare,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Calendar,
  User,
  Loader2,
  X,
  MessageCircle,
} from "lucide-react";

export default function ApprovalQueuePage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Dialog modal states
  const [rejectingPostId, setRejectingPostId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [commentingPostId, setCommentingPostId] = useState<number | null>(null);
  const [newComment, setNewComment] = useState("");

  // Query reviews list
  const { data: posts = [], isLoading } = useQuery<any[]>({
    queryKey: ["posts-list"],
    queryFn: () => api.get("/posts/"),
  });

  const reviewQueue = posts.filter((p) => p.status === "in_review");

  // Approval Mutation
  const approveMutation = useMutation({
    mutationFn: (id: number) => api.put(`/posts/${id}`, { status: "approved" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts-list"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      alert("Post approved successfully!");
    },
    onError: (err: any) => {
      alert("Failed to approve post: " + (err.message || err.toString()));
    }
  });

  // Rejection Mutation
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      api.put(`/posts/${id}`, { status: "draft", rejection_comment: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts-list"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      setRejectingPostId(null);
      setRejectionReason("");
    },
  });

  // Comment Mutation
  const commentMutation = useMutation({
    mutationFn: ({ id, text }: { id: number; text: string }) =>
      api.post(`/posts/${id}/comments`, { text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts-list"] });
      setNewComment("");
      setCommentingPostId(null);
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Approval Queue</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review campaign updates, collaborate on content copies, and approve or reject submissions.
          </p>
        </div>

        {/* Content grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : reviewQueue.length === 0 ? (
          <div className="glass-panel rounded-3xl p-12 text-center max-w-lg mx-auto space-y-4">
            <CheckSquare className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="font-bold text-base">All caught up!</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              There are no pending posts in the review queue. Good job!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {reviewQueue.map((post) => (
              <div
                key={post.id}
                className="glass-panel rounded-3xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row gap-6 justify-between items-start"
              >
                
                {/* Post details */}
                <div className="flex-1 space-y-4 text-left min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Post ID: #{post.id}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[8px] font-semibold bg-amber-500/10 text-amber-500 uppercase">
                      In Review
                    </span>
                  </div>

                  <p className="text-xs text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-wrap break-words">
                    {post.content}
                  </p>

                  {/* Attached Media */}
                  {post.media.length > 0 && (
                    <div className="flex gap-2">
                      {post.media.map((m: any) => (
                        <div key={m.id} className="w-14 h-14 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100">
                          <img src={`http://localhost:8000${m.file_path}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Comments thread listing */}
                  {post.comments.length > 0 && (
                    <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                      <span className="text-[9px] font-bold uppercase text-slate-400 flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> Collaboration Logs
                      </span>
                      <div className="space-y-2 max-h-28 overflow-y-auto pr-1">
                        {post.comments.map((c: any) => (
                          <div key={c.id} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-[10px]">
                            <div className="flex justify-between font-semibold mb-0.5 text-indigo-500">
                              <span>{c.user_name}</span>
                              <span className="text-slate-400 font-normal">
                                {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="leading-relaxed">{c.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Metadata labels */}
                  <div className="flex flex-wrap gap-4 text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      Author: <span className="font-semibold text-slate-600 dark:text-slate-300">{post.creator_name}</span>
                    </span>
                    {post.scheduled_at && (
                      <span className="flex items-center gap-1 text-indigo-500 font-semibold">
                        <Calendar className="w-3.5 h-3.5" />
                        Target: {new Date(post.scheduled_at).toLocaleString()}
                      </span>
                    )}
                    <div className="flex gap-1 ml-auto">
                      {post.platforms.map((p: any) => (
                        <span key={p.id} className="px-1.5 py-0.5 rounded text-[8px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold capitalize border border-slate-200 dark:border-slate-800">
                          {p.platform}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Reviewer Action Buttons */}
                <div className="flex flex-row lg:flex-col gap-2 shrink-0 w-full lg:w-auto pt-4 lg:pt-0 lg:border-l border-slate-100 dark:border-slate-800 lg:pl-6">
                  
                  {/* Approve */}
                  <button
                    onClick={() => approveMutation.mutate(post.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-all shadow-md shadow-emerald-600/10 hover:shadow-emerald-700/20"
                    type="button"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" /> Approve & Queue
                  </button>

                  {/* Reject */}
                  <button
                    onClick={() => setRejectingPostId(post.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white transition-all border border-red-500/20 text-xs font-semibold"
                    type="button"
                  >
                    <ThumbsDown className="w-3.5 h-3.5" /> Reject Draft
                  </button>

                  {/* Comment */}
                  <button
                    onClick={() => setCommentingPostId(post.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-300 text-xs font-semibold"
                    type="button"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> Discuss
                  </button>

                </div>

              </div>
            ))}
          </div>
        )}

        {/* Rejection comment prompt modal */}
        {rejectingPostId !== null && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-sm text-red-500">Provide Rejection Reason</h3>
                <button onClick={() => setRejectingPostId(null)} className="text-slate-400 hover:text-slate-200">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <textarea
                placeholder="Content contains spelling errors, wrong hashtag, needs other logos..."
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-slate-900 dark:text-slate-100"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setRejectingPostId(null)}
                  className="px-3.5 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => rejectMutation.mutate({ id: rejectingPostId, reason: rejectionReason })}
                  className="px-4 py-2 rounded-xl text-xs bg-red-600 hover:bg-red-700 text-white font-semibold"
                >
                  Reject submission
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Discussions comment prompt modal */}
        {commentingPostId !== null && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-sm">Add Collaborative Log Comment</h3>
                <button onClick={() => setCommentingPostId(null)} className="text-slate-400 hover:text-slate-200">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <textarea
                placeholder="What changes or corrections are needed for this post draft?"
                rows={3}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setCommentingPostId(null)}
                  className="px-3.5 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => commentMutation.mutate({ id: commentingPostId, text: newComment })}
                  className="px-4 py-2 rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                >
                  Post Comment
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
