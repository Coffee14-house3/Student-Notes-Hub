import React, { useState } from "react";
import { DollarSign, Users, TrendingUp, Calculator } from "lucide-react";

export const CostCalculator: React.FC = () => {
  const [visitors, setVisitors] = useState<number>(500000);

  // Dynamic calculations based on Table 1.1 proportions
  const cdnRequests = (visitors / 100000) * 26; // M requests
  const cdnTrafficGb = (visitors / 100000) * 25; // GB
  const cdnCost = cdnRequests * 0.8 + cdnTrafficGb * 0.08 + 10;
  
  const webServers = Math.max(1, Math.ceil(visitors / 125000));
  const serverHours = webServers * 748;
  const webServerCost = serverHours * 0.0685;

  const dbCost = visitors > 300000 ? 170.66 : 42.56;
  const dbType = visitors > 300000 ? "Large Instance + 20 GB Storage" : "Small Instance + 20 GB Storage";

  const outgoingTrafficGb = (visitors / 100000) * 51;
  const trafficCost = outgoingTrafficGb * 0.09;

  const dnsRequests = (visitors / 100000) * 2;
  const dnsCost = dnsRequests * 0.45;

  const loadBalancerCost = 20.30;
  const staticFilesCost = 1.50;

  const totalCost = cdnCost + webServerCost + dbCost + trafficCost + dnsCost + loadBalancerCost + staticFilesCost;
  const costPerThousand = (totalCost / visitors) * 1000;

  return (
    <div className="my-8 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm text-xs">
      <div className="p-4 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-amber-500" />
          <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
            Table 1.1: Interactive Web Shop AWS Bill Simulator
          </h4>
        </div>
        <span className="text-slate-500 dark:text-slate-400">
          Based on John's E-Commerce AWS Case Study
        </span>
      </div>

      <div className="p-5 space-y-6">
        {/* Interactive Slider */}
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-3">
          <div className="flex justify-between items-center text-sm font-semibold text-slate-800 dark:text-slate-200">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-amber-500" /> Monthly Web Shop Visitors:
            </span>
            <span className="text-amber-600 dark:text-amber-400 font-bold text-base font-mono">
              {visitors.toLocaleString()} visitors
            </span>
          </div>
          <input
            type="range"
            min="50000"
            max="2000000"
            step="25000"
            value={visitors}
            onChange={(e) => setVisitors(Number(e.target.value))}
            className="w-full accent-amber-500 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-slate-500">
            <span>50,000 (Jan Baseline)</span>
            <span>500,000 (Feb Surge)</span>
            <span>2,000,000 (Hyper-Growth)</span>
          </div>
        </div>

        {/* Calculated Breakdown Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                <th className="p-2.5">AWS Service</th>
                <th className="p-2.5">Calculated Usage Scale</th>
                <th className="p-2.5">Estimated Monthly Cost (USD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
              <tr>
                <td className="p-2.5 font-medium">CDN (CloudFront)</td>
                <td className="p-2.5">{cdnRequests.toFixed(1)} M requests + {cdnTrafficGb.toFixed(0)} GB traffic</td>
                <td className="p-2.5 font-mono">${cdnCost.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="p-2.5 font-medium">Static File Storage (S3)</td>
                <td className="p-2.5">50 GB stored static assets</td>
                <td className="p-2.5 font-mono">${staticFilesCost.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="p-2.5 font-medium">Load Balancer (ELB)</td>
                <td className="p-2.5">748 hours + {(cdnTrafficGb * 2).toFixed(0)} GB traffic</td>
                <td className="p-2.5 font-mono">${loadBalancerCost.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="p-2.5 font-medium">Web Servers (EC2)</td>
                <td className="p-2.5">{webServers} server(s) = {serverHours.toLocaleString()} compute hours</td>
                <td className="p-2.5 font-mono">${webServerCost.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="p-2.5 font-medium">Database (RDS)</td>
                <td className="p-2.5">{dbType}</td>
                <td className="p-2.5 font-mono">${dbCost.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="p-2.5 font-medium">Outbound Internet Traffic</td>
                <td className="p-2.5">{outgoingTrafficGb.toFixed(0)} GB data transfer out</td>
                <td className="p-2.5 font-mono">${trafficCost.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="p-2.5 font-medium">DNS Queries (Route 53)</td>
                <td className="p-2.5">{dnsRequests.toFixed(1)} M DNS queries</td>
                <td className="p-2.5 font-mono">${dnsCost.toFixed(2)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white font-bold border-t-2 border-amber-500 text-sm">
                <td className="p-3">TOTAL ESTIMATED BILL</td>
                <td className="p-3 font-normal text-xs text-amber-300">
                  Unit Cost: <strong className="text-white">${costPerThousand.toFixed(2)}</strong> per 1,000 visitors
                </td>
                <td className="p-3 text-amber-400 font-mono text-base">${totalCost.toFixed(2)} USD</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
