import React, { useState, useEffect } from "react";
import { 
  HardDrive, 
  Cpu, 
  TrendingUp, 
  CheckCircle2, 
  RefreshCw, 
  Sparkles, 
  Zap, 
  Layers, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  Database,
  ArrowUpRight
} from "lucide-react";

export interface StorageTier {
  id: number;
  name: string;
  label: string;
  maxBytes: number;
  maxFormatted: string;
}

export interface AutoScalingEvent {
  id: string;
  timestamp: string;
  eventType: "TIER_UPGRADE" | "AUTOSCALE_TRIGGER" | "STORAGE_OPTIMIZE" | "CAPACITY_EXPAND";
  fromCapacity: string;
  toCapacity: string;
  fromTier: string;
  toTier: string;
  reason: string;
  usedBytes: number;
  usedFormatted: string;
  fileTrigger?: string;
}

export interface StorageMetrics {
  status: "active" | "scaling" | "optimizing";
  autoScalingEnabled: boolean;
  currentTier: StorageTier;
  usedBytes: number;
  usedFormatted: string;
  totalCapacityBytes: number;
  totalCapacityFormatted: string;
  headroomBytes: number;
  headroomFormatted: string;
  usagePercent: number;
  thresholdPercent: number;
  filesCount: number;
  largestFile: { name: string; sizeFormatted: string; bytes: number } | null;
  heapMemory: {
    usedMB: number;
    totalMB: number;
    rssMB: number;
    mode: string;
  };
  events: AutoScalingEvent[];
  lastAutoScaledAt: string | null;
  storageBreakdown: {
    pdfsBytes: number;
    pdfsFormatted: string;
    rawFilesBytes: number;
    rawFilesFormatted: string;
    slidesBytes: number;
    slidesFormatted: string;
    metadataBytes: number;
    metadataFormatted: string;
  };
}

interface Props {
  refreshTrigger?: number;
}

