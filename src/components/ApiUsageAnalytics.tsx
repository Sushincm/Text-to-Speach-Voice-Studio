import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  ArrowLeft,
  RefreshCw,
  Clock,
  Activity,
  FileText,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface AnalyticsData {
  quota: {
    freeTier: {
      dailyLimit: number;
      rpmLimit: number;
      usedToday: number;
      remainingToday: number;
      percentageRemaining: number;
    };
    proTier: {
      dailyLimit: number;
      rpmLimit: number;
      usedToday: number;
      remainingToday: number;
      percentageRemaining: number;
    };
    secondsUntilReset: number;
  };
  metrics: {
    todayGenerations: number;
    totalGenerationsAllTime: number;
    totalCharsSynthesized: number;
    activeModel: string;
    currentTier: string;
  };
  charts: {
    dailyHistory: {
      date: string;
      label: string;
      ttsCount: number;
      polishCount: number;
      total: number;
      chars: number;
    }[];
    hourlyUsageToday: {
      hour: string;
      count: number;
    }[];
    modelDistribution: Record<string, number>;
  };
  recentLogs: {
    id: string;
    timestamp: number;
    date: string;
    type: 'tts' | 'polish';
    model: string;
    charCount: number;
    durationSec?: number;
    status: 'success' | 'error';
  }[];
}

interface ApiUsageAnalyticsProps {
  onBackToStudio: () => void;
  authToken: string | null;
}

