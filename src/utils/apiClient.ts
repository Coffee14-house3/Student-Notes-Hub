/**
 * Centralized API Client for Static Frontend & Render Micro-Backend
 * 
 * Supports:
 * - Build-time environment variable: VITE_API_URL or VITE_BACKEND_URL
 * - User/Teacher runtime configuration saved to localStorage
 * - Automatic fallback to relative origin when running locally or full-stack on Render
 */

const STORAGE_KEY = "app_render_backend_url";
const LISTENERS: Array<(url: string) => void> = [];

export function isStaticHosting(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  return host.includes("github.io") || host.includes("vercel.app") || host.includes("pages.dev");
}

export function isBackendConfigured(): boolean {
  return Boolean(getBackendUrl()) || !isStaticHosting();
}

export function onBackendUrlChange(callback: (url: string) => void): () => void {
  LISTENERS.push(callback);
  return () => {
    const idx = LISTENERS.indexOf(callback);
    if (idx !== -1) LISTENERS.splice(idx, 1);
  };
}

export function getBackendUrl(): string {
  // Determine if active portal context is teacher
  const isTeacherPortal = typeof window !== "undefined" && (
    (import.meta as any).env?.VITE_PORTAL_MODE === "teacher" ||
    window.location.search.includes("portal=teacher") ||
    window.location.pathname.includes("/teacher")
  );

  // 1. Build-time environment variable (Injected by GitHub Actions / Option B)
  const envTeacherUrl = (import.meta as any).env?.VITE_TEACHER_BACKEND_URL;
  const envStudentUrl = (import.meta as any).env?.VITE_STUDENT_BACKEND_URL;
  const envCommonUrl = (import.meta as any).env?.VITE_BACKEND_URL || (import.meta as any).env?.VITE_API_URL;

  if (isTeacherPortal && envTeacherUrl && typeof envTeacherUrl === "string" && envTeacherUrl.trim()) {
    return envTeacherUrl.trim().replace(/\/+$/, "");
  }
  if (!isTeacherPortal && envStudentUrl && typeof envStudentUrl === "string" && envStudentUrl.trim()) {
    return envStudentUrl.trim().replace(/\/+$/, "");
  }
  if (envCommonUrl && typeof envCommonUrl === "string" && envCommonUrl.trim()) {
    return envCommonUrl.trim().replace(/\/+$/, "");
  }

  // 2. User/Teacher runtime override in localStorage
  try {
    const custom = localStorage.getItem(STORAGE_KEY);
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/+$/, "");
    }
  } catch {}

  // 3. Automated Discovery: on static hosting (GitHub Pages), route to respective Render backend
  if (isStaticHosting()) {
    return isTeacherPortal
      ? "https://mca204-teacher-api.onrender.com"
      : "https://mca204-student-api.onrender.com";
  }

  // 4. Local dev / same-origin fallback
  return "";
}

export function setBackendUrl(url: string): void {
  try {
    let cleanUrl = "";
    if (url && url.trim()) {
      cleanUrl = url.trim().replace(/\/+$/, "");
      if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
        cleanUrl = `https://${cleanUrl}`;
      }
      localStorage.setItem(STORAGE_KEY, cleanUrl);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    LISTENERS.forEach(cb => {
      try { cb(cleanUrl); } catch {}
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("backend-url-changed", { detail: cleanUrl }));
    }
  } catch {}
}

export function apiUrl(endpoint: string): string {
  const base = getBackendUrl();
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  if (!base) return cleanEndpoint;
  return `${base}${cleanEndpoint}`;
}

export async function apiFetch(endpoint: string, init?: RequestInit): Promise<Response> {
  const url = apiUrl(endpoint);
  return fetch(url, init);
}

export async function testBackendConnection(targetUrl?: string): Promise<{
  ok: boolean;
  message: string;
  latencyMs?: number;
  data?: any;
}> {
  const start = performance.now();
  const baseUrl = (targetUrl !== undefined ? targetUrl.trim().replace(/\/+$/, "") : getBackendUrl());
  const healthEndpoint = baseUrl ? `${baseUrl}/api/health` : "/api/health";
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(healthEndpoint, {
      signal: controller.signal,
      headers: { "Accept": "application/json" }
    });
    clearTimeout(timeoutId);
    const latencyMs = Math.round(performance.now() - start);

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        ok: true,
        message: `Connected (${latencyMs}ms latency)`,
        latencyMs,
        data
      };
    } else {
      return {
        ok: false,
        message: `Server returned HTTP ${res.status}`
      };
    }
  } catch (err: any) {
    const isTimeout = err?.name === "AbortError";
    return {
      ok: false,
      message: isTimeout ? "Connection timed out (Render free tier may be waking up, ~30s)" : (err?.message || "Failed to connect to backend")
    };
  }
}
