import React, { useState } from "react";
import { Search, Layers, Columns } from "lucide-react";
import { TableData } from "../types";

interface Props {
  table: TableData;
}

export const CloudComparisonTable: React.FC<Props> = ({ table }) => {
  const [search, setSearch] = useState<string>("");
  const [highlightColumn, setHighlightColumn] = useState<number | null>(1); // Default highlight AWS (col 1)

  const filteredRows = table.rows.filter(row => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return row.some(cell => String(cell).toLowerCase().includes(q));
  });

  return (
    <div className="my-8 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm text-xs">
      <div className="p-4 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-amber-500" />
          <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
            {table.title}
          </h4>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter features..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      <div className="p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-2 text-[11px] text-slate-500 px-4">
        <Columns className="w-3.5 h-3.5 text-amber-500" />
        <span>Highlight Provider Column:</span>
        {table.headers.slice(1).map((provider, idx) => (
          <button
            key={provider}
            onClick={() => setHighlightColumn(highlightColumn === idx + 1 ? null : idx + 1)}
            className={`px-2 py-0.5 rounded font-medium transition-colors ${
              highlightColumn === idx + 1
                ? "bg-amber-500 text-slate-950 font-bold"
                : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300"
            }`}
          >
            {provider}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-800 text-white border-b border-slate-700">
              {table.headers.map((h, i) => (
                <th
                  key={h}
                  className={`p-3 font-semibold ${
                    highlightColumn === i ? "bg-amber-500/20 text-amber-300 border-x border-amber-500/40" : ""
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
            {filteredRows.length > 0 ? (
              filteredRows.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  {row.map((cell, colIndex) => (
                    <td
                      key={colIndex}
                      className={`p-3 ${
                        colIndex === 0 ? "font-semibold text-slate-900 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-900/50" : ""
                      } ${
                        highlightColumn === colIndex ? "bg-amber-500/10 dark:bg-amber-500/15 font-medium border-x border-amber-500/20" : ""
                      }`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={table.headers.length} className="p-6 text-center text-slate-500">
                  No matching features found for "{search}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {table.caption && (
        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 text-center">
          {table.caption}
        </div>
      )}
    </div>
  );
};
