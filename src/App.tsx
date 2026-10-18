import React, { useState, useEffect } from "react";
import { StudentApp } from "./student/StudentApp";
import { TeacherApp } from "./teacher/TeacherApp";
import { AppPortalMode } from "./types";
import { apiFetch } from "./utils/apiClient";

export default function App() {
  // Detect portal mode from environment variables, URL path, hostname, or search params
  const [portalMode, setPortalMode] = useState<AppPortalMode>(() => {
    try {
      const vitePortal = String((import.meta as any).env?.VITE_PORTAL_MODE || "").toLowerCase().trim();
      if (vitePortal === "student") return "student";
      if (vitePortal === "teacher") return "teacher";

      // Hostname check (e.g., student.domain.com, teacher.domain.com, mca204-students.github.io)
      const host = window.location.hostname.toLowerCase();
      if (host.includes("student")) return "student";
      if (host.includes("teacher")) return "teacher";

      // Path or file check (e.g. /student, /student.html, /teacher, /teacher.html)
      const path = window.location.pathname.toLowerCase();
      if (path.includes("student")) return "student";
      if (path.includes("teacher")) return "teacher";

      const params = new URLSearchParams(window.location.search);
      const portalParam = params.get("portal");
      if (portalParam === "student") return "student";
      if (portalParam === "teacher") return "teacher";
    } catch {
      // ignore
    }
    return "teacher"; // Default to teacher view for studio access
  });

  // Track if running as a standalone locked website (e.g. 100% Student Website or 100% Teacher Website)
  const [isStandalone, setIsStandalone] = useState<boolean>(() => {
    try {
      const viteStandalone = String((import.meta as any).env?.VITE_STANDALONE || "").toLowerCase().trim();
      if (viteStandalone === "true" || viteStandalone === "1") return true;

      const vitePortal = String((import.meta as any).env?.VITE_PORTAL_MODE || "").toLowerCase().trim();
      if (vitePortal === "student" || vitePortal === "teacher") return true;

      const host = window.location.hostname.toLowerCase();
      if (host.includes("student") || host.includes("teacher")) return true;

      const params = new URLSearchParams(window.location.search);
      if (params.get("standalone") === "true" || params.get("lock") === "true") return true;
    } catch {
      // ignore
    }
    return false;
  });

  // Sync server configuration on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await apiFetch("/api/config");
        if (res.ok) {
          const data = await res.json();
          if (data.isStandalone) {
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
