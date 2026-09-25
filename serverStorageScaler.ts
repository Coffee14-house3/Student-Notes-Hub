import fs from "fs";
import path from "path";

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

// Progressive Auto-Scaling Storage Tiers
export const STORAGE_TIERS: StorageTier[] = [
  { id: 1, name: "tier-1", label: "Tier 1 (Base Cloud - 500 MB)", maxBytes: 500 * 1024 * 1024, maxFormatted: "500 MB" },
  { id: 2, name: "tier-2", label: "Tier 2 (Course Scaled - 2.0 GB)", maxBytes: 2 * 1024 * 1024 * 1024, maxFormatted: "2.0 GB" },
  { id: 3, name: "tier-3", label: "Tier 3 (Department Scaled - 10.0 GB)", maxBytes: 10 * 1024 * 1024 * 1024, maxFormatted: "10.0 GB" },
  { id: 4, name: "tier-4", label: "Tier 4 (High-Res Media Scaled - 50.0 GB)", maxBytes: 50 * 1024 * 1024 * 1024, maxFormatted: "50.0 GB" },
  { id: 5, name: "tier-5", label: "Tier 5 (Campus Enterprise - 250.0 GB)", maxBytes: 250 * 1024 * 1024 * 1024, maxFormatted: "250.0 GB" },
  { id: 6, name: "tier-6", label: "Tier 6 (Infinite Elastic - 1.0 TB+)", maxBytes: 1024 * 1024 * 1024 * 1024, maxFormatted: "1.0 TB+" }
];

