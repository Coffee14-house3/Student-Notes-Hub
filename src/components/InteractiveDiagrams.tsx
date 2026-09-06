import React, { useState } from "react";
import { 
  Globe, Server, Database, Shield, Cloud, HardDrive, Cpu, Radio, 
  Terminal, Layers, CheckCircle2, FileCode, Check, AlertCircle, Phone, CreditCard, User, Mail
} from "lucide-react";
import { DiagramData } from "../types";

interface Props {
  diagram: DiagramData;
}

export const InteractiveDiagramRenderer: React.FC<Props> = ({ diagram }) => {
  const [activeTab, setActiveTab] = useState<string>("diagram");

  return (
    <div className="my-8 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900 shadow-sm">
      {/* Header bar */}
      <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 rounded-md">
            {diagram.figureNumber}
          </span>
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {diagram.title}
          </h4>
        </div>
        <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-700/60 p-1 rounded-lg text-xs">
          <button
            onClick={() => setActiveTab("diagram")}
            className={`px-3 py-1 rounded-md transition-colors ${
              activeTab === "diagram"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Interactive View
          </button>
          <button
            onClick={() => setActiveTab("details")}
            className={`px-3 py-1 rounded-md transition-colors ${
              activeTab === "details"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Description
          </button>
        </div>
      </div>

      {/* Main Diagram Area */}
      <div className="p-4 sm:p-6">
        {activeTab === "details" ? (
          <div className="prose dark:prose-invert text-sm max-w-none text-slate-600 dark:text-slate-300">
            <p className="font-medium text-slate-800 dark:text-slate-200">{diagram.description}</p>
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-lg text-amber-800 dark:text-amber-300 text-xs">
              <strong>Architectural Note:</strong> This diagram models real-world AWS infrastructure patterns described in the original textbook. Click interactive nodes to inspect component roles.
            </div>
          </div>
        ) : (
          <div>
            {diagram.type === "data-centers-map" && <DataCentersMapDiagram />}
            {diagram.type === "onprem-vs-aws" && <OnPremVsAwsDiagram />}
            {diagram.type === "webshop-cdn-lb" && <WebShopCdnLbDiagram />}
            {diagram.type === "java-ee-vpc" && <JavaEeVpcDiagram />}
            {diagram.type === "backup-storage" && <BackupStorageDiagram />}
            {diagram.type === "fault-tolerant-az" && <FaultTolerantAzDiagram />}
            {diagram.type === "aws-service-layers" && <AwsServiceLayersDiagram />}
            {diagram.type === "interaction-spectrum" && <InteractionSpectrumDiagram />}
            {diagram.type === "ec2-console-sim" && <Ec2ConsoleSimDiagram />}
            {diagram.type === "cli-terminal-sim" && <CliTerminalSimDiagram />}
            {diagram.type === "blueprint-code" && <BlueprintCodeDiagram />}
            {diagram.type === "signup-walkthrough" && <SignupWalkthroughDiagram />}
          </div>
        )}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Sub-Diagram 1: Data Centers Map (Figure 1.1)                                */
/* -------------------------------------------------------------------------- */
const DataCentersMapDiagram: React.FC = () => {
  const [selectedRegion, setSelectedRegion] = useState<string>("U.S. West 1");

  const regions = [
    { name: "U.S. West 1", country: "California, USA", latency: "12 ms", code: "us-west-1" },
    { name: "U.S. West 2", country: "Oregon, USA", latency: "18 ms", code: "us-west-2" },
    { name: "U.S. East", country: "Virginia, USA", latency: "5 ms", code: "us-east-1" },
    { name: "Ireland", country: "Dublin, Ireland", latency: "75 ms", code: "eu-west-1" },
    { name: "Germany", country: "Frankfurt, Germany", latency: "82 ms", code: "eu-central-1" },
    { name: "Singapore", country: "Singapore", latency: "160 ms", code: "ap-southeast-1" },
    { name: "Japan", country: "Tokyo, Japan", latency: "130 ms", code: "ap-northeast-1" },
    { name: "Australia", country: "Sydney, Australia", latency: "190 ms", code: "ap-southeast-2" },
    { name: "Brazil", country: "São Paulo, Brazil", latency: "115 ms", code: "sa-east-1" }
  ];

  const current = regions.find(r => r.name === selectedRegion) || regions[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Click an AWS Region node to view region details:</span>
        <span className="font-semibold text-amber-600 dark:text-amber-400">Figure 1.1 Data Centers</span>
      </div>

      {/* Visual map simulation */}
      <div className="relative w-full h-64 bg-slate-900 rounded-xl overflow-hidden border border-slate-800 p-4 flex flex-col justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>
        
        <div className="relative z-10 flex justify-between items-start">
          <div className="flex items-center gap-2 bg-slate-800/90 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-700">
            <Globe className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="text-xs font-semibold text-white">AWS Global Infrastructure</span>
          </div>
          <div className="bg-amber-500/20 text-amber-300 text-xs px-2.5 py-1 rounded border border-amber-500/30">
            Selected: {current.name}
          </div>
        </div>

        {/* Region node badges */}
        <div className="relative z-10 grid grid-cols-3 sm:grid-cols-5 gap-2 my-auto">
          {regions.map((reg) => (
            <button
              key={reg.name}
              onClick={() => setSelectedRegion(reg.name)}
              className={`p-2 rounded-lg text-xs font-medium transition-all text-center border flex flex-col items-center gap-1 ${
                selectedRegion === reg.name
                  ? "bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md shadow-amber-500/20 scale-105"
                  : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700 hover:border-slate-600"
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>{reg.name}</span>
            </button>
          ))}
        </div>

        <div className="relative z-10 bg-slate-800/90 rounded-lg p-2.5 border border-slate-700 flex flex-wrap items-center justify-between text-xs text-slate-300 gap-2">
          <div><strong className="text-white">Region Code:</strong> {current.code}</div>
          <div><strong className="text-white">Location:</strong> {current.country}</div>
          <div><strong className="text-white">Avg Network Latency:</strong> <span className="text-emerald-400">{current.latency}</span></div>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Sub-Diagram 2: On-Premises vs AWS (Figure 1.2)                              */
/* -------------------------------------------------------------------------- */
const OnPremVsAwsDiagram: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* On-Premises Box */}
      <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 space-y-3">
        <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
          <Server className="w-4 h-4" />
          <span>On-Premises Server Rental</span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Rented physical servers in a local data center. Manual server maintenance, power management, physical hardware replacement, and manual OS updates.
        </p>
        <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between font-medium">
            <span>Web Server</span>
            <span className="text-slate-500 text-[11px]">Self-Managed</span>
          </div>
          <div className="flex items-center justify-between font-medium">
            <span>Database</span>
            <span className="text-slate-500 text-[11px]">Self-Managed</span>
          </div>
          <div className="mt-2 text-[11px] text-rose-500 flex items-center gap-1 font-semibold">
            <AlertCircle className="w-3.5 h-3.5" /> High upfront hardware & operational cost
          </div>
        </div>
      </div>

      {/* AWS Box */}
      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
          <Cloud className="w-4 h-4" />
          <span>AWS Cloud Hosting</span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Elastic cloud resources hosted on AWS infrastructure. Automatic maintenance, hardware management handled by AWS, pay-per-use billing.
        </p>
        <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-emerald-500/20 space-y-2 text-xs">
          <div className="flex items-center justify-between font-medium">
            <span>Web Server (EC2)</span>
            <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">Managed Updates</span>
          </div>
          <div className="flex items-center justify-between font-medium">
            <span>Database (RDS)</span>
            <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">Maintenance Free</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
            <Check className="w-3.5 h-3.5" /> On-Demand, Zero upfront hardware cost
          </div>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Sub-Diagram 3: Web Shop with CDN & Load Balancer (Figure 1.3)               */
/* -------------------------------------------------------------------------- */
const WebShopCdnLbDiagram: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="text-xs text-slate-500">
        John's enhanced AWS web shop layout with CDN static caching and multi-server load balancing:
      </div>

      <div className="p-4 bg-slate-900 rounded-xl text-white border border-slate-800 space-y-4">
        {/* User / Internet */}
        <div className="flex justify-center">
          <div className="px-4 py-1.5 bg-indigo-600/30 border border-indigo-400/30 rounded-full text-xs font-semibold text-indigo-300 flex items-center gap-2">
            <User className="w-3.5 h-3.5" /> Customer Traffic via Internet
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Static Branch */}
          <div className="p-3 bg-slate-800/80 rounded-lg border border-sky-500/30 space-y-2 text-xs">
            <div className="font-bold text-sky-400 flex items-center gap-1.5">
              <Globe className="w-4 h-4" /> Static Assets Route (CDN)
            </div>
            <p className="text-[11px] text-slate-300">
              Logo, images, CSS, JS cached at edge CDN locations & stored in S3 Object Store.
            </p>
            <div className="bg-sky-950/60 p-2 rounded text-[11px] border border-sky-800 text-sky-200">
              <strong>Outcome:</strong> Fast global delivery + minimal web server load.
            </div>
          </div>

          {/* Dynamic Branch */}
          <div className="p-3 bg-slate-800/80 rounded-lg border border-amber-500/30 space-y-2 text-xs">
            <div className="font-bold text-amber-400 flex items-center gap-1.5">
              <Radio className="w-4 h-4" /> Dynamic Requests Route (Load Balancer)
            </div>
            <p className="text-[11px] text-slate-300">
              Orders & dynamic pages routed to Load Balancer & smaller virtual web servers.
            </p>
            <div className="bg-amber-950/60 p-2 rounded text-[11px] border border-amber-800 text-amber-200">
              <strong>Outcome:</strong> High availability & failover protection.
            </div>
          </div>
        </div>

        {/* Database */}
        <div className="p-2.5 bg-slate-800 rounded-lg border border-slate-700 text-center text-xs">
          <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-bold">
            <Database className="w-4 h-4" /> Managed Cloud Database (RDS)
          </div>
          <span className="text-[11px] text-slate-400">Maintenance-free automated backups and storage scaling</span>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Sub-Diagram 4: Java EE VPC (Figure 1.4)                                    */
/* -------------------------------------------------------------------------- */
const JavaEeVpcDiagram: React.FC = () => {
  return (
    <div className="p-4 bg-slate-900 rounded-xl text-slate-100 border border-slate-800 space-y-4">
      <div className="flex flex-wrap items-center justify-between text-xs border-b border-slate-800 pb-2">
        <span className="font-bold text-amber-400">VPC CIDR: 10.10.0.0/16</span>
        <span className="text-slate-400">Corporate Network: 10.20.0.0/16 (via VPN)</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Public Subnet */}
        <div className="p-3 bg-sky-950/40 border border-sky-500/40 rounded-lg space-y-2 text-xs">
          <div className="font-bold text-sky-400">Public Subnet (10.10.0.0/24)</div>
          <div className="p-2 bg-slate-900 rounded border border-sky-500/30 text-[11px]">
            <strong>Internet Gateway & NAT Gateway</strong>
            <p className="text-slate-400 mt-1">Handles outbound internet traffic for private subnets.</p>
          </div>
        </div>

        {/* Java Subnet */}
        <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-lg space-y-2 text-xs">
          <div className="font-bold text-amber-400">Private Subnet (10.10.1.0/24)</div>
          <div className="p-2 bg-slate-900 rounded border border-amber-500/30 text-[11px]">
            <strong>Java EE App Server VMs</strong>
            <p className="text-slate-400 mt-1">Runs enterprise app server isolated from direct public internet.</p>
          </div>
        </div>

        {/* SQL DB Subnet */}
        <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-lg space-y-2 text-xs">
          <div className="font-bold text-emerald-400">Private Subnet (10.10.2.0/24)</div>
          <div className="p-2 bg-slate-900 rounded border border-emerald-500/30 text-[11px]">
            <strong>Managed SQL Database</strong>
            <p className="text-slate-400 mt-1">Oracle EE / MS SQL Server EE with ACL restricted access.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Sub-Diagram 5: Backup & Archiving (Figure 1.5)                              */
/* -------------------------------------------------------------------------- */
const BackupStorageDiagram: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
      {/* On-Premises Pain Points */}
      <div className="p-4 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-300 dark:border-slate-700 space-y-2">
        <div className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
          <HardDrive className="w-4 h-4" /> On-Premises Law Office Setup
        </div>
        <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 text-[11px]">
          <li>Double hardware purchase (File server + duplicate NAS).</li>
          <li>High disaster risk: Both servers located in same office room.</li>
          <li>Expensive physical tape deck for 10-year legal archival requirements.</li>
        </ul>
      </div>

      {/* AWS Cloud Solution */}
      <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/30 space-y-2">
        <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
          <Cloud className="w-4 h-4" /> AWS Storage Gateway & S3 Archiving
        </div>
        <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 text-[11px]">
          <li>Storage Gateway syncs local data seamlessly to AWS.</li>
          <li>Highly durable S3 Object Storage eliminates local duplicate NAS.</li>
          <li>Virtual Tape Drive (Glacier) satisfies 10+ year legal retention for pennies.</li>
        </ul>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Sub-Diagram 6: Fault Tolerant Multi-AZ (Figure 1.6)                        */
/* -------------------------------------------------------------------------- */
const FaultTolerantAzDiagram: React.FC = () => {
  return (
    <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 text-white space-y-4">
      <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
        <span className="font-bold text-amber-400">AWS Fault-Tolerant Architecture</span>
        <span className="text-slate-400">Murphy's Law Defense Strategy</span>
      </div>

      <div className="p-2.5 bg-slate-800/80 rounded-lg text-center border border-amber-500/30 text-xs">
        <span className="font-semibold text-amber-300">AWS Elastic Load Balancer (ELB)</span>
        <p className="text-[11px] text-slate-400">Health checks and automatic traffic failover between data centers</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Data Center A */}
        <div className="p-3 bg-slate-800/90 rounded-lg border border-slate-700 space-y-2 text-xs">
          <div className="font-bold text-sky-400">Data Center A (Availability Zone 1)</div>
          <div className="p-2 bg-slate-900 rounded border border-slate-700 text-[11px]">Web Server A</div>
          <div className="p-2 bg-sky-950/60 rounded border border-sky-800 text-[11px] text-sky-300 font-semibold">
            Database Master (Read / Write)
          </div>
        </div>

        {/* Data Center B */}
        <div className="p-3 bg-slate-800/90 rounded-lg border border-slate-700 space-y-2 text-xs">
          <div className="font-bold text-sky-400">Data Center B (Availability Zone 2)</div>
          <div className="p-2 bg-slate-900 rounded border border-slate-700 text-[11px]">Web Server B</div>
          <div className="p-2 bg-amber-950/60 rounded border border-amber-800 text-[11px] text-amber-300 font-semibold">
            Database Standby (Synchronous Replication)
          </div>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Sub-Diagram 7: AWS Service Layers (Figure 1.9 & 1.10)                      */
/* -------------------------------------------------------------------------- */
const AwsServiceLayersDiagram: React.FC = () => {
  return (
    <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 text-slate-200 text-xs space-y-3">
      <div className="font-bold text-amber-400">AWS Service & Abstraction Layers</div>
      <div className="space-y-2">
        <div className="p-2.5 bg-amber-500/20 rounded border border-amber-500/30">
          <strong className="text-amber-300">Administrator / API Call Layer</strong>
          <p className="text-[11px] text-slate-300">Control services remotely via API, Console, or CLI.</p>
        </div>
        <div className="p-2.5 bg-sky-500/20 rounded border border-sky-500/30">
          <strong className="text-sky-300">Services Layer</strong>
          <p className="text-[11px] text-slate-300">Compute (EC2), NoSQL (DynamoDB), Email (SES), Static File Storage (S3), DNS (Route53).</p>
        </div>
        <div className="p-2.5 bg-slate-800 rounded border border-slate-700">
          <strong className="text-slate-300">Hardware & Network Abstraction Layer</strong>
          <p className="text-[11px] text-slate-400">Physical servers, switches, SANs, and global fiber backbone managed by AWS.</p>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Sub-Diagram 8: Interaction Spectrum (Figure 1.12)                         */
/* -------------------------------------------------------------------------- */
const InteractionSpectrumDiagram: React.FC = () => {
  return (
    <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 text-white space-y-4">
      <div className="text-xs font-bold text-amber-400">Spectrum of AWS Interaction Tools</div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="p-2.5 bg-slate-800 rounded border border-slate-700 text-center space-y-1">
          <div className="font-semibold text-amber-300">1. Console</div>
          <div className="text-[11px] text-slate-400">Manual GUI</div>
        </div>
        <div className="p-2.5 bg-slate-800 rounded border border-slate-700 text-center space-y-1">
          <div className="font-semibold text-sky-300">2. CLI</div>
          <div className="text-[11px] text-slate-400">Terminal Commands</div>
        </div>
        <div className="p-2.5 bg-slate-800 rounded border border-slate-700 text-center space-y-1">
          <div className="font-semibold text-emerald-300">3. SDKs</div>
          <div className="text-[11px] text-slate-400">Application Code</div>
        </div>
        <div className="p-2.5 bg-slate-800 rounded border border-slate-700 text-center space-y-1">
          <div className="font-semibold text-purple-300">4. Blueprints</div>
          <div className="text-[11px] text-slate-400">Full Automation</div>
        </div>
      </div>

      <div className="p-2 bg-amber-500/10 rounded border border-amber-500/20 text-center text-xs text-amber-300 font-semibold">
        All tools communicate with AWS through the unified AWS REST API
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Sub-Diagram 9: EC2 Console Simulator (Figure 1.13)                         */
/* -------------------------------------------------------------------------- */
const Ec2ConsoleSimDiagram: React.FC = () => {
  return (
    <div className="border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900 text-xs shadow-xs">
      <div className="bg-slate-800 text-white p-3 flex items-center justify-between font-mono">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-amber-400" />
          <span>AWS EC2 Management Console Simulator</span>
        </div>
        <span className="text-[11px] text-emerald-400 font-semibold">Region: us-west-2 (Oregon)</span>
      </div>

      <div className="p-3 bg-slate-100 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 flex gap-4 font-medium text-slate-600 dark:text-slate-300">
        <span className="text-amber-600 dark:text-amber-400 border-b-2 border-amber-500 font-bold pb-1">Instances (1)</span>
        <span>Security Groups</span>
        <span>Elastic IPs</span>
        <span>Key Pairs</span>
      </div>

      <div className="p-4 space-y-3 font-mono text-[11px]">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 dark:bg-slate-800/80 p-3 rounded border border-slate-200 dark:border-slate-700">
          <div><span className="text-slate-500">Instance ID:</span> <span className="font-bold text-amber-600 dark:text-amber-400">i-c4869ace</span></div>
          <div><span className="text-slate-500">Type:</span> <span>t2.micro</span></div>
          <div><span className="text-slate-500">Status:</span> <span className="text-emerald-600 font-bold">● running</span></div>
          <div><span className="text-slate-500">Public IP:</span> <span>52.10.193.65</span></div>
        </div>

        <div className="p-3 bg-slate-900 text-slate-200 rounded space-y-1">
          <div><strong className="text-slate-400">Public DNS:</strong> ec2-52-10-193-65.us-west-2.compute.amazonaws.com</div>
          <div><strong className="text-slate-400">Private IP:</strong> 172.31.38.113</div>
          <div><strong className="text-slate-400">VPC ID:</strong> vpc-12f5677 (Subnet: subnet-cab333af)</div>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Sub-Diagram 10: CLI Terminal Simulator (Figure 1.14)                       */
/* -------------------------------------------------------------------------- */
const CliTerminalSimDiagram: React.FC = () => {
  const [cmd, setCmd] = useState<string>("aws cloudwatch list-metrics --namespace AWS/EC2");

  const outputs: Record<string, string> = {
    "aws cloudwatch list-metrics --namespace AWS/EC2": `{
  "Metrics": [
    {
      "Namespace": "AWS/EC2",
      "MetricName": "StatusCheckFailed_Instance",
      "Dimensions": [{ "Name": "InstanceId", "Value": "i-ed62dc0b" }]
    },
    {
      "Namespace": "AWS/EC2",
      "MetricName": "CPUUtilization",
      "Dimensions": [{ "Name": "InstanceId", "Value": "i-a0a02bee" }]
    }
  ],
  "NextToken": "None"
}`,
    "aws ec2 describe-instances": `{
  "Reservations": [
    {
      "Instances": [
        { "InstanceId": "i-c4869ace", "State": { "Name": "running" }, "InstanceType": "t2.micro" }
      ]
    }
  ]
}`,
    "aws s3 ls": `2026-08-04 07:00:00 my-law-office-archive-bucket
2026-08-04 07:02:11 shop-static-assets-cdn`
  };

  return (
    <div className="rounded-xl overflow-hidden bg-slate-950 text-slate-200 border border-slate-800 font-mono text-xs">
      <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-amber-400" />
          <span>michael — bash — 92x39</span>
        </div>
        <span>AWS CLI v2.15</span>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-emerald-400 font-bold">mwittig:~$</span>
          <select
            value={cmd}
            onChange={(e) => setCmd(e.target.value)}
            className="bg-slate-900 text-amber-300 px-2 py-1 rounded border border-slate-700 text-xs font-mono focus:outline-none"
          >
            <option value="aws cloudwatch list-metrics --namespace AWS/EC2">aws cloudwatch list-metrics --namespace AWS/EC2</option>
            <option value="aws ec2 describe-instances">aws ec2 describe-instances</option>
            <option value="aws s3 ls">aws s3 ls</option>
          </select>
        </div>

        <pre className="p-3 bg-slate-900/90 rounded border border-slate-800 text-slate-300 text-[11px] overflow-x-auto leading-relaxed">
          {outputs[cmd] || "Command executed successfully."}
        </pre>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Sub-Diagram 11: Blueprint Code (Figure 1.15)                               */
/* -------------------------------------------------------------------------- */
const BlueprintCodeDiagram: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
      <div className="p-3 bg-slate-950 text-slate-200 rounded-xl border border-slate-800 space-y-2">
        <div className="text-amber-400 font-bold flex items-center gap-1.5 font-sans">
          <FileCode className="w-4 h-4" /> blueprint.json Specification
        </div>
        <pre className="text-[11px] text-sky-300 overflow-x-auto">
{`{
  "infrastructure": {
    "loadbalancer": {
      "server": { "type": "t2.micro" }
    },
    "cdn": { ... },
    "database": { ... },
    "dns": { ... },
    "static": { ... }
  }
}`}
        </pre>
      </div>

      <div className="p-3 bg-slate-900 text-slate-200 rounded-xl border border-slate-800 space-y-2 font-sans">
        <div className="text-emerald-400 font-bold flex items-center gap-1.5">
          <Layers className="w-4 h-4" /> Provisioned Architecture
        </div>
        <ul className="space-y-1.5 text-[11px] text-slate-300">
          <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> DNS Domain mapped to Route 53</li>
          <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> CDN Edge caching configured</li>
          <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> Elastic Load Balancer online</li>
          <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> Web server cluster auto-scaled</li>
        </ul>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Sub-Diagram 12: Account Signup Walkthrough (Figures 1.16 - 1.21)            */
/* -------------------------------------------------------------------------- */
const SignupWalkthroughDiagram: React.FC = () => {
  const [step, setStep] = useState<number>(1);

  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 text-xs">
      {/* Wizard Step Bar */}
      <div className="p-3 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
        <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
          <User className="w-4 h-4 text-amber-500" /> AWS Account Sign-Up Wizard
        </span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              onClick={() => setStep(s)}
              className={`w-6 h-6 rounded-full text-[11px] font-bold transition-colors ${
                step === s
                  ? "bg-amber-500 text-slate-950"
                  : step > s
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="p-5 space-y-4">
        {step === 1 && (
          <div className="space-y-3 max-w-md mx-auto">
            <h5 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Step 1: Credentials (Fig 1.16)</h5>
            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">My Email Address:</label>
                <input type="email" defaultValue="user@example.com" readOnly className="w-full px-3 py-1.5 border rounded bg-slate-50 dark:bg-slate-800 dark:border-slate-700 text-xs" />
              </div>
              <div className="flex items-center gap-2 my-2">
                <input type="radio" checked readOnly className="accent-amber-500" />
                <span>I am a new user.</span>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3 max-w-md mx-auto">
            <h5 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Step 2: Contact Info (Fig 1.17)</h5>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div><span className="text-slate-500">Full Name:</span> <input type="text" defaultValue="John Doe" readOnly className="w-full p-1 border rounded dark:bg-slate-800 dark:border-slate-700" /></div>
              <div><span className="text-slate-500">Country:</span> <input type="text" defaultValue="United States" readOnly className="w-full p-1 border rounded dark:bg-slate-800 dark:border-slate-700" /></div>
              <div className="col-span-2"><span className="text-slate-500">Phone:</span> <input type="text" defaultValue="+1 555-0199" readOnly className="w-full p-1 border rounded dark:bg-slate-800 dark:border-slate-700" /></div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3 max-w-md mx-auto">
            <h5 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Step 3: Payment Info (Fig 1.18)</h5>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded text-amber-800 dark:text-amber-300 text-[11px]">
              <strong>Free Tier Summary:</strong> 750 hrs/mo EC2, 750 hrs/mo ELB, 5GB S3, 20GB RDS for 12 months.
            </div>
            <div className="flex items-center gap-2 border p-2 rounded dark:border-slate-700">
              <CreditCard className="w-4 h-4 text-slate-500" />
              <span>Card ending in •••• 4242</span>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3 max-w-md mx-auto text-center">
            <h5 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Step 4: Identity Verification (Fig 1.19 & 1.20)</h5>
            <Phone className="w-8 h-8 text-amber-500 mx-auto animate-bounce" />
            <p className="text-slate-600 dark:text-slate-300 text-xs">Automated verification call in progress...</p>
            <div className="p-3 bg-slate-900 text-amber-400 font-mono text-lg font-bold rounded border border-amber-500/40">
              PIN: 0110
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-3 max-w-md mx-auto">
            <h5 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Step 5: Support Plan (Fig 1.21)</h5>
            <div className="p-3 border-2 border-amber-500 bg-amber-500/10 rounded-lg space-y-1">
              <div className="font-bold text-amber-600 dark:text-amber-400 flex items-center justify-between">
                <span>Basic Support Plan</span>
                <span className="text-xs bg-amber-500 text-slate-950 px-2 py-0.5 rounded font-bold">FREE</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">Customer service & billing support + access to AWS Community Forums.</p>
            </div>
          </div>
        )}

        <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            disabled={step === 1}
            onClick={() => setStep(prev => prev - 1)}
            className="px-3 py-1 bg-slate-200 dark:bg-slate-700 rounded text-xs disabled:opacity-40"
          >
            Previous
          </button>
          <button
            disabled={step === 5}
            onClick={() => setStep(prev => prev + 1)}
            className="px-3 py-1 bg-amber-500 text-slate-950 font-bold rounded text-xs disabled:opacity-40"
          >
            {step === 5 ? "Completed!" : "Next Step"}
          </button>
        </div>
      </div>
    </div>
  );
};
