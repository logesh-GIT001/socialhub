"use client";

import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useRouter } from "next/navigation";
import {
  Globe,
  Upload,
  Calendar,
  Layers,
  Smile,
  Eye,
  Send,
  Loader2,
  Trash2,
} from "lucide-react";
import {
  Instagram,
  Linkedin,
  Twitter,
  Naukri,
} from "@/components/BrandIcons";

export default function CreatePostPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [uploadedMedia, setUploadedMedia] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previewTab, setPreviewTab] = useState<string>("linkedin");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);

  const { register, handleSubmit, watch, reset, setValue } = useForm({
    defaultValues: {
      content: "",
      scheduledAt: "",
      campaignId: "",
    },
  });

  const contentValue = watch("content");

  // Fetch campaign list
  const { data: campaigns = [] } = useQuery<any[]>({
    queryKey: ["campaigns"],
    queryFn: () => api.get("/posts/campaigns"),
  });

  // Create Post mutation
  const createPostMutation = useMutation({
    mutationFn: (payload: any) => api.post("/posts/", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-posts"] });
      reset();
      setUploadedMedia([]);
      setSelectedPlatforms([]);
      router.push("/posts/drafts");
    },
  });

  const handlePlatformToggle = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", files[0]);
    formData.append("category", "post-attachment");

    try {
      const data = await api.post("/media/upload", formData);
      setUploadedMedia((prev) => [...prev, data]);
    } catch (err) {
      alert("Failed to upload media asset.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveMedia = (id: number) => {
    setUploadedMedia((prev) => prev.filter((m) => m.id !== id));
  };

  const onSubmit = (data: any, statusType: "draft" | "in_review") => {
    if (selectedPlatforms.length === 0) {
      alert("Please select at least one publishing channel.");
      return;
    }

    const payload = {
      content: data.content,
      platforms: selectedPlatforms,
      media_ids: uploadedMedia.map((m) => m.id),
      scheduled_at: scheduleEnabled && data.scheduledAt ? new Date(data.scheduledAt).toISOString() : null,
      campaign_id: data.campaignId ? parseInt(data.campaignId) : null,
    };

    createPostMutation.mutate(payload, {
      onSuccess: (post) => {
        if (statusType === "in_review") {
          // Submit for review right after creation
          api.put(`/posts/${post.id}`, { status: "in_review" }).then(() => {
            router.push("/posts/drafts");
          });
        }
      },
    });
  };

  const getCharLimit = () => {
    if (selectedPlatforms.includes("x")) return 280;
    return 3000;
  };

  const getPlatformClass = (platform: string, active: boolean) => {
    const base = "p-3 rounded-2xl border transition-all flex flex-col items-center gap-2 cursor-pointer ";
    if (!active) return base + "border-slate-200 dark:border-slate-800 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 text-slate-400";
    
    switch (platform) {
      case "linkedin": return base + "border-indigo-500 bg-indigo-500/10 text-indigo-500";
      case "x": return base + "border-slate-900 bg-slate-900/10 text-slate-900 dark:border-white dark:bg-white/10 dark:text-white";
      case "instagram": return base + "border-pink-500 bg-pink-500/10 text-pink-500";
      case "naukri": return base + "border-sky-600 bg-sky-600/10 text-sky-600 dark:border-sky-400 dark:bg-sky-400/10 dark:text-sky-400";
      default: return base;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Composer</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Create updates, upload brand assets, and target multiple communication channels at once.
          </p>
        </div>

        {/* Form Container (Composer left, Preview right) */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          
          {/* Composer inputs (7 columns) */}
          <div className="xl:col-span-7 glass-panel rounded-3xl p-6 space-y-6">
            
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Publishing Channels
              </label>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { name: "linkedin", icon: Linkedin },
                  { name: "instagram", icon: Instagram },
                  { name: "x", icon: Twitter },
                  { name: "naukri", icon: Naukri },
                ].map((p) => {
                  const Icon = p.icon;
                  const active = selectedPlatforms.includes(p.name);
                  return (
                    <div
                      key={p.name}
                      onClick={() => handlePlatformToggle(p.name)}
                      className={getPlatformClass(p.name, active)}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-[9px] font-semibold capitalize">{p.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rich text editor */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Post Copy
                </label>
                <span className={`text-[10px] font-mono ${contentValue.length > getCharLimit() ? "text-red-500 font-bold" : "text-slate-400"}`}>
                  {contentValue.length} / {getCharLimit()}
                </span>
              </div>
              <textarea
                {...register("content", { required: true })}
                rows={6}
                placeholder="Write update message, include tags, mentions..."
                className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm leading-relaxed text-slate-900 dark:text-slate-100"
              />
            </div>

            {/* Upload attachments */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Media Attachments
              </label>
              <div className="flex flex-wrap gap-3 items-center">
                {uploadedMedia.map((m) => (
                  <div key={m.id} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 group">
                    {m.content_type.startsWith("image/") ? (
                      <img src={`http://localhost:8000${m.file_path}`} alt="attachment" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] font-bold">Video</div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(m.id)}
                      className="absolute inset-0 bg-red-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {uploadedMedia.length < 4 && (
                  <label className="w-20 h-20 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/40 text-slate-400 hover:text-slate-600">
                    {uploading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span className="text-[8px] font-bold mt-1 uppercase">Add File</span>
                      </>
                    )}
                    <input type="file" accept="image/*,video/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            {/* Advanced section: Campaign selection & Scheduling */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800 pt-6">
              
              {/* Campaign */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  <Layers className="w-3.5 h-3.5" /> Campaign
                </label>
                <select
                  {...register("campaignId")}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-100"
                >
                  <option value="">No Campaign association</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Schedule */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <Calendar className="w-3.5 h-3.5" /> Publishing Schedule
                  </label>
                  <input
                    type="checkbox"
                    checked={scheduleEnabled}
                    onChange={(e) => setScheduleEnabled(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </div>
                <input
                  {...register("scheduledAt")}
                  type="datetime-local"
                  disabled={!scheduleEnabled}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 text-slate-900 dark:text-slate-100"
                />
              </div>

            </div>

            {/* Submission buttons */}
            <div className="flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-6">
              <button
                type="button"
                onClick={handleSubmit((data) => onSubmit(data, "draft"))}
                disabled={createPostMutation.isPending}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300 disabled:opacity-50"
              >
                Save Draft
              </button>
              <button
                type="button"
                onClick={handleSubmit((data) => onSubmit(data, "in_review"))}
                disabled={createPostMutation.isPending}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-lg shadow-indigo-600/10 hover:shadow-indigo-700/25 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {createPostMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" /> Submit to Reviewer
                  </>
                )}
              </button>
            </div>

          </div>

          {/* Native Visual Previews (5 columns) */}
          <div className="xl:col-span-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pl-1 flex items-center gap-1.5">
              <Eye className="w-4 h-4" /> Live preview
            </h3>

            {/* Preview selection tabs */}
            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
              {["linkedin", "x", "instagram", "naukri"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setPreviewTab(tab)}
                  className={`flex-1 text-center py-1.5 rounded-lg text-[10px] font-bold capitalize transition-all ${
                    previewTab === tab
                      ? "bg-white dark:bg-slate-800 shadow text-slate-950 dark:text-white"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Preview Frame */}
            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-3xl p-5 shadow-sm text-left">
              
              {/* LinkedIn Preview Style */}
              {previewTab === "linkedin" && (
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-300 dark:bg-slate-800 flex items-center justify-center font-bold text-xs">
                      SH
                    </div>
                    <div>
                      <h4 className="font-bold text-xs">SocialHub Enterprise</h4>
                      <span className="text-[10px] text-slate-400">1st &bull; Company Page</span>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed whitespace-pre-wrap">
                    {contentValue || "Compose your content to see visual updates..."}
                  </p>
                  {uploadedMedia.length > 0 && (
                    <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-48 bg-slate-100">
                      <img src={`http://localhost:8000${uploadedMedia[0].file_path}`} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex justify-between items-center text-[10px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-900">
                    <span>👍 Like</span>
                    <span>💬 Comment</span>
                    <span>🔄 Repost</span>
                    <span>📤 Send</span>
                  </div>
                </div>
              )}

              {/* X Preview Style */}
              {previewTab === "x" && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-white">
                      X
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex gap-1.5 items-center">
                        <span className="font-bold text-xs truncate">SocialHub Corp</span>
                        <span className="text-[10px] text-slate-400 truncate">@socialhub_corp</span>
                      </div>
                      <p className="text-xs leading-normal mt-1 whitespace-pre-wrap">
                        {contentValue || "Compose your content..."}
                      </p>
                      {uploadedMedia.length > 0 && (
                        <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-48 mt-2.5 bg-slate-100">
                          <img src={`http://localhost:8000${uploadedMedia[0].file_path}`} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex justify-between max-w-xs text-[10px] text-slate-400 mt-3">
                        <span>💬 0</span>
                        <span>🔁 0</span>
                        <span>❤️ 0</span>
                        <span>📊 0</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Instagram Preview Style */}
              {previewTab === "instagram" && (
                <div className="space-y-3">
                  <div className="flex gap-3 items-center">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold">
                      IG
                    </div>
                    <div>
                      <h4 className="font-bold text-xs">socialhub_corp</h4>
                      <span className="text-[9px] text-slate-400">Sponsored</span>
                    </div>
                  </div>
                  {uploadedMedia.length > 0 ? (
                    <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-60 bg-slate-100">
                      <img src={`http://localhost:8000${uploadedMedia[0].file_path}`} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 h-48 bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                      Instagram requires an image or video
                    </div>
                  )}
                  <div className="flex gap-4 text-xs text-slate-500 pt-1">
                    <span>❤️ Like</span>
                    <span>💬 Comment</span>
                    <span>📤 Share</span>
                  </div>
                  <p className="text-xs leading-relaxed whitespace-pre-wrap">
                    <span className="font-bold text-slate-800 dark:text-white mr-1.5">socialhub_corp</span>
                    {contentValue || "Compose your caption..."}
                  </p>
                </div>
              )}

              {/* Naukri Preview Style */}
              {previewTab === "naukri" && (
                <div className="space-y-3 border-l-4 border-sky-600 pl-3">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <div className="w-9 h-9 rounded-lg bg-sky-50 dark:bg-sky-950/30 flex items-center justify-center border border-sky-100 dark:border-sky-900/50">
                        <Naukri className="w-6 h-6 text-sky-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-800 dark:text-white">Active Hiring Announcement</h4>
                        <span className="text-[10px] text-slate-400">SocialHub Corp &bull; Company Page</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-sky-500/10 text-sky-600 border border-sky-500/10">
                      Jobs
                    </span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 mt-2">
                    <h5 className="font-semibold text-xs text-slate-800 dark:text-slate-250 mb-1">Position Details</h5>
                    <p className="text-xs leading-relaxed whitespace-pre-wrap text-slate-600 dark:text-slate-350">
                      {contentValue || "Describe the job role, qualifications, and department..."}
                    </p>
                  </div>
                  {uploadedMedia.length > 0 && (
                    <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-40 bg-slate-100">
                      <img src={`http://localhost:8000${uploadedMedia[0].file_path}`} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex gap-4 text-[10px] font-semibold text-sky-600 dark:text-sky-400 pt-2 border-t border-slate-100 dark:border-slate-900">
                    <span className="cursor-pointer hover:underline">Apply Now</span>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <span className="cursor-pointer hover:underline text-slate-500">View Company Profile</span>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
