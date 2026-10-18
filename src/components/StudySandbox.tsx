import React, { useState } from "react";
import { Terminal, Shield, Cpu, Network, CheckCircle, ArrowRight, Play, RefreshCw, Zap } from "lucide-react";

export const StudySandbox: React.FC = () => {
  const [cidrIp, setCidrIp] = useState("10.0.0.0");
  const [cidrMask, setCidrMask] = useState("24");
  const [sgPort, setSgPort] = useState("443");
  const [sgProtocol, setSgProtocol] = useState("TCP");
  const [sgResult, setSgResult] = useState<string | null>(null);

  const calculateCidr = () => {
    const maskNum = parseInt(cidrMask, 10);
    const totalIps = Math.pow(2, 32 - maskNum);
    const usableIps = Math.max(0, totalIps - 2);
    return { totalIps, usableIps, subnetMask: maskNum >= 24 ? "255.255.255.0" : "Custom Subnet Mask" };
  };

  const testSecurityGroup = () => {
    const portNum = parseInt(sgPort, 10);
    if (portNum === 22) {
      setSgResult("⚠️ WARNING: Port 22 (SSH) open to 0.0.0.0/0 is a high security risk. Restrict to your VPN/IP CIDR.");
    } else if (portNum === 80 || portNum === 443) {
      setSgResult("✅ SECURE: Web traffic port (" + portNum + ") correctly configured for public HTTP/HTTPS ingress.");
    } else {
      setSgResult(`ℹ️ INFO: Custom port ${portNum} (${sgProtocol}) allowed. Verify application ingress requirements.`);
    }
  };

  const cidrInfo = calculateCidr();

  return (
    <div className="space-y-6 text-xs sm:text-sm">
      <div className="bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" /> Interactive Lab Sandbox
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">Cloud & Network Study Sandbox</h2>
          <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
            Experiment with AWS Virtual Private Cloud (VPC) CIDR subnet sizing and test Security Group firewall rules in real-time to reinforce your course notes.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tool 1: Subnet & CIDR Calculator */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Network className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white text-base">VPC CIDR Subnet Calculator</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Calculate total IP addresses and usable host IPs for your AWS VPC subnets.
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1">
              <label className="text-[11px] text-slate-400 font-mono">Base IP Address</label>
              <input
                type="text"
                value={cidrIp}
                onChange={(e) => setCidrIp(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 font-mono">CIDR Prefix</label>
              <select
                value={cidrMask}
                onChange={(e) => setCidrMask(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-amber-500"
              >
                <option value="16">/16 (65,536 IPs)</option>
                <option value="20">/20 (4,096 IPs)</option>
                <option value="24">/24 (256 IPs)</option>
                <option value="28">/28 (16 IPs)</option>
              </select>
            </div>
          </div>

          <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 space-y-2 font-mono text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Total IP Addresses:</span>
              <span className="text-white font-bold">{cidrInfo.totalIps.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Usable Host IPs:</span>
              <span className="text-emerald-400 font-bold">{cidrInfo.usableIps.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Network Broadcast Reserved:</span>
              <span className="text-amber-400">2 IPs</span>
            </div>
          </div>
        </div>

        {/* Tool 2: Security Group Firewall Rule Tester */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Shield className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-white text-base">Security Group Rule Validator</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Test inbound port configurations for EC2 security groups to verify cloud compliance.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 font-mono">Port Number</label>
              <input
                type="text"
                value={sgPort}
                onChange={(e) => setSgPort(e.target.value)}
                placeholder="e.g. 443, 22, 80"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 font-mono">Protocol</label>
              <select
                value={sgProtocol}
                onChange={(e) => setSgProtocol(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
              >
                <option value="TCP">TCP</option>
                <option value="UDP">UDP</option>
                <option value="ICMP">ICMP</option>
              </select>
            </div>
          </div>

          <button
            onClick={testSecurityGroup}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <Play className="w-4 h-4" /> Validate Security Rule
          </button>

          {sgResult && (
            <div className="bg-slate-950 rounded-2xl p-4 border border-indigo-500/30 text-xs font-mono text-indigo-200">
              {sgResult}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
