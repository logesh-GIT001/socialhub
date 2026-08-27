"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/services/api";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

function CallbackHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  const queryPlatform = searchParams.get("platform");
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  // Determine platform name from query params or state parameter
  let platform = queryPlatform;
  if (!platform && state) {
    if (state.startsWith("platform:")) {
      platform = state.split("platform:")[1];
    } else {
      platform = state;
    }
  }

  useEffect(() => {
    if (!platform || !code) {
      setStatus("error");
      setErrorMsg("Missing authorization code or platform parameter.");
      return;
    }

    const exchangeCode = async () => {
      try {
        await api.post("/social/connect", {
          platform,
          code,
          redirect_uri: window.location.origin + window.location.pathname,
        });
        setStatus("success");
        // Redirect back to social accounts page after 2 seconds
        setTimeout(() => {
          router.push("/social");
        }, 1800);
      } catch (err: any) {
        setStatus("error");
        setErrorMsg(err.message || "Failed to finalize OAuth authorization exchange.");
      }
    };

    exchangeCode();
  }, [platform, code, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
      <div className="w-full max-w-sm glass-panel rounded-3xl p-8 text-center space-y-6">
        
        {status === "loading" && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
            <h2 className="text-lg font-bold">Connecting {platform}</h2>
            <p className="text-xs text-slate-400">
              Exchanging authorization code for secure token...
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            <h2 className="text-lg font-bold">Account Linked!</h2>
            <p className="text-xs text-slate-400">
              Credentials encrypted and saved. Returning you to channels.
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
            <XCircle className="w-12 h-12 text-red-500" />
            <h2 className="text-lg font-bold text-red-500">Connection Failed</h2>
            <p className="text-xs text-slate-400 leading-relaxed">{errorMsg}</p>
            <button
              onClick={() => router.push("/social")}
              className="mt-2 px-4 py-2 bg-slate-200 dark:bg-slate-800 text-xs font-semibold rounded-xl"
            >
              Back to accounts
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

export default function SocialCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
