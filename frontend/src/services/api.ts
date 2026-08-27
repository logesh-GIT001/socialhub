const getBackendUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:8000`;
  }
  return "http://127.0.0.1:8000";
};

const BACKEND_URL = getBackendUrl();

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

class ApiClient {
  private async getHeaders(isMultipart = false): Promise<HeadersInit> {
    const headers: Record<string, string> = {};
    if (!isMultipart) {
      headers["Content-Type"] = "application/json";
    }
    
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }
    return headers;
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(`${BACKEND_URL}${path.startsWith("/api") ? path : `/api/v1${path}`}`);
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          url.searchParams.append(key, String(val));
        }
      });
    }
    return url.toString();
  }

  private async refreshAccessToken(): Promise<string | null> {
    const refresh = localStorage.getItem("refresh_token");
    if (!refresh) return null;

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/v1/auth/refresh?refresh_token_str=${encodeURIComponent(refresh)}`,
        { method: "POST" }
      );
      if (!response.ok) throw new Error("Refresh expired");

      const data = await response.json();
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      return data.access_token;
    } catch (err) {
      // Clear storage and redirect
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
      return null;
    }
  }

  public async request<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
    const { params, headers: customHeaders, ...fetchOptions } = options;
    const url = this.buildUrl(path, params);
    
    const isMultipart = fetchOptions.body instanceof FormData;
    const defaultHeaders = await this.getHeaders(isMultipart);
    
    let config: RequestInit = {
      ...fetchOptions,
      headers: {
        ...defaultHeaders,
        ...customHeaders,
      } as HeadersInit,
    };

    try {
      let response = await fetch(url, config);
      
      // Automatic silent JWT Token Refresh
      if (response.status === 401) {
        const newAccessToken = await this.refreshAccessToken();
        if (newAccessToken) {
          // Retry request with new token
          const retriedHeaders = await this.getHeaders(isMultipart);
          config = {
            ...config,
            headers: {
              ...retriedHeaders,
              ...customHeaders,
            } as HeadersInit,
          };
          response = await fetch(url, config);
        }
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ detail: "API Error" }));
        throw new Error(errData.detail || `HTTP Error ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      throw error;
    }
  }

  public get<T = any>(path: string, params?: Record<string, any>, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: "GET", params });
  }

  public post<T = any>(path: string, body?: any, options: RequestOptions = {}): Promise<T> {
    const isMultipart = body instanceof FormData;
    return this.request<T>(path, {
      ...options,
      method: "POST",
      body: isMultipart ? body : JSON.stringify(body),
    });
  }

  public put<T = any>(path: string, body?: any, options: RequestOptions = {}): Promise<T> {
    const isMultipart = body instanceof FormData;
    return this.request<T>(path, {
      ...options,
      method: "PUT",
      body: isMultipart ? body : JSON.stringify(body),
    });
  }

  public delete<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: "DELETE" });
  }
}

export const api = new ApiClient();
export { BACKEND_URL };
