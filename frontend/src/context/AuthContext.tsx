"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";

interface Permission {
  id: number;
  name: string;
  description?: string;
}

interface Role {
  id: number;
  name: string;
  description?: string;
  permissions: Permission[];
}

interface User {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  mfa_enabled: boolean;
  roles: Role[];
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, mfaToken?: string) => Promise<any>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check initial auth state on mount
    const savedUser = localStorage.getItem("user");
    const accessToken = localStorage.getItem("access_token");

    if (savedUser && accessToken) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        // Bad structure
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string, mfaToken?: string) => {
    setLoading(true);
    try {
      const response = await api.post("/auth/login", {
        email,
        password,
        mfa_token: mfaToken,
      });

      // Save tokens and user info
      localStorage.setItem("access_token", response.access_token);
      localStorage.setItem("refresh_token", response.refresh_token);
      localStorage.setItem("user", JSON.stringify(response.user));
      
      setUser(response.user);
      router.push("/dashboard");
      return response;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await api.post("/auth/logout").catch(() => {});
    } finally {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
      setUser(null);
      setLoading(false);
      router.push("/login");
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    // Check if any user role contains this permission
    return user.roles.some((role) =>
      role.permissions.some((p) => p.name === permission)
    );
  };

  const hasRole = (roleName: string): boolean => {
    if (!user) return false;
    return user.roles.some((role) => role.name === roleName);
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    hasPermission,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
export type { User, Role, Permission };
