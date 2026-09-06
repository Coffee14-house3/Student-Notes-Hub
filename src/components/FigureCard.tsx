import React, { useState } from "react";
import { 
  Image as ImageIcon, Eye, Sparkles, Filter, Terminal, Activity, 
  Layers, CheckCircle2, Server, Database, Network, ChevronRight, 
  Maximize2, X, Download, RefreshCw, Cpu, HardDrive
} from "lucide-react";

interface Props {
  rawLine: string;
}

export const FigureCard: React.FC<Props> = ({ rawLine }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"visual" | "hex" | "analysis">("visual");
  const [selectedPacket, setSelectedPacket] = useState<number>(2);
  const [filterText, setFilterText] = useState<string>("ip.addr == 192.168.1.105");
  const [showAiModal, setShowAiModal] = useState<boolean>(false);

  // Parse figure ID and description from raw string
  // e.g. "Fig 8.5 Protocol file analyzer page-1" -> figId: "Fig 8.5", caption: "Protocol file analyzer page-1"
  const match = rawLine.match(/^(Fig(?:ure|\.)?\s*[\d\.]+[\w\.-]*)\s*[:\-\s]?\s*(.*)/i);
  const figureId = match?.[1] ? match[1].trim() : "Figure";
  const figureCaption = match?.[2] ? match[2].trim() : rawLine.replace(/^(Fig(?:ure|\.)?\s*[\d\.]+)/i, "").trim() || rawLine;

  const isProtocolAnalyzer = /protocol|analyzer|wireshark|pcap|packet|network|trace|frame/i.test(rawLine);
  const isArchitecture = /architecture|flow|system|diagram|vpc|cloud|layer|topology/i.test(rawLine);

  // Mock packets for protocol analyzer view
  const packets = [
    { id: 1, time: "0.000000", src: "192.168.1.105", dst: "10.0.0.1", proto: "TCP", len: 66, info: "54230 → 443 [SYN] Seq=0 Win=64240 Len=0 MSS=1460", color: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
    { id: 2, time: "0.012431", src: "10.0.0.1", dst: "192.168.1.105", proto: "TCP", len: 66, info: "443 → 54230 [SYN, ACK] Seq=0 Ack=1 Win=65535 Len=0", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
    { id: 3, time: "0.012890", src: "192.168.1.105", dst: "10.0.0.1", proto: "TLSv1.3", len: 512, info: "Client Hello, Length: 446 bytes", color: "bg-purple-500/10 text-purple-400 border-purple-500/30" },
    { id: 4, time: "0.024105", src: "10.0.0.1", dst: "192.168.1.105", proto: "HTTP/2", len: 1420, info: "200 OK (application/json) - Protocol Analysis Data", color: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
    { id: 5, time: "0.035122", src: "192.168.1.105", dst: "8.8.8.8", proto: "DNS", len: 78, info: "Standard query 0x3f1a A wireshark-analyzer.org", color: "bg-sky-500/10 text-sky-400 border-sky-500/30" },
  ];

  const currentPkt = packets.find(p => p.id === selectedPacket) || packets[1];

  return (
    <div className="my-6 border border-amber-500/30 rounded-xl overflow-hidden bg-[#18181a] shadow-xl text-slate-100 font-sans">
      {/* Figure Top Navigation Header */}
      <div className="px-4 py-3 bg-[#222225] border-b border-[#333338] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="px-2.5 py-1 text-xs font-bold bg-amber-500 text-slate-950 rounded-md shadow-xs uppercase tracking-wide shrink-0">
            {figureId}
          </span>
          <h4 className="text-xs sm:text-sm font-bold text-slate-100 truncate">
            {figureCaption || "System Figure & Visualizer"}
          </h4>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex bg-[#141416] p-1 rounded-lg border border-[#333338] text-[11px]">
            <button
              onClick={() => setActiveTab("visual")}
              className={`px-2.5 py-1 rounded transition-colors font-semibold ${
                activeTab === "visual"
                  ? "bg-amber-500 text-slate-950 shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Interactive Preview
            </button>
            <button
              onClick={() => setActiveTab("hex")}
              className={`px-2.5 py-1 rounded transition-colors font-semibold ${
                activeTab === "hex"
                  ? "bg-amber-500 text-slate-950 shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Structure / Bytes
            </button>
          </div>

          <button
            onClick={() => setShowAiModal(true)}
            className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
            title="Explain Figure with AI"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">AI Explain</span>
          </button>

          <button
            onClick={() => setIsExpanded(true)}
            className="p-1.5 bg-[#2a2a2e] hover:bg-[#38383e] text-slate-300 rounded-lg transition-colors cursor-pointer"
            title="Expand Figure"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Canvas Body */}
      <div className="p-3 sm:p-5">
        {activeTab === "visual" && (
          <div>
            {isProtocolAnalyzer ? (
              /* Wireshark / Protocol Analyzer UI Frame */
              <div className="bg-[#0f0f12] border border-[#2d2d35] rounded-xl overflow-hidden text-xs font-mono shadow-inner">
                {/* Filter / Control Bar */}
                <div className="bg-[#1b1b22] px-3 py-2 border-b border-[#2d2d35] flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <span className="text-amber-400 font-bold flex items-center gap-1">
                      <Filter className="w-3.5 h-3.5" /> Filter:
                    </span>
                    <input
                      type="text"
                      value={filterText}
                      onChange={(e) => setFilterText(e.target.value)}
                      className="bg-[#0f0f12] text-emerald-400 border border-[#383842] rounded px-2 py-1 text-xs font-mono w-full focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span className="px-2 py-0.5 bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 rounded font-bold">
                      ● Live Capture Active
                    </span>
                    <span>Packets: 1,420</span>
                  </div>
                </div>

                {/* Packet Table List */}
                <div className="overflow-x-auto max-h-56 overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#18181f] text-slate-400 border-b border-[#2d2d35] text-[10px] uppercase tracking-wider font-sans">
                        <th className="p-2 w-12">No.</th>
                        <th className="p-2 w-20">Time</th>
                        <th className="p-2 w-28">Source</th>
                        <th className="p-2 w-28">Destination</th>
                        <th className="p-2 w-20">Protocol</th>
                        <th className="p-2 w-16">Length</th>
                        <th className="p-2">Info</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#23232c] text-[11px]">
                      {packets.map((pkt) => {
                        const isSel = pkt.id === selectedPacket;
                        return (
                          <tr
                            key={pkt.id}
                            onClick={() => setSelectedPacket(pkt.id)}
                            className={`cursor-pointer transition-colors ${
                              isSel 
                                ? "bg-amber-500/20 text-amber-200 border-l-4 border-amber-500 font-bold" 
                                : "hover:bg-[#1b1b24] text-slate-300"
                            }`}
                          >
                            <td className="p-2 text-slate-500">{pkt.id}</td>
                            <td className="p-2 text-slate-400">{pkt.time}</td>
                            <td className="p-2 text-sky-400">{pkt.src}</td>
                            <td className="p-2 text-sky-400">{pkt.dst}</td>
                            <td className="p-2">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${pkt.color}`}>
                                {pkt.proto}
                              </span>
                            </td>
                            <td className="p-2 text-slate-400">{pkt.len}</td>
                            <td className="p-2 text-slate-200 truncate max-w-xs">{pkt.info}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Packet Header Detail Box */}
                <div className="bg-[#141419] p-3 border-t border-[#2d2d35] text-[11px] font-sans space-y-1.5 text-slate-300">
                  <div className="text-amber-400 font-bold flex items-center justify-between border-b border-[#2d2d35] pb-1">
                    <span>Frame {currentPkt.id}: {currentPkt.len} bytes on wire ({currentPkt.len * 8} bits)</span>
                    <span className="text-[10px] text-slate-400 font-mono">Protocol: {currentPkt.proto}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono">
                    <div className="p-2 bg-[#0c0c0e] rounded border border-[#25252e]">
                      <span className="text-slate-500 font-bold">Ethernet II:</span> Src: 00:0c:29:ab:11:02, Dst: 00:50:56:c0:00:08
                    </div>
                    <div className="p-2 bg-[#0c0c0e] rounded border border-[#25252e]">
                      <span className="text-slate-500 font-bold">Internet Protocol V4:</span> Src: {currentPkt.src}, Dst: {currentPkt.dst}
                    </div>
                  </div>
                </div>
              </div>
            ) : isArchitecture ? (
              /* System Architecture Visualizer */
              <div className="bg-[#0f0f12] p-5 rounded-xl border border-[#2d2d35] text-center space-y-4">
                <div className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                  System Architecture & Data Flow Schematic
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-2">
                  <div className="p-4 bg-[#1a1a22] border border-[#333340] rounded-lg text-center space-y-2">
                    <Server className="w-6 h-6 text-sky-400 mx-auto" />
                    <div className="text-xs font-bold text-slate-100">Client / Analyzer GUI</div>
                    <div className="text-[10px] text-slate-400">Captures network traffic & packet data</div>
                  </div>
                  <div className="p-4 bg-[#1a1a22] border border-[#333340] rounded-lg text-center space-y-2">
                    <Cpu className="w-6 h-6 text-amber-400 mx-auto" />
                    <div className="text-xs font-bold text-slate-100">Dissector Engine</div>
                    <div className="text-[10px] text-slate-400">Decodes protocol headers & metadata</div>
                  </div>
                  <div className="p-4 bg-[#1a1a22] border border-[#333340] rounded-lg text-center space-y-2">
                    <Database className="w-6 h-6 text-emerald-400 mx-auto" />
                    <div className="text-xs font-bold text-slate-100">Report Storage</div>
                    <div className="text-[10px] text-slate-400">Generates network analysis logs</div>
                  </div>
                </div>
              </div>
            ) : (
              /* General Blueprint Visualizer */
              <div className="bg-[#0f0f12] p-5 rounded-xl border border-[#2d2d35] text-center space-y-3">
                <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-center mx-auto text-amber-400">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <div className="text-xs font-bold text-slate-100">
                  {figureId}: {figureCaption}
                </div>
                <p className="text-[11px] text-slate-400 max-w-md mx-auto leading-relaxed">
                  Extracted figure reference from uploaded PDF document. Click below to inspect structural breakdown or view AI analysis.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "hex" && (
          <div className="bg-[#0d0d10] p-4 rounded-xl border border-[#252530] font-mono text-xs text-emerald-400 overflow-x-auto space-y-1">
            <div className="text-slate-500 text-[10px] uppercase font-bold mb-2">Raw Packet Hexadecimal & ASCII Stream Dump</div>
            <div>0000  00 50 56 c0 00 08 00 0c 29 ab 11 02 08 00 45 00  .PV.....).....E.</div>
            <div>0010  00 3c 1c 46 40 00 40 06 b9 32 c0 a8 01 69 0a 00  .&lt;.F@.@..2...i..</div>
            <div>0020  00 01 d3 d6 01 bb 3a 1f b2 04 00 00 00 00 a0 02  ......:.........</div>
            <div>0030  fa f0 bc b0 00 00 02 04 05 b4 04 02 08 0a 41 cb  ..............A.</div>
            <div>0040  93 e1 00 00 00 00 01 03 03 07                   ..........</div>
          </div>
        )}
      </div>

      {/* Expanded Modal Overlay */}
      {isExpanded && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#18181c] border border-[#3a3a42] rounded-2xl w-full max-w-4xl p-5 space-y-4 relative shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#2d2d35] pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 text-xs font-bold bg-amber-500 text-slate-950 rounded">
                  {figureId}
                </span>
                <h3 className="text-sm sm:text-base font-bold text-white">
                  {figureCaption}
                </h3>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1.5 hover:bg-[#2c2c34] text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-[#0e0e11] rounded-xl border border-[#2a2a32] text-xs text-slate-300 space-y-3">
              <p className="font-semibold text-amber-400">Detailed Figure Overview & Context</p>
              <p className="leading-relaxed">
                This figure illustrates <strong className="text-white">{figureCaption}</strong> extracted from the uploaded project document. It depicts packet capture streams, protocol header structures, and analysis results for network traffic evaluation.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* AI Explain Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a20] border border-amber-500/40 rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#333340] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">AI Figure Explanation</h3>
              </div>
              <button onClick={() => setShowAiModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-200 leading-relaxed space-y-2 bg-[#121216] p-4 rounded-xl border border-[#2d2d38]">
              <p className="font-bold text-amber-400">{figureId}: {figureCaption}</p>
              <p>
                In standard PDF text extraction, figures (screenshots, charts, Wireshark packet captures, diagrams) are embedded as binary image objects. This interactive visualizer reconstructs the protocol analyzer interface and data structures referenced in your document.
              </p>
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[11px] text-amber-300 mt-2">
                💡 <strong>Key Takeaway:</strong> Demonstrates network packet filtering, protocol field parsing (TCP/IP, HTTP, DNS), and interface layouts used in network analysis reports.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