export const AutoScalingStorageHub: React.FC<Props> = ({ refreshTrigger }) => {
  const [metrics, setMetrics] = useState<StorageMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isScaling, setIsScaling] = useState<boolean>(false);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [showEventLog, setShowEventLog] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      const res = await fetch("/api/storage/metrics");
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (err) {
      console.warn("[AutoScalingHub] Failed to fetch storage metrics:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 12000);
    return () => clearInterval(interval);
  }, [refreshTrigger]);

  const handleTriggerSimulatedScale = async () => {
    setIsScaling(true);
    try {
      const res = await fetch("/api/storage/auto-scale/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Manual auto-scale elasticity test requested by instructor" })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.metrics) setMetrics(data.metrics);
        setNotification(`Auto-scaled successfully to ${data.newTier?.maxFormatted || "next tier"}!`);
        setTimeout(() => setNotification(null), 4000);
      }
    } catch {
      setNotification("Failed to trigger auto-scale simulation.");
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setIsScaling(false);
    }
  };

  const handleOptimizeStorage = async () => {
    setIsOptimizing(true);
    try {
      const res = await fetch("/api/storage/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.metrics) setMetrics(data.metrics);
        setNotification(`Compacted storage: freed ${data.freedFormatted || "0 KB"}`);
        setTimeout(() => setNotification(null), 4000);
      }
    } catch {
      setNotification("Optimization error.");
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setIsOptimizing(false);
    }
  };

  if (!metrics && isLoading) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 animate-pulse">
        <div className="h-6 bg-slate-800 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-slate-800 rounded w-2/3"></div>
      </div>
    );
  }

  const usagePercent = metrics?.usagePercent || 0;
  const thresholdPercent = metrics?.thresholdPercent || 70;

  return (
    <div className="bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-indigo-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden">
      {/* Decorative ambient background glows */}
      <div className="absolute top-0 right-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Banner */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Auto-Scaling Active: Elastic Capacity Engine
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1">
              <Zap className="w-3 h-3 text-indigo-400" />
              {metrics?.currentTier.label || "Tier 2 (Course Scaled)"}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <HardDrive className="w-6 h-6 text-indigo-400" />
            Storage & Elastic Capacity Auto-Scaler
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Autonomous multi-tier storage allocation. As you add more files with large MBs (high-res lecture presentations, large textbook PDFs, whitepapers), the system <strong className="text-indigo-300">automatically scales its capacity tier and memory stream buffers</strong> without requiring manual reconfiguration.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleTriggerSimulatedScale}
            disabled={isScaling}
            className="px-3.5 py-2 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-200 border border-indigo-700/60 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:border-indigo-500 disabled:opacity-50"
            title="Test elastic capacity expansion without modifying current files"
          >
            <TrendingUp className={`w-4 h-4 text-indigo-400 ${isScaling ? "animate-spin" : ""}`} />
            <span>{isScaling ? "Auto-Scaling..." : "Test Scale-Up"}</span>
          </button>

          <button
            onClick={handleOptimizeStorage}
            disabled={isOptimizing}
            className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer hover:border-slate-500 disabled:opacity-50"
            title="Clean transient upload buffers and optimize storage"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isOptimizing ? "animate-spin" : ""}`} />
            <span>{isOptimizing ? "Compacting..." : "Compact & Prune"}</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Live Capacity Gauge & Progress Bar */}
      <div className="relative z-10 mt-6 bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm">Storage Allocation:</span>
            <span className="text-slate-300">
              <strong className="text-emerald-400 font-extrabold">{metrics?.usedFormatted || "0 MB"}</strong> of{" "}
              <strong className="text-white font-extrabold">{metrics?.totalCapacityFormatted || "2.0 GB"}</strong>
            </span>
            <span className="text-[11px] text-slate-400">({usagePercent}% used)</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>{metrics?.headroomFormatted || "Elastic headroom available"}</span>
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="relative w-full h-4 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
          <div
            className={`h-full transition-all duration-700 rounded-full ${
              usagePercent >= thresholdPercent
                ? "bg-gradient-to-r from-amber-500 to-rose-500 animate-pulse"
                : "bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400"
            }`}
            style={{ width: `${Math.min(100, Math.max(2, usagePercent))}%` }}
          />

          {/* 70% Auto-Scale Trigger Marker */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-amber-400/80 z-20"
            style={{ left: `${thresholdPercent}%` }}
            title={`Auto-scale trigger threshold (${thresholdPercent}%)`}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
            Base Allocation (0 MB)
          </span>

          <span className="flex items-center gap-1 text-amber-400/90 font-medium">
            <Zap className="w-3 h-3" />
            {thresholdPercent}% Auto-Scale Trigger Line (Expands tier automatically before reaching 100%)
          </span>

          <span className="flex items-center gap-1 text-slate-300 font-semibold">
            {metrics?.totalCapacityFormatted || "2.0 GB"} (Current Ceiling)
          </span>
        </div>
      </div>

      {/* 4 Feature Indicator Cards */}
      <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-3.5 space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            Current Capacity Tier
          </div>
          <div className="text-base font-bold text-white tracking-tight">
            {metrics?.currentTier.name.toUpperCase() || "TIER-2"}
          </div>
          <div className="text-[11px] text-indigo-300/80">
            {metrics?.totalCapacityFormatted} capacity allocated
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-3.5 space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Auto-Scale Policy
          </div>
          <div className="text-base font-bold text-emerald-300 tracking-tight">
            Autonomous 70%
          </div>
          <div className="text-[11px] text-slate-400">
            Triggers at {thresholdPercent}% or on large file ingress
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-3.5 space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-sky-400" />
            Stream & Heap Mode
          </div>
          <div className="text-base font-bold text-sky-300 tracking-tight truncate">
            Zero Heap Bloat
          </div>
          <div className="text-[11px] text-slate-400">
            Kernel piped • {metrics?.heapMemory.usedMB || 45} MB heap used
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-3.5 space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-purple-400" />
            Managed Documents
          </div>
          <div className="text-base font-bold text-purple-300 tracking-tight">
            {metrics?.filesCount || 0} Files
          </div>
          <div className="text-[11px] text-slate-400 truncate" title={metrics?.largestFile?.name}>
            Largest: {metrics?.largestFile?.sizeFormatted || "0 MB"}
          </div>
        </div>
      </div>

      {/* Collapsible Auto-Scaling Event Log & Audit History */}
      <div className="relative z-10 mt-5 border-t border-slate-800/80 pt-4">
        <button
          onClick={() => setShowEventLog(!showEventLog)}
          className="w-full flex items-center justify-between text-xs text-slate-300 hover:text-white font-semibold transition-colors py-1 cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Auto-Scaling Activity & Expansion Audit Log ({metrics?.events.length || 0} events)</span>
          </span>
          <span className="flex items-center gap-1 text-[11px] text-indigo-400">
            {showEventLog ? "Hide Log" : "View Scale History"}
            {showEventLog ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </span>
        </button>

        {showEventLog && (
          <div className="mt-3 space-y-2 bg-slate-950/80 border border-slate-800 rounded-2xl p-4 max-h-60 overflow-y-auto">
            {(!metrics?.events || metrics.events.length === 0) ? (
              <p className="text-xs text-slate-400 text-center py-4">No auto-scale events recorded yet.</p>
            ) : (
              metrics.events.map((ev) => (
                <div key={ev.id} className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ev.eventType === "AUTOSCALE_TRIGGER" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" :
                        ev.eventType === "TIER_UPGRADE" ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" :
                        "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      }`}>
                        {ev.eventType}
                      </span>
                      <span className="font-semibold text-white">
                        {ev.fromCapacity} → <strong className="text-emerald-300">{ev.toCapacity}</strong>
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px]">{ev.reason}</p>
                  </div>

                  <div className="text-right text-[10px] text-slate-400 shrink-0">
                    <div>{new Date(ev.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</div>
                    <div className="text-slate-500">{new Date(ev.timestamp).toLocaleDateString()}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Storage Breakdown Details */}
      {metrics?.storageBreakdown && (
        <div className="relative z-10 mt-4 pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-400"></span>
              PDFs: <strong className="text-slate-200">{metrics.storageBreakdown.pdfsFormatted}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Raw Presentations & Slides: <strong className="text-slate-200">{metrics.storageBreakdown.rawFilesFormatted}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              Slide Previews: <strong className="text-slate-200">{metrics.storageBreakdown.slidesFormatted}</strong>
            </span>
          </div>

          <div className="text-indigo-300/80 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Max single file upload: 1.0 GB
          </div>
        </div>
      )}
    </div>
  );
};
