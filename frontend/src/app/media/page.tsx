"use client";

import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import {
  Image as ImageIcon,
  Search,
  Upload,
  Trash2,
  Tag,
  FolderOpen,
  Loader2,
  FileText,
  Video,
} from "lucide-react";

export default function MediaLibraryPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  // Query media items
  const { data: mediaItems = [], isLoading } = useQuery<any[]>({
    queryKey: ["media-items", selectedCategory, searchTerm],
    queryFn: () =>
      api.get("/media/", {
        category: selectedCategory || undefined,
        search: searchTerm || undefined,
      }),
  });

  // Mutation to upload
  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => api.post("/media/upload", formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-items"] });
    },
  });

  // Mutation to delete
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/media/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-items"] });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", files[0]);
    formData.append("category", selectedCategory || "general");

    try {
      await uploadMutation.mutateAsync(formData);
    } catch (err) {
      alert("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const categories = ["general", "logos", "brand-assets", "banners", "campaigns"];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Media Library</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Store brand assets, logos, video shorts, and campaign banners.
            </p>
          </div>

          {/* Upload Button */}
          {hasPermission("media:upload") && (
            <label className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/10 hover:shadow-indigo-700/20 transition-all flex items-center gap-1.5 cursor-pointer self-start">
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span>Upload Asset</span>
              <input type="file" accept="image/*,video/*,application/pdf" onChange={handleFileUpload} className="hidden" />
            </label>
          )}
        </div>

        {/* Filter bar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
          {/* Search */}
          <div className="relative w-full md:max-w-sm">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search filename or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/25"
            />
          </div>

          {/* Category tabs */}
          <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
            <button
              onClick={() => setSelectedCategory("")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                selectedCategory === ""
                  ? "bg-slate-800 text-white dark:bg-white dark:text-slate-900"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800"
              }`}
            >
              All Assets
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                  selectedCategory === cat
                    ? "bg-slate-800 text-white dark:bg-white dark:text-slate-900"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800"
                }`}
              >
                {cat.replace("-", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Media Grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : mediaItems.length === 0 ? (
          <div className="glass-panel rounded-3xl p-12 text-center max-w-lg mx-auto space-y-4">
            <ImageIcon className="w-12 h-12 text-slate-400 mx-auto" />
            <h3 className="font-bold text-base">No media assets found</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Upload images, MP4 videos, or PDF guides to catalog them in your team asset library.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {mediaItems.map((media) => (
              <div
                key={media.id}
                className="glass-panel rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 group relative flex flex-col justify-between"
              >
                {/* Visual Thumbnail */}
                <div className="aspect-square bg-slate-100 dark:bg-slate-950 flex items-center justify-center relative overflow-hidden">
                  {media.content_type.startsWith("image/") ? (
                    <img
                      src={`http://localhost:8000${media.file_path}`}
                      alt={media.filename}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                    />
                  ) : media.content_type.startsWith("video/") ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-indigo-500 bg-indigo-500/5">
                      <Video className="w-8 h-8" />
                      <span className="text-[8px] font-bold uppercase mt-1">Video</span>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                      <FileText className="w-8 h-8" />
                      <span className="text-[8px] font-bold uppercase mt-1">Document</span>
                    </div>
                  )}

                  {/* Actions Drawer on Hover */}
                  {hasPermission("media:upload") && (
                    <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={() => deleteMutation.mutate(media.id)}
                        className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        title="Delete asset"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Metadata details */}
                <div className="p-3 text-left">
                  <h4 className="text-[11px] font-bold truncate text-slate-700 dark:text-slate-200" title={media.filename}>
                    {media.filename}
                  </h4>
                  <div className="flex justify-between items-center mt-1 text-[9px] text-slate-400">
                    <span className="capitalize">{media.category}</span>
                    <span>{(media.file_size / (1024 * 1024)).toFixed(2)} MB</span>
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
