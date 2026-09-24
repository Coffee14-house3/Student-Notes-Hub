import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const docId = "upload-1790224763390";
const targetDir = path.join(rootDir, "data", "slides", docId);

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

function escapeXml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const orangeIconSvg = `
  <rect width="52" height="52" rx="12" fill="#f97316" fill-opacity="0.18" stroke="#f97316" stroke-width="2"/>
  <circle cx="26" cy="26" r="10" fill="#f97316"/>
`;

const serverIconSvg = `
  <rect width="52" height="52" rx="12" fill="#f97316" fill-opacity="0.18" stroke="#f97316" stroke-width="2"/>
  <rect x="15" y="16" width="22" height="6" rx="2" fill="#f97316"/>
  <rect x="15" y="24" width="22" height="6" rx="2" fill="#f97316"/>
  <rect x="15" y="32" width="22" height="6" rx="2" fill="#f97316"/>
`;

const checkIconSvg = `
  <rect width="52" height="52" rx="12" fill="#f97316" fill-opacity="0.18" stroke="#f97316" stroke-width="2"/>
  <path d="M18 26 L23 31 L34 20" stroke="#f97316" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
`;

const slides = [
  // Slide 1
  `
  <svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0b1329"/>
        <stop offset="100%" stop-color="#080d1e"/>
      </linearGradient>
      <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f97316" stop-opacity="0.2"/>
        <stop offset="100%" stop-color="#f97316" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect width="1920" height="1080" fill="url(#bg)"/>
    <circle cx="1600" cy="200" r="400" fill="url(#glow)"/>
    
    <!-- Header pill -->
    <rect x="120" y="160" width="360" height="44" rx="22" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
    <text x="145" y="188" fill="#f97316" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="16" letter-spacing="2">AWS INFRASTRUCTURE RESILIENCE</text>
    
    <!-- Title -->
    <text x="120" y="320" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="82" letter-spacing="-1">HIGH AVAILABILITY ON AWS</text>
    <text x="120" y="410" fill="#f97316" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="44">Auto-Scaling &amp; Multi-AZ Recovery</text>

    <!-- Subtitle card -->
    <rect x="120" y="480" width="1680" height="240" rx="20" fill="#131c33" stroke="#233052" stroke-width="2"/>
    <text x="170" y="560" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-weight="500" font-size="28">CORE ARCHITECTURAL CHALLENGE</text>
    <text x="170" y="620" fill="#f8fafc" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="34">Keeping a virtual server running — and what happens to its data —</text>
    <text x="170" y="675" fill="#f8fafc" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="34">when an entire availability zone goes down.</text>

    <!-- Bottom information bar -->
    <rect x="0" y="1010" width="1920" height="70" fill="#080c17" stroke="#17223b" stroke-width="1"/>
    <text x="120" y="1052" fill="#64748b" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="18" letter-spacing="1">AUTO-SCALING &amp; MULTI-AZ RECOVERY</text>
    <text x="1800" y="1052" fill="#f97316" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="20">1</text>
  </svg>
  `,

  // Slide 2
  `
  <svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
    <rect width="1920" height="1080" fill="#0b1329"/>
    
    <text x="120" y="140" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="20" letter-spacing="3">FOUNDATIONS</text>
    <text x="120" y="210" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="64">THE BASICS: WHAT AUTO-SCALING DOES</text>

    <!-- 3 Cards -->
    <g transform="translate(120, 280)">
      <!-- Card 1 -->
      <rect x="0" y="0" width="530" height="640" rx="20" fill="#131c33" stroke="#233052" stroke-width="2"/>
      <g transform="translate(40, 45)">${serverIconSvg}</g>
      <text x="40" y="160" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="32">Multiple Subnets</text>
      <line x1="40" y1="185" x2="160" y2="185" stroke="#f97316" stroke-width="3"/>
      <text x="40" y="240" fill="#cbd5e1" font-family="system-ui, -apple-system, sans-serif" font-weight="400" font-size="24" width="450">
        <tspan x="40" dy="0">Auto-scaling can start EC2</tspan>
        <tspan x="40" dy="40">instances across several subnets,</tspan>
        <tspan x="40" dy="40">not just a single subnet.</tspan>
      </text>

      <!-- Card 2 -->
      <rect x="575" y="0" width="530" height="640" rx="20" fill="#131c33" stroke="#233052" stroke-width="2"/>
      <g transform="translate(615, 45)">${orangeIconSvg}</g>
      <text x="615" y="160" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="32">Automatic Failover</text>
      <line x1="615" y1="185" x2="735" y2="185" stroke="#f97316" stroke-width="3"/>
      <text x="615" y="240" fill="#cbd5e1" font-family="system-ui, -apple-system, sans-serif" font-weight="400" font-size="24">
        <tspan x="615" dy="0">If an entire availability zone has</tspan>
        <tspan x="615" dy="40">an outage, a new virtual server</tspan>
        <tspan x="615" dy="40">can be launched automatically into</tspan>
        <tspan x="615" dy="40">another subnet in another zone.</tspan>
      </text>

      <!-- Card 3 -->
      <rect x="1150" y="0" width="530" height="640" rx="20" fill="#131c33" stroke="#233052" stroke-width="2"/>
      <g transform="translate(1190, 45)">${checkIconSvg}</g>
      <text x="1190" y="160" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="32">Continuous Monitoring</text>
      <line x1="1190" y1="185" x2="1310" y2="185" stroke="#f97316" stroke-width="3"/>
      <text x="1190" y="240" fill="#cbd5e1" font-family="system-ui, -apple-system, sans-serif" font-weight="400" font-size="24">
        <tspan x="1190" dy="0">Auto-scaling watches the health</tspan>
        <tspan x="1190" dy="40">of running servers and reacts</tspan>
        <tspan x="1190" dy="40">immediately when something</tspan>
        <tspan x="1190" dy="40">goes wrong in the pool.</tspan>
      </text>
    </g>

    <!-- Bottom information bar -->
    <rect x="0" y="1010" width="1920" height="70" fill="#080c17" stroke="#17223b" stroke-width="1"/>
    <text x="120" y="1052" fill="#64748b" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="18" letter-spacing="1">AUTO-SCALING &amp; MULTI-AZ RECOVERY</text>
    <text x="1800" y="1052" fill="#f97316" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="20">2</text>
  </svg>
  `,

  // Slide 3: EXACTLY as requested: dark navy background, four concept cards, orange icons, headings, descriptions, bottom info bar
  `
  <svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
    <rect width="1920" height="1080" fill="#0b1329"/>
    
    <text x="120" y="130" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="18" letter-spacing="3">ARCHITECTURE CONFIGURATION</text>
    <text x="120" y="200" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="64">SETTING IT UP</text>

    <!-- 4 Concept Cards Grid (2x2) -->
    <g transform="translate(120, 260)">
      <!-- Card 1: Launch Configuration -->
      <rect x="0" y="0" width="810" height="320" rx="20" fill="#131c33" stroke="#233052" stroke-width="2"/>
      <g transform="translate(40, 35)">${orangeIconSvg}</g>
      <text x="110" y="65" fill="#f97316" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="16" letter-spacing="2">COMPONENT 01</text>
      <text x="110" y="98" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="28">Launch Configuration: Blueprint</text>
      <text x="40" y="165" fill="#e2e8f0" font-family="system-ui, -apple-system, sans-serif" font-weight="500" font-size="22">Everything needed to launch a single virtual server:</text>
      <circle cx="55" cy="215" r="5" fill="#f97316"/>
      <text x="75" y="222" fill="#cbd5e1" font-family="system-ui, -apple-system, sans-serif" font-size="22">Image (AMI) to start the new server from</text>
      <circle cx="55" cy="265" r="5" fill="#f97316"/>
      <text x="75" y="272" fill="#cbd5e1" font-family="system-ui, -apple-system, sans-serif" font-size="22">Storage, key pairs, security groups &amp; user data</text>

      <!-- Card 2: Instance Type -->
      <rect x="870" y="0" width="810" height="320" rx="20" fill="#131c33" stroke="#233052" stroke-width="2"/>
      <g transform="translate(910, 35)">${serverIconSvg}</g>
      <text x="980" y="65" fill="#f97316" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="16" letter-spacing="2">COMPONENT 02</text>
      <text x="980" y="98" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="28">Instance Type &amp; Sizing</text>
      <text x="910" y="165" fill="#e2e8f0" font-family="system-ui, -apple-system, sans-serif" font-weight="500" font-size="22">The computational capacity of the virtual server:</text>
      <circle cx="925" cy="215" r="5" fill="#f97316"/>
      <text x="945" y="222" fill="#cbd5e1" font-family="system-ui, -apple-system, sans-serif" font-size="22">vCPU count and RAM allocation based on workload</text>
      <circle cx="925" cy="265" r="5" fill="#f97316"/>
      <text x="945" y="272" fill="#cbd5e1" font-family="system-ui, -apple-system, sans-serif" font-size="22">EBS-optimized bandwidth and networking performance</text>

      <!-- Card 3: Auto-Scaling Group -->
      <rect x="0" y="360" width="810" height="340" rx="20" fill="#131c33" stroke="#233052" stroke-width="2"/>
      <g transform="translate(40, 395)">${orangeIconSvg}</g>
      <text x="110" y="425" fill="#f97316" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="16" letter-spacing="2">COMPONENT 03</text>
      <text x="110" y="458" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="28">Auto-Scaling Group: Fleet Manager</text>
      <text x="40" y="525" fill="#e2e8f0" font-family="system-ui, -apple-system, sans-serif" font-weight="500" font-size="22">Tells EC2 how many servers to run and where:</text>
      <circle cx="55" cy="575" r="5" fill="#f97316"/>
      <text x="75" y="582" fill="#cbd5e1" font-family="system-ui, -apple-system, sans-serif" font-size="22">Min / max / desired number of virtual servers</text>
      <circle cx="55" cy="625" r="5" fill="#f97316"/>
      <text x="75" y="632" fill="#cbd5e1" font-family="system-ui, -apple-system, sans-serif" font-size="22">Subnets across multiple AZs to launch servers in</text>

      <!-- Card 4: Health Checks -->
      <rect x="870" y="360" width="810" height="340" rx="20" fill="#131c33" stroke="#233052" stroke-width="2"/>
      <g transform="translate(910, 395)">${checkIconSvg}</g>
      <text x="980" y="425" fill="#f97316" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="16" letter-spacing="2">COMPONENT 04</text>
      <text x="980" y="458" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="28">Health Checks &amp; Lifecycle</text>
      <text x="910" y="525" fill="#e2e8f0" font-family="system-ui, -apple-system, sans-serif" font-weight="500" font-size="22">Automatic failure detection and instance recycling:</text>
      <circle cx="925" cy="575" r="5" fill="#f97316"/>
      <text x="945" y="582" fill="#cbd5e1" font-family="system-ui, -apple-system, sans-serif" font-size="22">EC2 status checks and ELB application health checks</text>
      <circle cx="925" cy="625" r="5" fill="#f97316"/>
      <text x="945" y="632" fill="#cbd5e1" font-family="system-ui, -apple-system, sans-serif" font-size="22">Grace period management during boot time</text>
    </g>

    <!-- Bottom information bar -->
    <rect x="0" y="1010" width="1920" height="70" fill="#080c17" stroke="#17223b" stroke-width="1"/>
    <text x="120" y="1052" fill="#64748b" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="18" letter-spacing="1">AUTO-SCALING &amp; MULTI-AZ RECOVERY</text>
    <text x="1800" y="1052" fill="#f97316" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="20">3</text>
  </svg>
  `,

  // Slide 4: Putting it together
  `
  <svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
    <rect width="1920" height="1080" fill="#0b1329"/>
    
    <text x="120" y="130" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="18" letter-spacing="3">WORKFLOW &amp; EXECUTION</text>
    <text x="120" y="200" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="64">PUTTING IT TOGETHER</text>

    <!-- Diagram Flow -->
    <g transform="translate(120, 270)">
      <rect x="0" y="0" width="1680" height="660" rx="20" fill="#131c33" stroke="#233052" stroke-width="2"/>
      
      <!-- Stage 1 -->
      <rect x="60" y="60" width="460" height="540" rx="16" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
      <g transform="translate(100, 100)">${orangeIconSvg}</g>
      <text x="100" y="200" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="28">1. Configuration</text>
      <text x="100" y="250" fill="#cbd5e1" font-family="system-ui, -apple-system, sans-serif" font-size="20">
        <tspan x="100" dy="0">• Launch Configuration defines</tspan>
        <tspan x="100" dy="35">  AMI, size, storage &amp; security</tspan>
        <tspan x="100" dy="45">• Auto-scaling group assigns</tspan>
        <tspan x="100" dy="35">  multi-AZ subnets &amp; limits</tspan>
      </text>

      <!-- Arrow 1 -->
      <path d="M550 330 L590 330" stroke="#f97316" stroke-width="4" stroke-linecap="round"/>

      <!-- Stage 2 -->
      <rect x="610" y="60" width="460" height="540" rx="16" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
      <g transform="translate(650, 100)">${checkIconSvg}</g>
      <text x="650" y="200" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="28">2. Health Monitoring</text>
      <text x="650" y="250" fill="#cbd5e1" font-family="system-ui, -apple-system, sans-serif" font-size="20">
        <tspan x="650" dy="0">• Continuous health ping</tspan>
        <tspan x="650" dy="35">  to instances every 30s</tspan>
        <tspan x="650" dy="45">• Zone outage immediately</tspan>
        <tspan x="650" dy="35">  marks instances unhealthy</tspan>
      </text>

      <!-- Arrow 2 -->
      <path d="M1100 330 L1140 330" stroke="#f97316" stroke-width="4" stroke-linecap="round"/>

      <!-- Stage 3 -->
      <rect x="1160" y="60" width="460" height="540" rx="16" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
      <g transform="translate(1200, 100)">${serverIconSvg}</g>
      <text x="1200" y="200" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="28">3. Automatic Failover</text>
      <text x="1200" y="250" fill="#cbd5e1" font-family="system-ui, -apple-system, sans-serif" font-size="20">
        <tspan x="1200" dy="0">• New instance booted in</tspan>
        <tspan x="1200" dy="35">  healthy alternative AZ</tspan>
        <tspan x="1200" dy="45">• Desired capacity restored</tspan>
        <tspan x="1200" dy="35">  without manual intervention</tspan>
      </text>
    </g>

    <!-- Bottom information bar -->
    <rect x="0" y="1010" width="1920" height="70" fill="#080c17" stroke="#17223b" stroke-width="1"/>
    <text x="120" y="1052" fill="#64748b" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="18" letter-spacing="1">AUTO-SCALING &amp; MULTI-AZ RECOVERY</text>
    <text x="1800" y="1052" fill="#f97316" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="20">4</text>
  </svg>
  `,

  // Slide 5: Two Different Recovery Mechanisms
  `
  <svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
    <rect width="1920" height="1080" fill="#0b1329"/>
    
    <text x="120" y="130" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="18" letter-spacing="3">COMPARATIVE ANALYSIS</text>
    <text x="120" y="200" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="58">TWO DIFFERENT RECOVERY MECHANISMS</text>

    <!-- 2 Comparison Columns -->
    <g transform="translate(120, 270)">
      <!-- Left Column: CloudWatch Alarm -->
      <rect x="0" y="0" width="810" height="660" rx="20" fill="#131c33" stroke="#233052" stroke-width="2"/>
      <g transform="translate(50, 45)">${orangeIconSvg}</g>
      <text x="120" y="75" fill="#f97316" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="16">SAME AZ ONLY</text>
      <text x="120" y="110" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="34">CloudWatch Alarm Recovery</text>
      <text x="50" y="180" fill="#cbd5e1" font-family="system-ui, -apple-system, sans-serif" font-size="22">
        <tspan x="50" dy="0">• Launches an identical copy of the failed virtual server</tspan>
        <tspan x="50" dy="40">• Recovers ONLY in the same Availability Zone</tspan>
        <tspan x="50" dy="50" font-weight="700" fill="#f97316">Why only the same zone?</tspan>
        <tspan x="50" dy="40">• The private IP address and the EBS volume</tspan>
        <tspan x="50" dy="35">  are hard-bound to a single subnet and zone.</tspan>
        <tspan x="50" dy="50">• FAILS if an entire AZ suffers a catastrophic outage.</tspan>
      </text>

      <!-- Right Column: Auto-Scaling Failover -->
      <rect x="870" y="0" width="810" height="660" rx="20" fill="#131c33" stroke="#233052" stroke-width="2"/>
      <g transform="translate(920, 45)">${serverIconSvg}</g>
      <text x="990" y="75" fill="#10b981" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="16">MULTI-AZ RESILIENT</text>
      <text x="990" y="110" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="34">Auto-Scaling Failover</text>
      <text x="920" y="180" fill="#cbd5e1" font-family="system-ui, -apple-system, sans-serif" font-size="22">
        <tspan x="920" dy="0">• Recovers the failed virtual server into a completely</tspan>
        <tspan x="920" dy="35">  different Availability Zone.</tspan>
        <tspan x="920" dy="45">• Provides TRUE protection against data center outages.</tspan>
        <tspan x="920" dy="50" font-weight="700" fill="#f97316">Production Example: Jenkins CI Server</tspan>
        <tspan x="920" dy="40">• If a team relies on Jenkins to test, build &amp; deploy,</tspan>
        <tspan x="920" dy="35">  auto-scaling migrates execution into another zone</tspan>
        <tspan x="920" dy="35">  instead of remaining offline during an outage.</tspan>
      </text>
    </g>

    <!-- Bottom information bar -->
    <rect x="0" y="1010" width="1920" height="70" fill="#080c17" stroke="#17223b" stroke-width="1"/>
    <text x="120" y="1052" fill="#64748b" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="18" letter-spacing="1">AUTO-SCALING &amp; MULTI-AZ RECOVERY</text>
    <text x="1800" y="1052" fill="#f97316" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="20">5</text>
  </svg>
  `,

  // Slide 6: Read Before You Rely On Auto-Scaling
  `
  <svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
    <rect width="1920" height="1080" fill="#0b1329"/>
    
    <text x="120" y="130" fill="#ef4444" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="18" letter-spacing="3">CRITICAL ARCHITECTURAL PITFALL</text>
    <text x="120" y="200" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="56">PITFALL: NETWORK-ATTACHED STORAGE</text>

    <!-- Architecture Diagram Box -->
    <g transform="translate(120, 270)">
      <rect x="0" y="0" width="1680" height="660" rx="20" fill="#131c33" stroke="#ef4444" stroke-width="2"/>
      
      <!-- Zone A Box -->
      <rect x="80" y="60" width="680" height="540" rx="16" fill="#0f172a" stroke="#334155" stroke-width="2"/>
      <text x="120" y="120" fill="#f97316" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="28">Availability Zone A (Outage!)</text>
      
      <rect x="120" y="160" width="600" height="140" rx="12" fill="#1e293b"/>
      <text x="160" y="220" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="26">EC2 Virtual Server (Dead)</text>
      <text x="160" y="260" fill="#ef4444" font-family="system-ui, -apple-system, sans-serif" font-size="18">Failed due to power/hardware fault in AZ-A</text>

      <rect x="120" y="340" width="600" height="140" rx="12" fill="#1e293b" stroke="#f97316" stroke-width="1.5"/>
      <text x="160" y="400" fill="#f97316" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="26">Original EBS Volume (Trapped)</text>
      <text x="160" y="440" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="18">EBS volume is bound to AZ-A; cannot attach across zones!</text>

      <!-- Arrow Between Zones -->
      <path d="M780 330 L880 330" stroke="#f97316" stroke-width="4" stroke-dasharray="8 8"/>

      <!-- Zone B Box -->
      <rect x="900" y="60" width="700" height="540" rx="16" fill="#0f172a" stroke="#10b981" stroke-width="2"/>
      <text x="940" y="120" fill="#10b981" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="28">Availability Zone B (Recovered)</text>

      <rect x="940" y="160" width="620" height="140" rx="12" fill="#1e293b"/>
      <text x="980" y="220" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="26">New EC2 Virtual Server</text>
      <text x="980" y="260" fill="#10b981" font-family="system-ui, -apple-system, sans-serif" font-size="18">Auto-scaling successfully started instance in AZ-B</text>

      <rect x="940" y="340" width="620" height="140" rx="12" fill="#1e293b" stroke="#ef4444" stroke-width="2"/>
      <text x="980" y="400" fill="#ef4444" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="26">New and EMPTY EBS Volume!</text>
      <text x="980" y="440" fill="#e2e8f0" font-family="system-ui, -apple-system, sans-serif" font-size="18">Data from Zone A is NOT attached! Jenkins has zero builds.</text>
    </g>

    <!-- Bottom information bar -->
    <rect x="0" y="1010" width="1920" height="70" fill="#080c17" stroke="#17223b" stroke-width="1"/>
    <text x="120" y="1052" fill="#64748b" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="18" letter-spacing="1">AUTO-SCALING &amp; MULTI-AZ RECOVERY</text>
    <text x="1800" y="1052" fill="#f97316" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="20">6</text>
  </svg>
  `,

  // Slide 7: Fixing The Pitfall
  `
  <svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
    <rect width="1920" height="1080" fill="#0b1329"/>
    
    <text x="120" y="130" fill="#10b981" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="18" letter-spacing="3">SOLUTIONS &amp; STRATEGIES</text>
    <text x="120" y="200" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="58">THREE WAYS TO RECOVER YOUR DATA</text>

    <!-- 3 Solution Cards -->
    <g transform="translate(120, 270)">
      <!-- Card 1 -->
      <rect x="0" y="0" width="530" height="660" rx="20" fill="#131c33" stroke="#233052" stroke-width="2"/>
      <g transform="translate(40, 45)">${orangeIconSvg}</g>
      <text x="110" y="75" fill="#f97316" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="16">OPTION 01</text>
      <text x="40" y="160" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="30">Multi-AZ Managed Service</text>
      <text x="40" y="230" fill="#cbd5e1" font-family="system-ui, -apple-system, sans-serif" font-size="22">
        <tspan x="40" dy="0">• Use Amazon RDS Multi-AZ,</tspan>
        <tspan x="40" dy="35">  DynamoDB, or S3.</tspan>
        <tspan x="40" dy="45">• AWS handles synchronous</tspan>
        <tspan x="40" dy="35">  data replication and DNS</tspan>
        <tspan x="40" dy="35">  failover automatically.</tspan>
        <tspan x="40" dy="45">• Zero maintenance burden.</tspan>
      </text>

      <!-- Card 2 -->
      <rect x="575" y="0" width="530" height="660" rx="20" fill="#131c33" stroke="#f97316" stroke-width="2.5"/>
      <g transform="translate(615, 45)">${serverIconSvg}</g>
      <text x="685" y="75" fill="#f97316" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="16">OPTION 02 • RECOMMENDED</text>
      <text x="615" y="160" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="30">EBS Snapshots</text>
      <text x="615" y="230" fill="#cbd5e1" font-family="system-ui, -apple-system, sans-serif" font-size="22">
        <tspan x="615" dy="0">• Snapshot EBS volume periodically.</tspan>
        <tspan x="615" dy="45">• Snapshots are stored in S3,</tspan>
        <tspan x="615" dy="35">  making them available across all</tspan>
        <tspan x="615" dy="35">  Availability Zones in the region.</tspan>
        <tspan x="615" dy="45">• Restore new EBS volume from</tspan>
        <tspan x="615" dy="35">  the snapshot in Zone B on boot.</tspan>
      </text>

      <!-- Card 3 -->
      <rect x="1150" y="0" width="530" height="660" rx="20" fill="#131c33" stroke="#233052" stroke-width="2"/>
      <g transform="translate(1190, 45)">${checkIconSvg}</g>
      <text x="1260" y="75" fill="#f97316" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="16">OPTION 03</text>
      <text x="1190" y="160" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="30">Distributed Storage</text>
      <text x="1190" y="230" fill="#cbd5e1" font-family="system-ui, -apple-system, sans-serif" font-size="22">
        <tspan x="1190" dy="0">• GlusterFS, DRBD, Ceph,</tspan>
        <tspan x="1190" dy="35">  or MongoDB replica sets.</tspan>
        <tspan x="1190" dy="45">• Replicates data directly</tspan>
        <tspan x="1190" dy="35">  across AZ instances.</tspan>
        <tspan x="1190" dy="45">• Very powerful, but introduces</tspan>
        <tspan x="1190" dy="35">  high operational complexity.</tspan>
      </text>
    </g>

    <!-- Bottom information bar -->
    <rect x="0" y="1010" width="1920" height="70" fill="#080c17" stroke="#17223b" stroke-width="1"/>
    <text x="120" y="1052" fill="#64748b" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="18" letter-spacing="1">AUTO-SCALING &amp; MULTI-AZ RECOVERY</text>
    <text x="1800" y="1052" fill="#f97316" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="20">7</text>
  </svg>
  `,

  // Slide 8: Worked Example (Jenkins)
  `
  <svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
    <rect width="1920" height="1080" fill="#0b1329"/>
    
    <text x="120" y="130" fill="#f97316" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="18" letter-spacing="3">CASE STUDY IN PRODUCTION</text>
    <text x="120" y="200" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="56">RECOVERY STRATEGY FOR JENKINS</text>

    <!-- 4 Decision Steps -->
    <g transform="translate(120, 270)">
      <!-- Step 1 -->
      <rect x="0" y="0" width="390" height="660" rx="16" fill="#131c33" stroke="#233052" stroke-width="2"/>
      <circle cx="60" cy="60" r="24" fill="#f97316"/>
      <text x="52" y="69" fill="#0b1329" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="26">1</text>
      <text x="35" y="140" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="26">The Constraint</text>
      <text x="35" y="200" fill="#cbd5e1" font-family="system-ui, -apple-system, sans-serif" font-size="20">
        <tspan x="35" dy="0">Jenkins stores all build</tspan>
        <tspan x="35" dy="30">configs and historical</tspan>
        <tspan x="35" dy="30">logs on the local disk.</tspan>
        <tspan x="35" dy="45">If the disk is lost,</tspan>
        <tspan x="35" dy="30">pipeline configs are lost.</tspan>
      </text>

      <!-- Step 2 -->
      <rect x="430" y="0" width="390" height="660" rx="16" fill="#131c33" stroke="#233052" stroke-width="2"/>
      <circle cx="490" cy="60" r="24" fill="#64748b"/>
      <text x="482" y="69" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="26">2</text>
      <text x="465" y="140" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="26">Plain EBS Limit</text>
      <text x="465" y="200" fill="#cbd5e1" font-family="system-ui, -apple-system, sans-serif" font-size="20">
        <tspan x="465" dy="0">An EBS volume exists</tspan>
        <tspan x="465" dy="30">only in one single AZ.</tspan>
        <tspan x="465" dy="45">When that AZ dies,</tspan>
        <tspan x="465" dy="30">the EBS volume cannot</tspan>
        <tspan x="465" dy="30">be accessed in Zone B.</tspan>
      </text>

      <!-- Step 3 -->
      <rect x="860" y="0" width="390" height="660" rx="16" fill="#131c33" stroke="#233052" stroke-width="2"/>
      <circle cx="920" cy="60" r="24" fill="#64748b"/>
      <text x="912" y="69" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="26">3</text>
      <text x="895" y="140" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="26">Skip Distributed</text>
      <text x="895" y="200" fill="#cbd5e1" font-family="system-ui, -apple-system, sans-serif" font-size="20">
        <tspan x="895" dy="0">Distributed clusters</tspan>
        <tspan x="895" dy="30">(GlusterFS) work, but</tspan>
        <tspan x="895" dy="30">require 3x instances</tspan>
        <tspan x="895" dy="30">and constant triage.</tspan>
        <tspan x="895" dy="45">Unjustified complexity.</tspan>
      </text>

      <!-- Step 4 -->
      <rect x="1290" y="0" width="390" height="660" rx="16" fill="#131c33" stroke="#10b981" stroke-width="2"/>
      <circle cx="1350" cy="60" r="24" fill="#10b981"/>
      <text x="1342" y="69" fill="#0b1329" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="26">4</text>
      <text x="1325" y="140" fill="#10b981" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="26">The Solution</text>
      <text x="1325" y="200" fill="#cbd5e1" font-family="system-ui, -apple-system, sans-serif" font-size="20">
        <tspan x="1325" dy="0">EBS Snapshots!</tspan>
        <tspan x="1325" dy="35">Hourly snapshots to S3.</tspan>
        <tspan x="1325" dy="35">When ASG recovers in</tspan>
        <tspan x="1325" dy="30">Zone B, create volume</tspan>
        <tspan x="1325" dy="30">from latest snapshot.</tspan>
        <tspan x="1325" dy="45">Minimal data loss!</tspan>
      </text>
    </g>

    <!-- Bottom information bar -->
    <rect x="0" y="1010" width="1920" height="70" fill="#080c17" stroke="#17223b" stroke-width="1"/>
    <text x="120" y="1052" fill="#64748b" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="18" letter-spacing="1">AUTO-SCALING &amp; MULTI-AZ RECOVERY</text>
    <text x="1800" y="1052" fill="#f97316" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="20">8</text>
  </svg>
  `,

  // Slide 9: Key Takeaways
  `
  <svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
    <rect width="1920" height="1080" fill="#0b1329"/>
    
    <text x="120" y="130" fill="#f97316" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="18" letter-spacing="3">SUMMARY</text>
    <text x="120" y="200" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="64">KEY TAKEAWAYS</text>

    <!-- 5 Takeaway Rows -->
    <g transform="translate(120, 260)">
      <rect x="0" y="0" width="1680" height="110" rx="16" fill="#131c33" stroke="#233052" stroke-width="1.5"/>
      <g transform="translate(30, 28)">${checkIconSvg}</g>
      <text x="110" y="65" fill="#f8fafc" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="24">Auto-scaling needs two pieces: a Launch Configuration (what to launch) and an Auto-Scaling Group (how many, where, health checks).</text>

      <rect x="0" y="135" width="1680" height="110" rx="16" fill="#131c33" stroke="#233052" stroke-width="1.5"/>
      <g transform="translate(30, 163)">${checkIconSvg}</g>
      <text x="110" y="200" fill="#f8fafc" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="24">CloudWatch alarm recovery only repairs instances in the same AZ; Auto-Scaling provides true cross-AZ failover.</text>

      <rect x="0" y="270" width="1680" height="110" rx="16" fill="#131c33" stroke="#233052" stroke-width="1.5"/>
      <g transform="translate(30, 298)">${checkIconSvg}</g>
      <text x="110" y="335" fill="#f8fafc" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="24">EBS volumes are bound to a single availability zone — they NEVER automatically follow a server into another zone.</text>

      <rect x="0" y="405" width="1680" height="110" rx="16" fill="#131c33" stroke="#233052" stroke-width="1.5"/>
      <g transform="translate(30, 433)">${checkIconSvg}</g>
      <text x="110" y="470" fill="#f8fafc" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="24">Bridge the storage gap with Multi-AZ managed services, EBS snapshots in S3, or distributed file systems.</text>

      <rect x="0" y="540" width="1680" height="110" rx="16" fill="#131c33" stroke="#f97316" stroke-width="2"/>
      <g transform="translate(30, 568)">${checkIconSvg}</g>
      <text x="110" y="605" fill="#f97316" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="24">For disk-based workloads like Jenkins, EBS snapshots hit the sweet spot: real resilience without distributed overhead.</text>
    </g>

    <!-- Bottom information bar -->
    <rect x="0" y="1010" width="1920" height="70" fill="#080c17" stroke="#17223b" stroke-width="1"/>
    <text x="120" y="1052" fill="#64748b" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="18" letter-spacing="1">AUTO-SCALING &amp; MULTI-AZ RECOVERY</text>
    <text x="1800" y="1052" fill="#f97316" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="20">9</text>
  </svg>
  `
];

console.log("Generating 1920x1080 slide images for " + docId + "...");
slides.forEach((svgContent, index) => {
  const slideNum = index + 1;
  const svgPath = path.join("/tmp", `slide_${slideNum}.svg`);
  const pngPath = path.join(targetDir, `slide-${slideNum}.png`);
  
  fs.writeFileSync(svgPath, svgContent.trim());
  execSync(`rsvg-convert -w 1920 -h 1080 "${svgPath}" -o "${pngPath}"`);
  console.log(`Rendered Slide ${slideNum} -> ${pngPath}`);
});

console.log("All 9 slides rendered successfully!");
