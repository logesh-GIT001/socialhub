"use client";

import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import {
  Globe,
  Radio,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Power,
  Loader2,
} from "lucide-react";
import {
  Linkedin,
  Instagram,
  Twitter,
  Naukri,
} from "@/components/BrandIcons";

export default function SocialAccountsPage() {
  const queryClient = useQueryClient();
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);

  // Fetch status of all integrations
  const { data: statuses = [], isLoading } = useQuery<any[]>({
    queryKey: ["social-statuses"],
    queryFn: () => api.get("/social/status"),
  });

  // Mutation to disconnect account
  const disconnectMutation = useMutation({
    mutationFn: (accountId: number) => api.delete(`/social/accounts/${accountId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-statuses"] });
    },
  });

  const handleConnect = async (platform: string) => {
    setConnectingPlatform(platform);
    try {
      // Get OAuth Redirect URL
      const data = await api.get(`/social/connect/${platform}`);
      if (data?.authorization_url) {
        // Redirect browser to OAuth login dialog (or mock callback screen)
        window.location.href = data.authorization_url;
      }
    } catch (err) {
      alert("Failed to initiate OAuth flow.");
    } finally {
      setConnectingPlatform(null);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "instagram":
        return <Instagram className="w-6 h-6 text-pink-500" />;
      case "linkedin":
        return <Linkedin className="w-6 h-6 text-indigo-600" />;
      case "x":
        return <Twitter className="w-6 h-6 text-slate-800 dark:text-white" />;
      case "naukri":
        return <Naukri className="w-6 h-6 text-sky-600" />;
      default:
        return <Radio className="w-6 h-6" />;
    }
  };

  // Find linked accounts list
  const { data: accounts = [] } = useQuery<any[]>({
    queryKey: ["connected-accounts"],
    queryFn: () => api.get("/social/accounts"),
  });

  const accountIdMap = accounts.reduce((acc, current) => {
    acc[current.platform.toLowerCase()] = current.id;
    return acc;
  }, {} as Record<string, number>);

  const renderPlatformCards = (platformList: any[]) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {platformList.map((status: any) => {
          const connected = status.connected;
          const accountId = accountIdMap[status.platform.toLowerCase()];
          const isConnecting = connectingPlatform === status.platform;

          return (
            <div
              key={status.platform}
              className={`glass-panel rounded-3xl p-6 border flex flex-col justify-between h-[210px] transition-all relative overflow-hidden group ${
                connected
                  ? "border-indigo-500/20 shadow-indigo-500/5"
                  : "border-slate-200 dark:border-slate-800"
              }`}
            >
              {/* Subtle Background Glow if Connected */}
              {connected && (
                <div className="absolute top-[-50%] right-[-50%] w-[100%] h-[100%] rounded-full bg-indigo-500/5 blur-[50px] pointer-events-none" />
              )}

              {/* Header info */}
              <div className="flex justify-between items-start">
                <div className="flex gap-4 items-center">
                  <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/60 shadow-inner">
                    {getPlatformIcon(status.platform)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm capitalize">{status.platform}</h3>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      Official API Integration
                    </span>
                  </div>
                </div>

                {/* Status Pill */}
                <div className="flex items-center gap-1.5">
                  {connected ? (
                    status.reauth_required ? (
                      <div className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/10 flex items-center gap-1 animate-pulse">
                        <AlertTriangle className="w-3 h-3" /> Reauth Required
                      </div>
                    ) : (
                      <div className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/10 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </div>
                    )
                  ) : (
                    <div className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-slate-500/10 text-slate-400 dark:text-slate-500 border border-slate-500/10 flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> Disconnected
                    </div>
                  )}
                </div>
              </div>

              {/* Account detail / info block */}
              <div className="my-4">
                {connected ? (
                  <div>
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Connected as
                    </div>
                    <div className="text-sm font-bold text-indigo-500 truncate mt-0.5">
                      {status.account_name || "Enterprise Profile"}
                    </div>
                    {status.expires_at && (
                      <span className="text-[9px] text-slate-400 block mt-1">
                        Session expires: {new Date(status.expires_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Authorize SocialHub to publish content, retrieve views, and fetch engagement analytics on behalf of this brand channel.
                  </p>
                )}
              </div>

              {/* Actions footer */}
              <div className="flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800/60 pt-4">
                {connected ? (
                  <>
                    {status.reauth_required && (
                      <button
                        onClick={() => handleConnect(status.platform)}
                        className="px-3 py-1.5 rounded-xl text-[10px] font-semibold bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" /> Reconnect
                      </button>
                    )}
                    <button
                      onClick={() => disconnectMutation.mutate(accountId)}
                      className="px-3 py-1.5 rounded-xl text-[10px] font-semibold bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white transition-colors flex items-center gap-1"
                      type="button"
                    >
                      <Power className="w-3 h-3" /> Disconnect
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleConnect(status.platform)}
                    disabled={isConnecting}
                    className="px-4 py-1.5 rounded-xl text-[10px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/10 hover:shadow-indigo-700/25 transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isConnecting ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      "Authenticate"
                    )}
                  </button>
                )}
              </div>

            </div>
          );
        })}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Channel Connections</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Securely link corporate social media channels once. Employees publish content via SocialHub API keys.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : (
          <div>
            {renderPlatformCards(statuses)}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