export const ApiUsageAnalytics: React.FC<ApiUsageAnalyticsProps> = ({
  onBackToStudio,
  authToken,
}) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [selectedTier, setSelectedTier] = useState<'free' | 'pro'>('free');
  const [chartMetric, setChartMetric] = useState<'requests' | 'chars'>('requests');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/analytics/stats', {
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch analytics stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 20000);
    return () => clearInterval(interval);
  }, [authToken]);

  const formatCountdown = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const activeQuota =
    selectedTier === 'free'
      ? data?.quota.freeTier || {
          dailyLimit: 1500,
          rpmLimit: 15,
          usedToday: 0,
          remainingToday: 1500,
          percentageRemaining: 100,
        }
      : data?.quota.proTier || {
          dailyLimit: 10000,
          rpmLimit: 1000,
          usedToday: 0,
          remainingToday: 10000,
          percentageRemaining: 100,
        };

  const maxChartValue = data?.charts.dailyHistory
    ? Math.max(
        ...data.charts.dailyHistory.map((d) =>
          chartMetric === 'requests' ? d.total : d.chars
        ),
        chartMetric === 'requests' ? 5 : 1000
      )
    : 10;

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 flex flex-col antialiased">
      {/* SaaS Top Header */}
      <header className="border-b border-zinc-200/90 dark:border-zinc-800/90 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToStudio}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 text-xs font-mono transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Studio</span>
            </button>
            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
              API Quota & Usage
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={fetchStats}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 border border-zinc-200 dark:border-zinc-800 text-xs font-mono transition-colors cursor-pointer shadow-xs"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <ThemeToggle showLabel />

            <span className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
              Live Monitor
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* Tier Policy Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div>
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
              API Quota Tier Policy
            </span>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              Select tier to calculate exact remaining quota and rate limits.
            </p>
          </div>

          <div className="inline-flex p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-mono">
            <button
              type="button"
              onClick={() => setSelectedTier('free')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                selectedTier === 'free'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              Free Tier (1,500 RPD)
            </button>
            <button
              type="button"
              onClick={() => setSelectedTier('pro')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                selectedTier === 'pro'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              Pro Tier (10,000 RPD)
            </button>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Remaining Generations */}
          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 space-y-2 shadow-xs">
            <div className="flex justify-between items-center text-xs text-zinc-500 dark:text-zinc-400 font-mono">
              <span>REMAINING TODAY</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                {activeQuota.percentageRemaining}%
              </span>
            </div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 font-mono">
              {activeQuota.remainingToday.toLocaleString()}
            </div>
            <div className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
              out of {activeQuota.dailyLimit.toLocaleString()} requests/day
            </div>
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-zinc-900 dark:bg-zinc-100 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, activeQuota.percentageRemaining)}%` }}
              />
            </div>
          </div>

          {/* Card 2: Used Today */}
          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 space-y-2 shadow-xs">
            <div className="flex justify-between items-center text-xs text-zinc-500 dark:text-zinc-400 font-mono">
              <span>USED TODAY</span>
              <Activity className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
            </div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 font-mono">
              {activeQuota.usedToday}{' '}
              <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">requests</span>
            </div>
            <div className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
              Limit: {activeQuota.rpmLimit} req/min cap
            </div>
            <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono">
              Cost: $0.00 (Free of Charge)
            </div>
          </div>

          {/* Card 3: Narrated Characters */}
          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 space-y-2 shadow-xs">
            <div className="flex justify-between items-center text-xs text-zinc-500 dark:text-zinc-400 font-mono">
              <span>CHARACTERS NARRATED</span>
              <FileText className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
            </div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 font-mono">
              {(data?.metrics.totalCharsSynthesized || 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
              All-time takes: {data?.metrics.totalGenerationsAllTime || 0}
            </div>
          </div>

          {/* Card 4: Daily Reset */}
          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 space-y-2 shadow-xs">
            <div className="flex justify-between items-center text-xs text-zinc-500 dark:text-zinc-400 font-mono">
              <span>DAILY RESET</span>
              <Clock className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
            </div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 font-mono">
              {formatCountdown(data?.quota.secondsUntilReset || 36000)}
            </div>
            <div className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
              Resets daily at 00:00 UTC
            </div>
          </div>
        </div>

        {/* Minimalist 7-Day Bar Diagram */}
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-800 dark:text-zinc-200 font-mono">
                Daily Generation Volume (7-Day Bar Diagram)
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Activity log across voice generation takes and script polish requests.
              </p>
            </div>

            <div className="inline-flex p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[11px] font-mono">
              <button
                type="button"
                onClick={() => setChartMetric('requests')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  chartMetric === 'requests'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                Requests
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('chars')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  chartMetric === 'chars'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                Characters
              </button>
            </div>
          </div>

          {/* Bar Canvas */}
          <div className="pt-2">
            <div className="h-48 flex items-end justify-between gap-2 sm:gap-6 px-2 sm:px-4 border-b border-zinc-200 dark:border-zinc-800 pb-2">
              {data?.charts.dailyHistory.map((item, idx) => {
                const val = chartMetric === 'requests' ? item.total : item.chars;
                const heightPct = Math.max(10, Math.round((val / maxChartValue) * 100));
                const isHovered = hoveredBar === idx;

                return (
                  <div
                    key={item.date}
                    className="flex-1 flex flex-col items-center h-full justify-end group relative"
                    onMouseEnter={() => setHoveredBar(idx)}
                    onMouseLeave={() => setHoveredBar(null)}
                  >
                    {/* Tooltip */}
                    {isHovered && (
                      <div className="absolute -top-16 z-30 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg p-2 shadow-xl text-center whitespace-nowrap font-mono text-[11px] pointer-events-none">
                        <div className="font-semibold">{item.label}</div>
                        <div className="text-zinc-300 dark:text-zinc-600 text-[10px]">
                          {item.ttsCount} takes • {item.chars} chars
                        </div>
                      </div>
                    )}

                    <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400 mb-1">
                      {val > 0 ? val : '0'}
                    </span>

                    <div
                      className="w-full max-w-[40px] bg-zinc-900 hover:bg-zinc-700 dark:bg-zinc-100 dark:hover:bg-zinc-300 rounded-t-md transition-colors"
                      style={{ height: `${heightPct}%` }}
                    />

                    <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 mt-2 truncate">
                      {item.label.split(',')[0]}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 dark:text-zinc-500 pt-3">
              <span>Daily Quota: {activeQuota.remainingToday.toLocaleString()} generations left</span>
              <span>Metric Scale: 0 – {maxChartValue} {chartMetric}</span>
            </div>
          </div>
        </section>

        {/* 2-Column: Hourly Distribution & Quota Specs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Hourly Distribution */}
          <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-800 dark:text-zinc-200 font-mono">
                Today's Hourly Distribution
              </h3>
              <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">24 Hours</span>
            </div>

            <div className="pt-1">
              <div className="h-24 flex items-end justify-between gap-1 border-b border-zinc-200 dark:border-zinc-800 pb-1">
                {data?.charts.hourlyUsageToday.map((h) => {
                  const maxHourly = Math.max(...(data?.charts.hourlyUsageToday.map((x) => x.count) || [1]), 3);
                  const hPct = h.count > 0 ? Math.max(25, Math.round((h.count / maxHourly) * 100)) : 8;
                  return (
                    <div key={h.hour} className="flex-1 flex flex-col items-center h-full justify-end">
                      <div
                        className={`w-full rounded-t-xs ${h.count > 0 ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-zinc-100 dark:bg-zinc-800'}`}
                        style={{ height: `${hPct}%` }}
                        title={`${h.hour}: ${h.count} requests`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400 dark:text-zinc-500 pt-1">
                <span>00:00</span>
                <span>06:00</span>
                <span>12:00</span>
                <span>18:00</span>
                <span>23:59</span>
              </div>
            </div>
          </section>

          {/* Quota Specs */}
          <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-2.5 shadow-xs">
            <div className="border-b border-zinc-100 dark:border-zinc-800 pb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-800 dark:text-zinc-200 font-mono">
                Gemini API Specifications
              </h3>
            </div>
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/70 dark:border-zinc-800/80">
                <span className="text-zinc-600 dark:text-zinc-400">Free Daily Limit:</span>
                <span className="text-zinc-900 dark:text-zinc-100 font-semibold">1,500 Requests / Day</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/70 dark:border-zinc-800/80">
                <span className="text-zinc-600 dark:text-zinc-400">Rate Cap:</span>
                <span className="text-zinc-900 dark:text-zinc-100 font-semibold">15 Requests / Minute</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/70 dark:border-zinc-800/80">
                <span className="text-zinc-600 dark:text-zinc-400">Throughput:</span>
                <span className="text-zinc-900 dark:text-zinc-100 font-semibold">1,000,000 TPM</span>
              </div>
            </div>
          </section>
        </div>

        {/* Request Activity Log */}
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3 shadow-xs">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-800 dark:text-zinc-200 font-mono">
              Request Activity Log
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 text-[10px]">
                  <th className="py-2.5 px-3">TIME</th>
                  <th className="py-2.5 px-3">OPERATION</th>
                  <th className="py-2.5 px-3">MODEL</th>
                  <th className="py-2.5 px-3">SIZE</th>
                  <th className="py-2.5 px-3">DURATION</th>
                  <th className="py-2.5 px-3 text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
                {data?.recentLogs && data.recentLogs.length > 0 ? (
                  data.recentLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors">
                      <td className="py-2.5 px-3 text-zinc-500 dark:text-zinc-400">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-zinc-900 dark:text-zinc-100">
                        {log.type === 'tts' ? 'TTS Voice' : 'Polish Script'}
                      </td>
                      <td className="py-2.5 px-3 text-zinc-600 dark:text-zinc-300">
                        {log.model}
                      </td>
                      <td className="py-2.5 px-3 text-zinc-500 dark:text-zinc-400">
                        {log.charCount > 0 ? `${log.charCount} chars` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-zinc-800 dark:text-zinc-200 font-medium">
                        {log.durationSec ? `${log.durationSec}s` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {log.status === 'success' ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-medium text-[11px]">200 OK</span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400 font-medium text-[11px]">Error</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-zinc-400 dark:text-zinc-500">
                      No logs recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-4 px-6 text-center text-xs text-zinc-400 dark:text-zinc-500 font-mono">
        Gemini Free Tier Monitor • 1,500 RPD Standard
      </footer>
    </div>
  );
};