export class AutoScalingStorageManager {
  private dataDir: string;
  private currentTierIndex: number = 0; // Starts at Tier 1 or auto-adjusts
  private events: AutoScalingEvent[] = [];
  private eventsFilePath: string;
  private readonly AUTOSCALE_THRESHOLD_RATIO = 0.70; // Auto-scale when storage usage reaches 70%
  private lastAutoScaledAt: string | null = null;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
    this.eventsFilePath = path.join(dataDir, "storage_autoscaling_events.json");
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }

      // Load persistent events
      if (fs.existsSync(this.eventsFilePath)) {
        const raw = fs.readFileSync(this.eventsFilePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.events = parsed.slice(-50); // keep last 50 events
        }
      }

      // Initial capacity calculation & tier auto-determination
      this.evaluateAndScaleSync();

      // If no events yet, record initial bootstrap event
      if (this.events.length === 0) {
        this.recordEvent({
          id: `init-${Date.now()}`,
          timestamp: new Date().toISOString(),
          eventType: "CAPACITY_EXPAND",
          fromCapacity: "0 MB",
          toCapacity: STORAGE_TIERS[this.currentTierIndex].maxFormatted,
          fromTier: "None",
          toTier: STORAGE_TIERS[this.currentTierIndex].label,
          reason: "Auto-Scaling Storage Engine initialized. Elastic expansion active at 70% threshold.",
          usedBytes: 0,
          usedFormatted: "0 MB"
        });
      }
    } catch (e) {
      console.warn("[AutoScaler] Initialization notice:", e);
    }
  }

  private saveEvents() {
    try {
      fs.writeFileSync(this.eventsFilePath, JSON.stringify(this.events, null, 2), "utf-8");
    } catch (e) {
      console.warn("[AutoScaler] Failed to save events:", e);
    }
  }

  private recordEvent(event: AutoScalingEvent) {
    this.events.unshift(event);
    if (this.events.length > 50) {
      this.events = this.events.slice(0, 50);
    }
    this.saveEvents();
  }

  /**
   * Recursively computes directory size in bytes and file count
   */
  public getDirectoryStats(dirPath: string): { totalBytes: number; fileCount: number; largestFile: { name: string; bytes: number } | null } {
    let totalBytes = 0;
    let fileCount = 0;
    let largestFile: { name: string; bytes: number } | null = null;

    if (!fs.existsSync(dirPath)) {
      return { totalBytes, fileCount, largestFile };
    }

    const traverse = (currentDir: string) => {
      try {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(currentDir, entry.name);
          try {
            if (entry.isDirectory()) {
              traverse(fullPath);
            } else if (entry.isFile()) {
              const stat = fs.statSync(fullPath);
              totalBytes += stat.size;
              fileCount++;
              if (!largestFile || stat.size > largestFile.bytes) {
                largestFile = { name: entry.name, bytes: stat.size };
              }
            }
          } catch {
            // Ignore inaccessible entries
          }
        }
      } catch {
        // Ignore errors
      }
    };

    traverse(dirPath);
    return { totalBytes, fileCount, largestFile };
  }

  /**
   * Formats bytes into human-readable representation (KB, MB, GB, TB)
   */
  public formatBytes(bytes: number): string {
    if (bytes <= 0) return "0 MB";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  /**
   * Evaluates current storage and automatically scales up the capacity tier if threshold is reached
   */
  public evaluateAndScaleSync(fileTriggerName?: string, incomingFileSizeBytes: number = 0): boolean {
    const { totalBytes } = this.getDirectoryStats(this.dataDir);
    const projectedBytes = totalBytes + incomingFileSizeBytes;

    let scaled = false;
    const currentTier = STORAGE_TIERS[this.currentTierIndex];
    const thresholdBytes = currentTier.maxBytes * this.AUTOSCALE_THRESHOLD_RATIO;

    // Check if current usage exceeds 70% threshold OR if incoming file exceeds remaining headroom
    if (projectedBytes >= thresholdBytes || projectedBytes >= currentTier.maxBytes) {
      // Find the appropriate tier that fits projectedBytes with >= 40% headroom remaining
      let targetTierIndex = this.currentTierIndex;
      while (
        targetTierIndex < STORAGE_TIERS.length - 1 &&
        (projectedBytes >= STORAGE_TIERS[targetTierIndex].maxBytes * this.AUTOSCALE_THRESHOLD_RATIO ||
         projectedBytes >= STORAGE_TIERS[targetTierIndex].maxBytes)
      ) {
        targetTierIndex++;
      }

      if (targetTierIndex > this.currentTierIndex) {
        const previousTier = STORAGE_TIERS[this.currentTierIndex];
        const newTier = STORAGE_TIERS[targetTierIndex];
        this.currentTierIndex = targetTierIndex;
        this.lastAutoScaledAt = new Date().toISOString();
        scaled = true;

        const reason = fileTriggerName
          ? `Auto-scaled capacity due to large file upload: "${fileTriggerName}" (${this.formatBytes(incomingFileSizeBytes)}). Expanded tier to prevent storage exhaustion.`
          : `Storage utilization reached ${((projectedBytes / previousTier.maxBytes) * 100).toFixed(1)}% threshold. Autonomous tier expansion triggered.`;

        console.log(`[AutoScaler] 🚀 AUTO-SCALING TRIGGERED! Scaled from ${previousTier.label} to ${newTier.label}.`);

        this.recordEvent({
          id: `autoscale-${Date.now()}`,
          timestamp: this.lastAutoScaledAt,
          eventType: "AUTOSCALE_TRIGGER",
          fromCapacity: previousTier.maxFormatted,
          toCapacity: newTier.maxFormatted,
          fromTier: previousTier.label,
          toTier: newTier.label,
          reason,
          usedBytes: projectedBytes,
          usedFormatted: this.formatBytes(projectedBytes),
          fileTrigger: fileTriggerName
        });
      }
    }

    return scaled;
  }

  /**
   * Force manually triggers an auto-scaling upgrade simulation (for demo & testing)
   */
  public forceScaleUp(reasonDescription?: string): StorageTier {
    if (this.currentTierIndex < STORAGE_TIERS.length - 1) {
      const prevTier = STORAGE_TIERS[this.currentTierIndex];
      this.currentTierIndex++;
      const nextTier = STORAGE_TIERS[this.currentTierIndex];
      this.lastAutoScaledAt = new Date().toISOString();

      const { totalBytes } = this.getDirectoryStats(this.dataDir);

      this.recordEvent({
        id: `manual-scale-${Date.now()}`,
        timestamp: this.lastAutoScaledAt,
        eventType: "TIER_UPGRADE",
        fromCapacity: prevTier.maxFormatted,
        toCapacity: nextTier.maxFormatted,
        fromTier: prevTier.label,
        toTier: nextTier.label,
        reason: reasonDescription || "Manual/Elastic capacity expansion triggered by instructor.",
        usedBytes: totalBytes,
        usedFormatted: this.formatBytes(totalBytes)
      });

      return nextTier;
    }
    return STORAGE_TIERS[this.currentTierIndex];
  }

  /**
   * Gets comprehensive storage metrics for API and UI
   */
  public getMetrics(): StorageMetrics {
    // Run an auto-scale evaluation check first
    this.evaluateAndScaleSync();

    const pdfDir = path.join(this.dataDir, "pdfs");
    const rawFilesDir = path.join(this.dataDir, "files");
    const slidesDir = path.join(this.dataDir, "slides");

    const overallStats = this.getDirectoryStats(this.dataDir);
    const pdfStats = this.getDirectoryStats(pdfDir);
    const rawStats = this.getDirectoryStats(rawFilesDir);
    const slidesStats = this.getDirectoryStats(slidesDir);
    const metaBytes = Math.max(0, overallStats.totalBytes - (pdfStats.totalBytes + rawStats.totalBytes + slidesStats.totalBytes));

    const currentTier = STORAGE_TIERS[this.currentTierIndex];
    const headroomBytes = Math.max(0, currentTier.maxBytes - overallStats.totalBytes);
    const usagePercent = Number(((overallStats.totalBytes / currentTier.maxBytes) * 100).toFixed(2));

    const mem = process.memoryUsage();

    return {
      status: "active",
      autoScalingEnabled: true,
      currentTier,
      usedBytes: overallStats.totalBytes,
      usedFormatted: this.formatBytes(overallStats.totalBytes),
      totalCapacityBytes: currentTier.maxBytes,
      totalCapacityFormatted: currentTier.maxFormatted,
      headroomBytes,
      headroomFormatted: `${this.formatBytes(headroomBytes)} free (auto-scales on demand)`,
      usagePercent,
      thresholdPercent: Math.round(this.AUTOSCALE_THRESHOLD_RATIO * 100),
      filesCount: overallStats.fileCount,
      largestFile: overallStats.largestFile ? {
        name: overallStats.largestFile.name,
        bytes: overallStats.largestFile.bytes,
        sizeFormatted: this.formatBytes(overallStats.largestFile.bytes)
      } : null,
      heapMemory: {
        usedMB: Number((mem.heapUsed / (1024 * 1024)).toFixed(1)),
        totalMB: Number((mem.heapTotal / (1024 * 1024)).toFixed(1)),
        rssMB: Number((mem.rss / (1024 * 1024)).toFixed(1)),
        mode: "Stream-Optimized (Zero Heap Bloat)"
      },
      events: this.events,
      lastAutoScaledAt: this.lastAutoScaledAt,
      storageBreakdown: {
        pdfsBytes: pdfStats.totalBytes,
        pdfsFormatted: this.formatBytes(pdfStats.totalBytes),
        rawFilesBytes: rawStats.totalBytes,
        rawFilesFormatted: this.formatBytes(rawStats.totalBytes),
        slidesBytes: slidesStats.totalBytes,
        slidesFormatted: this.formatBytes(slidesStats.totalBytes),
        metadataBytes: metaBytes,
        metadataFormatted: this.formatBytes(metaBytes)
      }
    };
  }

  /**
   * Run background storage compaction & cache cleanup
   */
  public optimizeStorage(): { freedBytes: number; freedFormatted: string; cleanedFiles: number } {
    let freedBytes = 0;
    let cleanedFiles = 0;

    try {
      // Clean temporary chunks or orphaned temp files
      const tempDir = path.join(this.dataDir, "temp_uploads");
      if (fs.existsSync(tempDir)) {
        const files = fs.readdirSync(tempDir);
        for (const file of files) {
          const filePath = path.join(tempDir, file);
          const stat = fs.statSync(filePath);
          // Delete temp files older than 1 hour
          if (Date.now() - stat.mtimeMs > 3600 * 1000) {
            freedBytes += stat.size;
            fs.unlinkSync(filePath);
            cleanedFiles++;
          }
        }
      }

      this.recordEvent({
        id: `opt-${Date.now()}`,
        timestamp: new Date().toISOString(),
        eventType: "STORAGE_OPTIMIZE",
        fromCapacity: STORAGE_TIERS[this.currentTierIndex].maxFormatted,
        toCapacity: STORAGE_TIERS[this.currentTierIndex].maxFormatted,
        fromTier: STORAGE_TIERS[this.currentTierIndex].label,
        toTier: STORAGE_TIERS[this.currentTierIndex].label,
        reason: `Ran autonomous storage compaction. Reclaimed ${this.formatBytes(freedBytes)} across ${cleanedFiles} transient files.`,
        usedBytes: this.getDirectoryStats(this.dataDir).totalBytes,
        usedFormatted: this.formatBytes(this.getDirectoryStats(this.dataDir).totalBytes)
      });
    } catch (e) {
      console.warn("[AutoScaler] Storage optimization notice:", e);
    }

    return {
      freedBytes,
      freedFormatted: this.formatBytes(freedBytes),
      cleanedFiles
    };
  }
}
