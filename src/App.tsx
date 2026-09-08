import React, { useState, useEffect } from "react";
import { StudentApp } from "./student/StudentApp";
import { TeacherApp } from "./teacher/TeacherApp";
import { AppPortalMode } from "./types";

export default function App() {
  // Detect portal mode from environment variables, URL path, or search params
  const [portalMode, setPortalMode] = useState<AppPortalMode>(() => {
    try {
      const vitePortal = String((import.meta as any).env?.VITE_PORTAL_MODE || "").toLowerCase().trim();
      if (vitePortal === "student") return "student";
      if (vitePortal === "teacher") return "teacher";

      // Hostname check (e.g., teacher-notes.onrender.com or student-notes.onrender.com)
      const host = window.location.hostname.toLowerCase();
      if (host.includes("teacher")) return "teacher";
      if (host.includes("student")) return "student";

      const path = window.location.pathname.toLowerCase();
      if (path.startsWith("/teacher")) return "teacher";
      if (path.startsWith("/student")) return "student";

      const params = new URLSearchParams(window.location.search);
      const portalParam = params.get("portal");
      if (portalParam === "teacher") return "teacher";
      if (portalParam === "student") return "student";
    } catch {
      // ignore
    }
    return "student"; // Default to student view
  });

  const [isStandalone, setIsStandalone] = useState<boolean>(false);

  // Sync server configuration on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch("/api/config");
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
