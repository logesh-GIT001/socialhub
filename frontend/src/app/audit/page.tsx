"use client";

import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import {
  FileSpreadsheet,
  Search,
  User,
  Activity,
  ChevronDown,
  ChevronUp,
  Loader2,
  Calendar,
} from "lucide-react";

export default function AuditLogsPage() {
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [actionFilter, setActionFilter] = useState("");
  
  // Query audit logs
  const { data: logs = [], isLoading } = useQuery<any[]>({
    queryKey: ["audit-logs", actionFilter],
    queryFn: () => api.get("/audit/", { action: actionFilter || undefined }),
  });

  const toggleExpandLog = (id: number) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  // Extract unique actions for filters
  const actionTypes = [
    "login",
    "logout",
    "user_create",
    "user_update",
    "user_delete",
    "post_create",
    "post_update",
    "post_delete",
    "post_publish_success",
    "post_publish_failed",
    "social_account_connect",
    "social_account_disconnect",
    "media_upload",
    "settings_update",
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Security Audit Logs</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Immutable workspace activity trail. Logs record user session transactions, account connects, and releases.
          </p>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="flex gap-2 items-center text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Activity className="w-4 h-4 text-indigo-500" />
            <span>Operational Activity Filter</span>
          </div>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/25"
          >
            <option value="">All actions</option>
            {actionTypes.map((action) => (
              <option key={action} value={action}>
                {action.replace(/_/g, " ").toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Logs Table */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : logs.length === 0 ? (
          <div className="glass-panel rounded-3xl p-12 text-center max-w-lg mx-auto space-y-4">
            <FileSpreadsheet className="w-12 h-12 text-slate-400 mx-auto" />
            <h3 className="font-bold text-base">No audit logs found</h3>
            <p className="text-xs text-slate-400">
              No actions matching your filter criteria have been recorded.
            </p>
          </div>
        ) : (
          <div className="glass-panel rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-4">Timestamp</th>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Action</th>
                    <th className="px-6 py-4">Target object</th>
                    <th className="px-6 py-4">Client IP</th>
                    <th className="px-6 py-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-slate-800 text-xs">
                  {logs.map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    return (
                      <React.Fragment key={log.id}>
                        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                          {/* Timestamp */}
                          <td className="px-6 py-4 text-slate-400 flex items-center gap-1.5 font-mono text-[10px]">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          
                          {/* User */}
                          <td className="px-6 py-4 font-semibold">
                            {log.user_name || "System"}
                          </td>

                          {/* Action */}
                          <td className="px-6 py-4">
                            <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-indigo-500/10 text-indigo-500 uppercase tracking-wider">
                              {log.action.replace(/_/g, " ")}
                            </span>
                          </td>

                          {/* Target */}
                          <td className="px-6 py-4 text-slate-400 font-mono text-[10px]">
                            {log.target_object || "-"}
                          </td>

                          {/* IP */}
                          <td className="px-6 py-4 text-slate-400 font-mono text-[10px]">
                            {log.ip_address || "System Loop"}
                          </td>

                          {/* Toggle expand */}
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => toggleExpandLog(log.id)}
                              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-650"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </td>
                        </tr>

                        {/* Expanded details panels */}
                        {isExpanded && (
                          <tr className="bg-slate-50/70 dark:bg-slate-900/40">
                            <td colSpan={6} className="px-6 py-4 border-t border-b border-slate-150 dark:border-slate-800">
                              <div className="space-y-3 text-left">
                                <div>
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-450 block mb-1">
                                    Browser User Agent
                                  </span>
                                  <p className="text-[10px] font-mono text-slate-500 leading-normal">
                                    {log.user_agent || "Server Background Loop Execution Context"}
                                  </p>
                                </div>
                                {log.details && (
                                  <div>
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-450 block mb-1">
                                      Event Metadata Payload
                                    </span>
                                    <pre className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-[10px] text-slate-500 overflow-x-auto">
                                      {JSON.stringify(log.details, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
