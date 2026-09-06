import React from "react";
import { 
  BookOpen, Search, Sun, Moon, Sparkles, Download, 
  HelpCircle, Type, LayoutList, Layers
} from "lucide-react";
import { ReadingSettings, ReadingTheme, FontSize } from "../types";

interface Props {
  activeView: string;
  setActiveView: (view: string) => void;
  settings: ReadingSettings;
  setSettings: React.Dispatch<React.SetStateAction<ReadingSettings>>;
  onOpenSearch: () => void;
  onOpenAiChat: () => void;
  onOpenExport: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const Header: React.FC<Props> = ({
  activeView,
  setActiveView,
  settings,
  setSettings,
  onOpenSearch,
  onOpenAiChat,
  onOpenExport,
  sidebarOpen,
  setSidebarOpen
}) => {
  const toggleTheme = (theme: ReadingTheme) => {
    setSettings(prev => ({ ...prev, theme }));
  };

  const setFontSize = (fontSize: FontSize) => {
    setSettings(prev => ({ ...prev, fontSize }));
  };

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left Brand & Sidebar toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Toggle Table of Contents"
          >
            <LayoutList className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-500 text-slate-950 font-bold rounded-lg shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                AWS Cloud Notes Reader
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 hidden sm:block">
                Interactive HTML Reader & Architecture Visualizer
              </p>
            </div>
          </div>
        </div>

        {/* Center View Selector Tabs & Mobile Select Dropdown */}
        <div className="flex items-center gap-2">
          {/* Mobile/Tablet Dropdown */}
          <div className="lg:hidden flex items-center">
            <select
              value={activeView}
              onChange={(e) => setActiveView(e.target.value)}
              className="bg-amber-500/15 dark:bg-slate-800 text-amber-700 dark:text-amber-400 font-bold border border-amber-500/30 rounded-xl px-2.5 py-1.5 text-xs cursor-pointer focus:outline-none"
            >
              <option value="dashboard" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">🚀 Dashboard & Uploads</option>
              <option value="all-files" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">📚 All Files View (Combined)</option>
              <option value="note-lab-ec2" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">1. AWS EC2 Lab Manual</option>
              <option value="note-history-aws" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">2. History of AWS</option>
              <option value="note-identity-access" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">3. Identity & Sign-In Guide</option>
              <option value="note-datacenter-design" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">4. Data Centre Design</option>
              <option value="note-virtualization" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">5. Virtualization Concepts</option>
            </select>
          </div>

          {/* Desktop Tabs */}
          <div className="hidden lg:flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs font-medium gap-0.5">
            <button
              onClick={() => setActiveView("note-lab-ec2")}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                activeView === "note-lab-ec2"
                  ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 font-bold shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              1. EC2 Lab
            </button>
            <button
              onClick={() => setActiveView("note-history-aws")}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                activeView === "note-history-aws"
                  ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 font-bold shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              2. History of AWS
            </button>
            <button
              onClick={() => setActiveView("note-identity-access")}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                activeView === "note-identity-access"
                  ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 font-bold shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              3. Identity & Access
            </button>
            <button
              onClick={() => setActiveView("note-datacenter-design")}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                activeView === "note-datacenter-design"
                  ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 font-bold shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              4. DC Design
            </button>
            <button
              onClick={() => setActiveView("note-virtualization")}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                activeView === "note-virtualization"
                  ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 font-bold shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              5. Virtualization
            </button>
          </div>
        </div>

        {/* Right Tools */}
        <div className="flex items-center gap-2">
          {/* Quick Search */}
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Search Notes</span>
          </button>

          {/* AI Notes Assistant */}
          <button
            onClick={onOpenAiChat}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs hover:bg-amber-400 transition-colors shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ask AI</span>
          </button>

          {/* Theme & Font Controls Dropdown */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg">
            <button
              onClick={() => toggleTheme(settings.theme === "dark" ? "light" : "dark")}
              className="p-1 rounded text-slate-600 dark:text-slate-300 hover:text-amber-500"
              title="Toggle Light / Dark Mode"
            >
              {settings.theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1"></div>
            <button
              onClick={() => setFontSize(settings.fontSize === "sm" ? "md" : settings.fontSize === "md" ? "lg" : "sm")}
              className="p-1 rounded text-slate-600 dark:text-slate-300 hover:text-amber-500 font-bold text-xs"
              title="Change Text Size"
            >
              <Type className="w-4 h-4" />
            </button>
          </div>

          {/* Export / Print */}
          <button
            onClick={onOpenExport}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Export or Print HTML"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Selector Bar */}
      <div className="flex md:hidden items-center justify-around bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg text-[11px] font-medium mt-2">
        <button
          onClick={() => setActiveView("note-1")}
          className={`px-2 py-1 rounded ${activeView === "note-1" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-600 dark:text-slate-400"}`}
        >
          Note 1
        </button>
        <button
          onClick={() => setActiveView("note-2")}
          className={`px-2 py-1 rounded ${activeView === "note-2" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-600 dark:text-slate-400"}`}
        >
          Note 2
        </button>
        <button
          onClick={() => setActiveView("note-3")}
          className={`px-2 py-1 rounded ${activeView === "note-3" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-600 dark:text-slate-400"}`}
        >
          Note 3
        </button>
        <button
          onClick={() => setActiveView("note-4")}
          className={`px-2 py-1 rounded ${activeView === "note-4" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-600 dark:text-slate-400"}`}
        >
          Note 4
        </button>
      </div>
    </header>
  );
};
