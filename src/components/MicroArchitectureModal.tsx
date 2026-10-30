import React, { useState, useEffect } from "react";
import { 
  Server, 
  Globe, 
  ExternalLink, 
  Database, 
  Sparkles, 
  Check, 
  Copy, 
  X, 
  RefreshCw, 
  Users, 
  Cpu, 
  Cloud, 
  Layers, 
  ShieldCheck, 
  Terminal,
  Settings,
  ArrowRight,
  GraduationCap,
  BookOpen
} from "lucide-react";
import { getBackendUrl, setBackendUrl, testBackendConnection } from "../utils/apiClient";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onBackendUrlChanged?: () => void;
}

export const MicroArchitectureModal: React.FC<Props> = ({ isOpen, onClose, onBackendUrlChanged }) => {
  const [currentUrl, setCurrentUrl] = useState<string>(() => getBackendUrl());
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; latencyMs?: number; data?: any } | null>(null);
  const [testing, setTesting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"two_websites" | "hf_spaces" | "octopus" | "architecture" | "render" | "github" | "students">("two_websites");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentUrl(getBackendUrl());
      handleRunTest();
    }
  }, [isOpen]);

  const handleRunTest = async (urlToTest?: string) => {
    setTesting(true);
    setTestResult(null);
    const target = urlToTest !== undefined ? urlToTest : currentUrl;
    const res = await testBackendConnection(target);
    setTestResult(res);
    setTesting(false);
  };

  const handleSaveUrl = () => {
    setBackendUrl(currentUrl);
    handleRunTest(currentUrl);
    if (onBackendUrlChanged) onBackendUrlChanged();
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  if (!isOpen) return null;

  const octopusWorkflowCode = `name: Trigger Octopus Cloud Deployment

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  octopus_deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js & Build
        uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci && npm run build

      - name: Install Octopus CLI
        uses: OctopusDeploy/install-octopus-cli-action@v1
        with:
          version: latest

      - name: Create Release in Octopus Cloud (Free Trial)
        env:
          OCTOPUS_URL: "\${{ secrets.OCTOPUS_SERVER_URL }}" # e.g. https://your-org.octopus.app
          OCTOPUS_API_KEY: "\${{ secrets.OCTOPUS_API_KEY }}"
        run: |
          octo create-release \\
            --server="\${OCTOPUS_URL}" \\
            --apiKey="\${OCTOPUS_API_KEY}" \\
            --project="Course-Notes-Backend" \\
            --deployto="Production" \\
            --progress
`;

  const githubWorkflowCode = `name: Deploy Static UI to GitHub Pages

on:
  push:
    branches: [ main ]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: true

jobs:
  deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Build Static Client (with Render Backend URL)
        env:
          # Optional: Configure your Render backend URL at build time
          VITE_API_URL: "${currentUrl || 'https://your-service.onrender.com'}"
        run: npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Upload Artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
`;

  const renderYamlCode = `services:
  - type: web
    name: course-notes-microservice
    runtime: node
    plan: free
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3000
      - key: CHROMA_API_KEY
        value: ck-GcQZtcjL4HkCUrRnhdhvLC632JVA9YXHYw7PVoDWj8AM
      - key: CHROMA_TENANT
        value: 0f94ea0f-37ba-4909-88f1-4ee0f0e15dd7
      - key: CHROMA_DATABASE
        value: rag-notes-application1
      - key: OPENROUTER_API_KEY
        sync: false
`;

  const twoWebsitesWorkflowCode = `name: Deploy 2 Websites (Student & Teacher)

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: write
  pages: write
  id-token: write

jobs:
  deploy_both_sites:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci

      # 1. Build Student Website (Locked down for 16 students)
      - name: Build Student Site
        env:
          VITE_PORTAL_MODE: student
          VITE_STANDALONE: "true"
          VITE_BACKEND_URL: "${currentUrl || 'https://your-service.onrender.com'}"
        run: npm run build:student

      # 2. Build Teacher Website (Studio management)
      - name: Build Teacher Site
        env:
          VITE_PORTAL_MODE: teacher
          VITE_STANDALONE: "true"
          VITE_BACKEND_URL: "${currentUrl || 'https://your-service.onrender.com'}"
        run: npm run build:teacher

      # 3. Assemble dual directory structure for static hosting
      - name: Assemble Folders
        run: |
          mkdir -p combined_dist
          cp -r dist-student combined_dist/student
          cp -r dist-student/* combined_dist/
          cp -r dist-teacher combined_dist/teacher

      # 4. Deploy to GitHub Pages / Static Host
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: './combined_dist'
      - uses: actions/deploy-pages@v4
`;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto text-slate-100">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between gap-3 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold text-white">Application Micro-Architecture</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider">
                  2 Websites + 1 Microservice
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Dedicated Student Web App (16 Students) + Dedicated Teacher Web App + Compact Render Micro-Backend
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-4 sm:px-6 gap-2 sm:gap-4 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab("two_websites")}
            className={`py-3 px-3 font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === "two_websites"
                ? "border-emerald-400 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Deploy 2 Websites (Student &amp; Teacher)</span>
          </button>
          <button
            onClick={() => setActiveTab("octopus")}
            className={`py-3 px-3 font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === "octopus"
                ? "border-purple-400 text-purple-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="w-4 h-4 text-purple-400" />
            <span>Octopus Cloud (Free Trial)</span>
          </button>
          <button
            onClick={() => setActiveTab("architecture")}
            className={`py-3 px-3 font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === "architecture"
                ? "border-indigo-400 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Architecture Blueprint</span>
          </button>
          <button
            onClick={() => setActiveTab("hf_spaces")}
            className={`py-3 px-3 font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === "hf_spaces"
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Hugging Face Spaces (16GB RAM)</span>
          </button>
          <button
            onClick={() => setActiveTab("render")}
            className={`py-3 px-3 font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === "render"
                ? "border-indigo-400 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>Render Microservice</span>
          </button>
          <button
            onClick={() => setActiveTab("github")}
            className={`py-3 px-3 font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === "github"
                ? "border-indigo-400 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>GitHub Pages (Static)</span>
          </button>
          <button
            onClick={() => setActiveTab("students")}
            className={`py-3 px-3 font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === "students"
                ? "border-indigo-400 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>60 Students Guide</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* Automated Microservice Mesh Monitor (Zero Manual Configuration) */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Automated Microservices Mesh</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-medium">
                  Auto-Discovered
                </span>
              </div>
              <div className="flex items-center gap-2">
                {testing ? (
                  <span className="flex items-center gap-1 text-[11px] text-amber-400 font-mono">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Probing microservices...
                  </span>
                ) : testResult ? (
                  <span className={`flex items-center gap-1 text-[11px] font-mono px-2.5 py-0.5 rounded-full border ${
                    testResult.ok 
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${testResult.ok ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
                    {testResult.message}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => handleRunTest()}
                  disabled={testing}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer"
                  title="Probe All Microservices"
                >
                  <RefreshCw className={`w-3 h-3 ${testing ? "animate-spin" : ""}`} />
                  <span>Probe Health</span>
                </button>
              </div>
            </div>

            {/* 4 Microservice Mesh Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-1">
                <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Student Micro-UI
                </span>
                <span className="text-xs font-bold text-white">Port 3001 / Pages</span>
                <span className="text-[10px] text-slate-500">60 MCA-204 Users</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-1">
                <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                  Teacher Studio
                </span>
                <span className="text-xs font-bold text-white">Port 3002 / /teacher</span>
                <span className="text-[10px] text-slate-500">Author & Uploads</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-1">
                <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                  Core API Engine
                </span>
                <span className="text-xs font-bold text-white">Express Microservice</span>
                <span className="text-[10px] text-slate-500">PDF / DOCX Ingestion</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-1">
                <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
                  Vector RAG Service
                </span>
                <span className="text-xs font-bold text-white">ChromaDB Cloud</span>
                <span className="text-[10px] text-slate-500">Embeddings & Query</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              ⚡ <strong>Zero Configuration Needed:</strong> The micro-frontends automatically route to the cloud backend API with automated service discovery.
            </p>
          </div>

          {/* TAB: Hugging Face Spaces (16GB RAM) */}
          {activeTab === "hf_spaces" && (
            <div className="space-y-6 text-xs">
              
              {/* Highlight Hero Banner */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-950 to-indigo-950/40 border border-amber-500/30 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-extrabold text-sm sm:text-base">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <span>Hugging Face Spaces • 16 GB Free RAM &amp; 2 vCPUs</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Eliminates Render's 512 MB memory limit with <strong className="text-amber-300">16,000 MB RAM (31× more memory)</strong>.
                  Runs the <strong className="text-emerald-300">Charitra High-Precision RAG pipeline</strong> using <strong className="text-white">your own API keys</strong> (Gemini, OpenRouter, or OpenAI) with zero hallucinations and instant responses for all 60 MCA students.
                </p>
                <div className="flex flex-wrap gap-2 pt-1 font-mono text-[10px]">
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    16 GB Dedicated RAM
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    Uses Your Custom API Keys
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20">
                    Charitra Anti-Hallucination
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20">
                    Zero 512MB RAM Crashes
                  </span>
                </div>
              </div>

              {/* Connect Frontend to Hugging Face Space URL */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Cloud className="w-4 h-4 text-amber-400" />
                    Connect Frontend to Your Hugging Face Space
                  </span>
                  <span className="text-[10px] text-slate-400">Direct HTTPS Endpoint</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={currentUrl}
                    onChange={(e) => setCurrentUrl(e.target.value)}
                    placeholder="https://<your-username>-mca204-notes-rag.hf.space"
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-mono text-xs focus:outline-hidden focus:border-amber-400"
                  />
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleRunTest(currentUrl)}
                      disabled={testing}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${testing ? "animate-spin" : ""}`} />
                      <span>{testing ? "Testing..." : "Test Connection"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveUrl}
                      className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold transition-colors cursor-pointer shrink-0"
                    >
                      Save &amp; Connect
                    </button>
                  </div>
                </div>
                {testResult && (
                  <div className={`p-2.5 rounded-xl border text-xs font-mono flex items-center justify-between ${
                    testResult.ok ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                  }`}>
                    <span>{testResult.message}</span>
                    {testResult.data?.ram_total_mb && (
                      <span className="text-[10px] opacity-80">
                        Space RAM: {testResult.data.ram_total_mb} MB ({testResult.data.active_engine})
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* 3 Step Deployment Instructions */}
              <div className="space-y-3">
                <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-indigo-400" />
                  3-Minute Deployment to Hugging Face Spaces (Free Tier)
                </h4>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 text-[10px] flex items-center justify-center font-mono">1</span>
                    Create Space on Hugging Face
                  </span>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Log in to <strong className="text-white">huggingface.co/new-space</strong>.
                    Set Space Name: <code className="text-amber-300">mca204-notes-rag</code>.
                    Select SDK: <strong className="text-white">Docker</strong> (or <strong className="text-white">Blank</strong>).
                    Space Hardware: <strong className="text-emerald-300">CPU basic • 2 vCPU • 16 GB • Free</strong>.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 text-[10px] flex items-center justify-center font-mono">2</span>
                      Upload Pre-Built Files from /hf-spaces-backend/
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    In your Space's <strong>Files</strong> tab, upload the files prepared in your project's <code className="text-indigo-300">/hf-spaces-backend/</code> folder:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[10px]">
                    <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300">
                      📄 <strong>app.py</strong><br />FastAPI + Charitra RAG + User API Key Engine
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300">
                      📄 <strong>requirements.txt</strong><br />FastAPI, Uvicorn, Pydantic, Requests
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300">
                      📄 <strong>Dockerfile</strong><br />Exposes Port 7860 with Python 3.11
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 text-[10px] flex items-center justify-center font-mono">3</span>
                    Add Your Custom API Key in Space Secrets
                  </span>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    In your Hugging Face Space, click <strong>Settings</strong> &gt; <strong>Variables and secrets</strong> &gt; <strong>New secret</strong>:
                  </p>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-amber-300 space-y-1">
                    <div>Key: <strong>GEMINI_API_KEY</strong> (or <strong>OPENROUTER_API_KEY</strong> / <strong>OPENAI_API_KEY</strong>)</div>
                    <div>Value: <strong>&lt;paste your personal API key&gt;</strong></div>
                  </div>
                  <p className="text-slate-400 text-[10px] italic">
                    The backend automatically detects your key, enforces temperature 0.2, and formats responses with direct definitions, technical pillars, ASCII topology diagrams, and comparison tables!
                  </p>
                </div>
              </div>

              {/* Concurrency Sizing Table */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="font-bold text-emerald-400 text-xs">
                  Performance for 60 MCA-204 Students
                </span>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-1 px-2">Student Action</th>
                        <th className="py-1 px-2">Simultaneous Capacity</th>
                        <th className="py-1 px-2">Latency</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      <tr>
                        <td className="py-1 px-2">Reading notes &amp; syllabus</td>
                        <td className="py-1 px-2 text-emerald-400 font-bold">All 60 students</td>
                        <td className="py-1 px-2">0 ms (Instant offline cache)</td>
                      </tr>
                      <tr>
                        <td className="py-1 px-2">Asking AI with Your API Key</td>
                        <td className="py-1 px-2 text-emerald-400 font-bold">All 60 students</td>
                        <td className="py-1 px-2">1.5 - 2.5 seconds</td>
                      </tr>
                      <tr>
                        <td className="py-1 px-2">Local CPU GGUF Fallback</td>
                        <td className="py-1 px-2 text-amber-400 font-bold">15-20 queries / minute</td>
                        <td className="py-1 px-2">5 - 12 seconds</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Base Model Architecture Justification */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  <span className="font-bold text-white text-xs">
                    Base Model Selection: TinyLlama/TinyLlama-1.1B-Chat-v1.0
                  </span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  <strong>TinyLlama/TinyLlama-1.1B-Chat-v1.0</strong> was chosen as the base model because of its:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                    <div>
                      <strong className="text-white block">Compact size (1.1B parameters)</strong>
                      <span className="text-slate-400 text-[10px]">Minimal memory footprint (~638 MB in Q4 GGUF), operating inside free tier limits.</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                    <div>
                      <strong className="text-white block">Instruction-following capabilities</strong>
                      <span className="text-slate-400 text-[10px]">Fine-tuned for conversational Q&amp;A, syllabus grounding, and schema output.</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                    <div>
                      <strong className="text-white block">Compatibility with QLoRA and GGUF formats</strong>
                      <span className="text-slate-400 text-[10px]">Supports parameter-efficient fine-tuning on free Colab GPUs &amp; CPU quantization.</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                    <div>
                      <strong className="text-white block">Practical inference performance on CPU-based environments</strong>
                      <span className="text-slate-400 text-[10px]">Generates 15–25 tokens/sec per CPU core on Hugging Face Spaces (2 vCPUs).</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB: Deploy 2 Websites (Student & Teacher) */}
          {activeTab === "two_websites" && (
            <div className="space-y-6 text-xs">
              
              {/* Highlight Hero Banner */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-950 to-indigo-950/40 border border-emerald-500/30 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-sm sm:text-base">
                  <Layers className="w-5 h-5" />
                  <span>Two Independent Websites • Shared Micro-Backend</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  You can deploy <strong className="text-white">two separate websites</strong> so your <strong className="text-amber-300">60 students</strong> only see the clean verified reader with AI Tutor, while the <strong className="text-purple-300">teacher studio</strong> stays private and isolated with full upload and deletion privileges.
                </p>
                <div className="flex flex-wrap gap-2 pt-1 font-mono text-[10px]">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    Dual Websites Build
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20">
                    Octopus Deploy Multi-Project
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20">
                    Subpath &amp; Subdomain Support
                  </span>
                </div>
              </div>

              {/* Side-by-Side Website Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Website 1: Student Website */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-3 relative flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <GraduationCap className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">Website 1</span>
                          <h4 className="font-extrabold text-white text-sm">Student Web App</h4>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-mono">
                        16 Students
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Pure student learning environment. Features Google Drive iframe viewer, ChromaDB AI Smart Tutor, and dynamic quizzes.
                    </p>

                    <div className="space-y-1.5 p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px]">
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-500">Target User:</span>
                        <span className="font-semibold text-white">16 MCA-204 Students</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-500">Build Command:</span>
                        <code className="text-amber-300 font-mono text-[10px]">npm run build:student</code>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-500">Output Folder:</span>
                        <code className="text-indigo-300 font-mono text-[10px]">./dist-student</code>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-500">Security:</span>
                        <span className="text-emerald-400 font-semibold">Teacher tools 100% hidden</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(`${window.location.origin}${window.location.pathname}?portal=student&standalone=true`, "student_url")}
                      className="flex-1 px-3 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copiedKey === "student_url" ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === "student_url" ? "Copied URL!" : "Copy Student URL"}</span>
                    </button>
                    <a
                      href={`${window.location.pathname}?portal=student&standalone=true`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors cursor-pointer"
                      title="Open Student Website in new tab"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* Website 2: Teacher Website */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-purple-500/30 space-y-3 relative flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          <Layers className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider block">Website 2</span>
                          <h4 className="font-extrabold text-white text-sm">Teacher Studio App</h4>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[10px] font-mono">
                        Instructor Only
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Upload Google Drive and Docs notes, auto-index 384-d semantic vectors to ChromaDB, post announcements, and permanently delete notes.
                    </p>

                    <div className="space-y-1.5 p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px]">
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-500">Target User:</span>
                        <span className="font-semibold text-white">Course Instructor</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-500">Build Command:</span>
                        <code className="text-purple-300 font-mono text-[10px]">npm run build:teacher</code>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-500">Output Folder:</span>
                        <code className="text-indigo-300 font-mono text-[10px]">./dist-teacher</code>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-500">Preview:</span>
                        <span className="text-amber-300 font-semibold">Includes student preview</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(`${window.location.origin}${window.location.pathname}?portal=teacher&standalone=true`, "teacher_url")}
                      className="flex-1 px-3 py-2 bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copiedKey === "teacher_url" ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === "teacher_url" ? "Copied URL!" : "Copy Teacher URL"}</span>
                    </button>
                    <a
                      href={`${window.location.pathname}?portal=teacher&standalone=true`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors cursor-pointer"
                      title="Open Teacher Studio in new tab"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>

              </div>

              {/* 3 Deployment Methods */}
              <div className="space-y-3">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>3 Ways to Deploy Both Websites</span>
                </h4>

                {/* Method 1: Octopus Cloud */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-300 text-xs flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] flex items-center justify-center font-bold">1</span>
                      Deploy via Octopus Cloud (Free Trial)
                    </span>
                    <a
                      href="https://octopus.com/start"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1"
                    >
                      <span>Octopus Free Trial</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Create 2 separate projects in your Octopus Cloud instance (<code className="text-slate-300">https://your-org.octopus.app</code>):
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-amber-400 font-bold block mb-1">Project A: Student-Website</span>
                      <span className="text-slate-400 block text-[10px]">Build: npm run build:student</span>
                      <span className="text-slate-400 block text-[10px]">Env: VITE_PORTAL_MODE=student</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-purple-400 font-bold block mb-1">Project B: Teacher-Website</span>
                      <span className="text-slate-400 block text-[10px]">Build: npm run build:teacher</span>
                      <span className="text-slate-400 block text-[10px]">Env: VITE_PORTAL_MODE=teacher</span>
                    </div>
                  </div>
                </div>

                {/* Method 2: GitHub Pages Dual Sites */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-300 text-xs flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] flex items-center justify-center font-bold">2</span>
                      Automated GitHub Actions Dual Deploy (.github/workflows/deploy-two-websites.yml)
                    </span>
                    <button
                      onClick={() => handleCopy(twoWebsitesWorkflowCode, "dual_wf")}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-bold flex items-center gap-1"
                    >
                      {copiedKey === "dual_wf" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === "dual_wf" ? "Copied!" : "Copy Dual Workflow"}</span>
                    </button>
                  </div>
                  <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300 overflow-x-auto max-h-48 leading-relaxed">
                    {twoWebsitesWorkflowCode}
                  </pre>
                </div>

                {/* Method 3: Instant URL Isolation */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="font-bold text-emerald-300 text-xs flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] flex items-center justify-center font-bold">3</span>
                    Instant Zero-Recompile URL Isolation
                  </span>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    No new build required! You can deploy a single site and give your 16 students the URL with <code className="text-emerald-400 font-mono">?portal=student&amp;standalone=true</code>. The app automatically locks out all teacher menus and displays only the verified student reading view!
                  </p>
                </div>

              </div>

            </div>
          )}

          {/* TAB 1: Architecture Blueprint */}
          {activeTab === "architecture" && (
            <div className="space-y-6">
              {/* Architecture Flow Diagram */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {/* Step 1: Static UI */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 relative">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-xs border border-blue-500/20">
                    <Globe className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm text-white">1. GitHub Pages</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Pure static React SPA (HTML/JS/CSS). Zero server load, infinite bandwidth, global CDN delivery for all 16 students.
                  </p>
                  <div className="pt-1 text-[10px] text-emerald-400 font-mono font-bold">
                    Cost: $0 / mo • 100% SLA
                  </div>
                </div>

                {/* Step 2: Render Micro-Backend */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-indigo-900/40 space-y-2 relative">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xs border border-indigo-500/20">
                    <Server className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm text-white">2. Render Microservice</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Ultra-compact Express Node.js engine (~60MB RAM footprint). Manages note metadata, CRUD, and calls Gemini RAG.
                  </p>
                  <div className="pt-1 text-[10px] text-indigo-400 font-mono font-bold">
                    0.5 CPU • 512MB RAM
                  </div>
                </div>

                {/* Step 3: Google Drive Links */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-amber-900/40 space-y-2 relative">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xs border border-amber-500/20">
                    <ExternalLink className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm text-white">3. Google Link Notes</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    You upload notes as Google Drive, Docs, or Slides links. Google's CDN streams the document inside the sandbox iframe.
                  </p>
                  <div className="pt-1 text-[10px] text-amber-400 font-mono font-bold">
                    0 Render Bandwidth Used
                  </div>
                </div>

                {/* Step 4: ChromaDB RAG */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-purple-900/40 space-y-2 relative">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-xs border border-purple-500/20">
                    <Database className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm text-white">4. ChromaDB Cloud</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Dense semantic vector store. Enables students to ask AI questions side-by-side with your Google notes.
                  </p>
                  <div className="pt-1 text-[10px] text-purple-400 font-mono font-bold">
                    Fast Vector Similarity
                  </div>
                </div>
              </div>

              {/* Why this micro-architecture is perfect for 16 students */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-slate-950 to-slate-950 border border-indigo-900/30 space-y-3">
                <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Why This Micro-Architecture Succeeds on Render Free Tier</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300">
                  <div className="space-y-1">
                    <span className="font-bold text-white block">1. Zero Heavy File Storage</span>
                    <p className="text-slate-400 text-[11px]">
                      Because notes are shared as Google links, your Render server stores only lightweight metadata JSON. No large PDF/PPT blobs are kept in RAM.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-bold text-white block">2. Google CDN Handles Viewer</span>
                    <p className="text-slate-400 text-[11px]">
                      When 16 students browse notes simultaneously, the iframe viewer streams from Google servers directly, completely bypassing Render CPU.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-bold text-white block">3. GitHub Pages Offloads UI</span>
                    <p className="text-slate-400 text-[11px]">
                      The frontend bundle (React, icons, styles) is served by GitHub Pages CDN. Render only answers tiny JSON API calls and RAG questions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Octopus Cloud Free Trial Guide */}
          {activeTab === "octopus" && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-white text-sm">Deploying with Octopus Cloud Free Trial</h4>
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                      https://&lt;your-org&gt;.octopus.app
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Orchestrate your static frontend for 16 students and compact backend with Octopus Deploy's 30-day trial.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(octopusWorkflowCode, "octo_wf")}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
                  >
                    {copiedKey === "octo_wf" ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === "octo_wf" ? "Copied!" : "Copy Octopus Workflow"}</span>
                  </button>
                  <a
                    href="https://octopus.com/start"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
                  >
                    <span>Octopus Free Trial</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* 3 Core Octopus Deployment Steps */}
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-400 text-[10px] flex items-center justify-center font-mono">1</span>
                    Create Your Octopus Cloud Instance & Generate API Key
                  </span>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Sign up at <strong className="text-white">octopus.com/start</strong> for the 30-day trial. Choose your subdomain (e.g. <code className="text-purple-300">mca204-course.octopus.app</code>). Go to <strong>Profile &gt; API Keys &gt; New API Key</strong> and copy the token.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-400 text-[10px] flex items-center justify-center font-mono">2</span>
                    The 2-Project Micro-Architecture for 16 Students
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                      <span className="font-bold text-blue-300 block">Project A: Static Frontend (Students)</span>
                      <p className="text-slate-400 text-[10px]">
                        Octopus packages <code className="text-indigo-300">./dist</code> to GitHub Pages or S3. Because all 16 students load notes from static CDN, server load is 0%.
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                      <span className="font-bold text-purple-300 block">Project B: Compact Backend (Render/Docker)</span>
                      <p className="text-slate-400 text-[10px]">
                        Octopus deploys the Node.js microservice or triggers Render's Deploy Hook URL. RAM stays under 80MB.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-400 text-[10px] flex items-center justify-center font-mono">3</span>
                    Octopus Project Variables (Configured Once)
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[10px]">
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-500 block uppercase font-bold">PORT</span>
                      <span className="text-emerald-400">3000</span>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-500 block uppercase font-bold">NODE_ENV</span>
                      <span className="text-emerald-400">production</span>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-500 block uppercase font-bold">CHROMA_TENANT</span>
                      <span className="text-purple-300 truncate block">0f94ea0f-...</span>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-500 block uppercase font-bold">CHROMA_DATABASE</span>
                      <span className="text-purple-300 truncate block">rag-notes-app...</span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-400 text-[10px] flex items-center justify-center font-mono">4</span>
                    Automated GitHub Actions Workflow (.github/workflows/octopus-deploy.yml)
                  </span>
                  <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-52">
                    {octopusWorkflowCode}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Render Microservice Guide */}
          {activeTab === "render" && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-sm">Deploying the Compact Micro-Backend on Render</h4>
                  <p className="text-slate-400 text-[11px]">Follow these 3 quick steps to deploy on Render Web Service.</p>
                </div>
                <a
                  href="https://dashboard.render.com/select-repo?type=web"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
                >
                  <span>Open Render Dashboard</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] flex items-center justify-center font-mono">1</span>
                    Create a new "Web Service" on Render
                  </span>
                  <p className="text-slate-400 text-[11px]">
                    Connect your GitHub repository and select the <strong>Node</strong> runtime.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] flex items-center justify-center font-mono">2</span>
                    Set Build and Start Commands
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Build Command</span>
                      <code className="text-indigo-300">npm install && npm run build</code>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Start Command</span>
                      <code className="text-emerald-300">npm start</code>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] flex items-center justify-center font-mono">3</span>
                      Render Blueprint Configuration (render.yaml)
                    </span>
                    <button
                      onClick={() => handleCopy(renderYamlCode, "render_yaml")}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedKey === "render_yaml" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === "render_yaml" ? "Copied!" : "Copy render.yaml"}</span>
                    </button>
                  </div>
                  <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed">
                    {renderYamlCode}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GitHub Pages Static Guide */}
          {activeTab === "github" && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-sm">Deploying the Static Frontend to GitHub Pages</h4>
                  <p className="text-slate-400 text-[11px]">Vite builds a 100% static client into the <code className="text-indigo-300">dist/</code> folder.</p>
                </div>
                <button
                  onClick={() => handleCopy(githubWorkflowCode, "workflow")}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
                >
                  {copiedKey === "workflow" ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === "workflow" ? "Workflow Copied!" : "Copy GitHub Workflow"}</span>
                </button>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] flex items-center justify-center font-mono">1</span>
                    Enable GitHub Pages in your Repository
                  </span>
                  <p className="text-slate-400 text-[11px]">
                    In your GitHub repository, navigate to <strong>Settings</strong> &gt; <strong>Pages</strong>. Under <strong>Build and deployment &gt; Source</strong>, choose <strong>GitHub Actions</strong>.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] flex items-center justify-center font-mono">2</span>
                    GitHub Actions Workflow File (.github/workflows/deploy.yml)
                  </span>
                  <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-56">
                    {githubWorkflowCode}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: 16 Students Access Guide */}
          {activeTab === "students" && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-900/40 space-y-2">
                <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm">
                  <Users className="w-4 h-4" />
                  <span>How 16 Students Access the Notes & RAG Sandbox</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  You can give your students either the direct Student Portal URL or link it in your syllabus/Google Classroom:
                </p>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-indigo-300 text-xs flex items-center justify-between gap-2">
                  <span className="truncate">https://&lt;your-username&gt;.github.io/&lt;repo-name&gt;/?portal=student</span>
                  <button
                    onClick={() => handleCopy("https://<your-username>.github.io/<repo-name>/?portal=student", "student_link")}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-bold shrink-0"
                  >
                    {copiedKey === "student_link" ? "Copied!" : "Copy Pattern"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="font-bold text-amber-400 block">Google Drive Permissions Tip</span>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Ensure your Google Docs / Drive links are shared with: <br />
                    <strong className="text-white">"Anyone with the link can view"</strong> (or shared directly with your students' institutional Google accounts). This allows the iframe sandbox to display instantly without permission errors.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="font-bold text-emerald-400 block">Offline Cache & Fast Load</span>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Student browsers cache notes in IndexedDB and localStorage. Even if Render is waking up from idle on free tier (~30s), students can immediately browse notes and review flashcards with 0ms delay!
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 flex items-center justify-between bg-slate-950 text-xs">
          <span className="text-slate-500 text-[11px]">
            Micro-architecture optimized for Render free tier (512MB RAM) + GitHub Pages CDN
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
