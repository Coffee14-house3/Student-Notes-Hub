import React, { useState, useEffect } from "react";
import { StudentApp } from "./student/StudentApp";
import { TeacherApp } from "./teacher/TeacherApp";
import { AppPortalMode } from "./types";
import { apiFetch } from "./utils/apiClient";

export default function App() {
  // Detect portal mode: URL search param MUST have highest priority!
  const [portalMode, setPortalMode] = useState<AppPortalMode>(() => {
    try {
      // 1. Explicit query parameter has HIGHEST priority (?portal=teacher or ?portal=student)
      const params = new URLSearchParams(window.location.search);
      const portalParam = params.get("portal")?.toLowerCase().trim();
      if (portalParam === "teacher") return "teacher";
      if (portalParam === "student") return "student";

      // 2. Path or file check (e.g. /teacher, /teacher/, /teacher.html, /student)
      const path = window.location.pathname.toLowerCase();
      if (path.includes("teacher")) return "teacher";
      if (path.includes("student")) return "student";

      // 3. Hostname check (e.g., student.domain.com, teacher.domain.com)
      const host = window.location.hostname.toLowerCase();
      if (host.includes("teacher")) return "teacher";
      if (host.includes("student")) return "student";

      // 4. Vite build-time environment variable
      const vitePortal = String((import.meta as any).env?.VITE_PORTAL_MODE || "").toLowerCase().trim();
      if (vitePortal === "teacher") return "teacher";
      if (vitePortal === "student") return "student";
    } catch {
      // ignore
    }
    return "student"; // Default to student view for class
  });

  // Track if running in locked mode (only when explicitly requested via ?lock=true or lock=student)
  const [isStandalone, setIsStandalone] = useState<boolean>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("lock") === "student" || params.get("lock") === "true") return true;

      const viteStandalone = String((import.meta as any).env?.VITE_STANDALONE || "").toLowerCase().trim();
      if (viteStandalone === "locked" || viteStandalone === "strict") return true;
    } catch {
      // ignore
    }
    return false;
  });

  // Sync server configuration on mount without overriding user explicit URL param
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const hasExplicitPortal = params.has("portal") || 
          window.location.pathname.toLowerCase().includes("teacher") || 
          window.location.pathname.toLowerCase().includes("student");

        const res = await apiFetch("/api/config");
        if (res.ok) {
          const data = await res.json();
          if (data.isStandalone && !hasExplicitPortal) {
            setIsStandalone(true);
            if (data.portalMode === "student") {
              setPortalMode("student");
            } else if (data.portalMode === "teacher") {
              setPortalMode("teacher");
            }
          }
        }
      } catch {
        // fallback
      }
    };
    fetchConfig();
  }, []);

  // Render dedicated Student Application or Teacher Application
  if (portalMode === "teacher") {
    return (
      <TeacherApp 
        isStandalone={isStandalone} 
        onSwitchPortal={(mode) => setPortalMode(mode)} 
      />
    );
  }

  return (
    <StudentApp 
      isStandalone={isStandalone} 
      onSwitchPortal={(mode) => setPortalMode(mode)} 
    />
  );
}
