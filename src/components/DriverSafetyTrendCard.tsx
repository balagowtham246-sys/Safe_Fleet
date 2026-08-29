import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertOctagon,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Info,
  Clock,
  Activity,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import { Driver, SafetyEvent } from '../types';
import { computeDriverSafetyTrend } from '../utils/driverTrendAnalytics';
import { getRiskBadgeColor, getRiskLevelFromScore } from '../utils/riskEngine';

interface DriverSafetyTrendCardProps {
  driver: Driver;
  incidents: SafetyEvent[];
  onOpenLiveMonitoring?: (driver: Driver) => void;
}

export const DriverSafetyTrendCard: React.FC<DriverSafetyTrendCardProps> = ({
  driver,
  incidents,
  onOpenLiveMonitoring,
}) => {
  const stats = computeDriverSafetyTrend(driver, incidents);
  const avgRiskLevel = getRiskLevelFromScore(stats.averageRiskScore);
  const riskBadge = getRiskBadgeColor(avgRiskLevel);

  // If driver has 0 incidents, render the required empty state
  if (stats.totalIncidents === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-[#1E293B] p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <img
              src={driver.avatar}
              alt={driver.name}
              referrerPolicy="no-referrer"
              className="h-12 w-12 rounded-full object-cover ring-2 ring-slate-700"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">{driver.name}</h3>
                <span className="rounded bg-slate-900 px-2 py-0.5 text-xs font-mono text-blue-400 border border-slate-800">
                  {driver.id}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Assigned Vehicle: <strong className="text-slate-200">{driver.assignedVehicleReg}</strong> • License: {driver.licenseNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-slate-900 border border-slate-800 px-2.5 py-1 text-[11px] font-mono text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
              Firestore Live
            </span>
          </div>
        </div>

        {/* Empty state message */}
        <div className="mt-6 flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-900/60 p-8 text-center">
          <ShieldCheck className="h-12 w-12 text-emerald-400 mb-3" />
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            NO RECORDED SAFETY INCIDENTS
          </h4>
          <p className="mt-2 max-w-md text-xs text-slate-400 leading-relaxed">
            This driver currently has no recorded safety incidents in Cloud Firestore.
            Historical trend analysis and behavior breakdown will become available automatically as real monitoring events are recorded.
          </p>
          {onOpenLiveMonitoring && (
            <button
              onClick={() => onOpenLiveMonitoring(driver)}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-md shadow-blue-900/30 transition-all"
            >
              Simulate Live Drive in Telemetry Monitor
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-[#1E293B] p-5 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <img
            src={driver.avatar}
            alt={driver.name}
            referrerPolicy="no-referrer"
            className="h-12 w-12 rounded-full object-cover ring-2 ring-blue-500/40"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-400 bg-blue-950/60 border border-blue-800/40 px-2 py-0.5 rounded">
                Driver Safety Trend
              </span>
              <h3 className="text-base font-bold text-white">{driver.name}</h3>
              <span className="rounded bg-slate-900 px-2 py-0.5 text-xs font-mono text-slate-300 border border-slate-800">
                {driver.id}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Vehicle: <strong className="text-slate-200">{driver.assignedVehicleReg}</strong> • License: {driver.licenseNumber} • Trips: {driver.totalTrips}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-slate-900 border border-slate-800 px-2.5 py-1 text-[11px] font-mono text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Firestore Realtime
          </span>
          {onOpenLiveMonitoring && (
            <button
              onClick={() => onOpenLiveMonitoring(driver)}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 shadow-md shadow-blue-900/30 transition-all"
            >
              Live Monitor
            </button>
          )}
        </div>
      </div>

      {/* Top 4 Core Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Incidents */}
        <div className="rounded-lg bg-slate-900 p-3 border border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Recorded Incidents
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-white">
              {stats.totalIncidents}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">events in DB</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Traceable to Firestore
          </span>
        </div>

        {/* Average Recorded Risk */}
        <div className="rounded-lg bg-slate-900 p-3 border border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Average Recorded Risk
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-white">
              {stats.averageRiskScore}
            </span>
            <span className="text-xs text-slate-500 font-normal">/ 100</span>
          </div>
          <span className={`inline-block mt-0.5 rounded px-1.5 py-0.2 text-[10px] font-bold uppercase border ${riskBadge.bg} ${riskBadge.text} ${riskBadge.border}`}>
            {avgRiskLevel}
          </span>
        </div>

        {/* Most Frequent Risk */}
        <div className="rounded-lg bg-slate-900 p-3 border border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Most Frequent Risk
          </span>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="text-sm font-bold text-amber-300 truncate">
              {stats.mostFrequentFactor || 'None'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            {stats.sortedFactors[0] ? `${stats.sortedFactors[0].count} occurrences (${stats.sortedFactors[0].percentage}%)` : 'No behavioral risk'}
          </span>
        </div>

        {/* Trend Indicator */}
        <div className="rounded-lg bg-slate-900 p-3 border border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Incident Risk Trend
          </span>
          <div className="mt-1 flex items-center gap-1.5">
            {stats.trendState === 'WORSENING' && (
              <span className="flex items-center gap-1 text-sm font-bold text-red-400">
                <TrendingUp className="h-4 w-4 shrink-0" />
                ↑ Worsening
              </span>
            )}
            {stats.trendState === 'IMPROVING' && (
              <span className="flex items-center gap-1 text-sm font-bold text-emerald-400">
                <TrendingDown className="h-4 w-4 shrink-0" />
                ↓ Improving
              </span>
            )}
            {stats.trendState === 'STABLE' && (
              <span className="flex items-center gap-1 text-sm font-bold text-blue-400">
                <Minus className="h-4 w-4 shrink-0" />
                → Stable
              </span>
            )}
            {stats.trendState === 'INSUFFICIENT_DATA' && (
              <span className="flex items-center gap-1 text-xs font-semibold text-slate-400">
                <Info className="h-3.5 w-3.5 shrink-0" />
                Insufficient data
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
            {stats.hasEnoughDataForTrend ? 'Recent vs Prev Period' : 'Requires ≥ 2 events'}
          </span>
        </div>
      </div>

      {/* Middle Section: Incident Factor Breakdown & Severity Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Incident Factor Breakdown */}
        <div className="rounded-lg bg-slate-900 p-4 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-blue-400" />
              Incident Behavior Breakdown
            </h4>
            <span className="text-[10px] text-slate-500 font-mono">
              {stats.sortedFactors.length} Factors Identified
            </span>
          </div>

          {stats.sortedFactors.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-2">No categorized factors.</p>
          ) : (
            <div className="space-y-2.5">
              {stats.sortedFactors.map((item, idx) => {
                const maxCount = Math.max(...stats.sortedFactors.map((f) => f.count), 1);
                const barWidth = Math.max(12, Math.round((item.count / maxCount) * 100));

                let barColor = 'bg-blue-500';
                if (item.factor === 'Drowsiness') barColor = 'bg-red-500';
                else if (item.factor === 'Speeding') barColor = 'bg-yellow-400';
                else if (item.factor === 'Distraction') barColor = 'bg-orange-400';
                else if (item.factor === 'Harsh Braking') barColor = 'bg-cyan-400';
                else if (item.factor === 'Night Driving') barColor = 'bg-purple-400';

                return (
                  <div key={`${item.factor}-${idx}`} className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span className="font-medium text-slate-200">{item.factor}</span>
                      <span className="font-mono font-bold text-slate-300">
                        {item.count} <span className="text-[10px] text-slate-500 font-normal">({item.percentage}%)</span>
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full ${barColor} transition-all duration-500`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Severity Distribution */}
        <div className="rounded-lg bg-slate-900 p-4 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
              Recorded Severity Distribution
            </h4>
            <span className="text-[10px] text-slate-500 font-mono">
              Deterministic Rules
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* SAFE */}
            <div className="rounded-lg bg-emerald-950/20 border border-emerald-900/40 p-2.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-400 block">
                  SAFE (0–39)
                </span>
                <span className="text-xl font-bold font-mono text-emerald-300">
                  {stats.severityCounts.SAFE}
                </span>
              </div>
              <ShieldCheck className="h-5 w-5 text-emerald-400/40" />
            </div>

            {/* MODERATE */}
            <div className="rounded-lg bg-blue-950/20 border border-blue-900/40 p-2.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-blue-400 block">
                  MODERATE (40–69)
                </span>
                <span className="text-xl font-bold font-mono text-blue-300">
                  {stats.severityCounts.MODERATE}
                </span>
              </div>
              <Info className="h-5 w-5 text-blue-400/40" />
            </div>

            {/* HIGH */}
            <div className="rounded-lg bg-amber-950/20 border border-amber-900/40 p-2.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-amber-400 block">
                  HIGH (70–84)
                </span>
                <span className="text-xl font-bold font-mono text-amber-300">
                  {stats.severityCounts.HIGH}
                </span>
              </div>
              <AlertTriangle className="h-5 w-5 text-amber-400/40" />
            </div>

            {/* CRITICAL */}
            <div className="rounded-lg bg-red-950/20 border border-red-900/40 p-2.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-red-400 block">
                  CRITICAL (85–100)
                </span>
                <span className="text-xl font-bold font-mono text-red-300">
                  {stats.severityCounts.CRITICAL}
                </span>
              </div>
              <AlertOctagon className="h-5 w-5 text-red-400/40" />
            </div>
          </div>

          <p className="text-[10px] text-slate-400 leading-tight">
            Severity classification is strictly governed by the authoritative deterministic risk engine thresholds.
          </p>
        </div>
      </div>

      {/* Safety Insight Callout */}
      <div className="rounded-lg border border-blue-900/40 bg-blue-950/20 p-3.5 flex items-start gap-3">
        <AlertCircle className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5 text-xs">
          <strong className="text-blue-300 font-semibold block">Safety Intelligence Insight</strong>
          <p className="text-slate-200 leading-relaxed">{stats.safetyInsight}</p>
        </div>
      </div>

      {/* Chronological Risk Score Trend Plot */}
      <div className="rounded-lg bg-slate-900 p-4 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Chronological Incident Risk Trajectory
            </h4>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            {stats.chronologicalIncidents.length} Data Points
          </span>
        </div>

        {stats.chronologicalIncidents.length < 2 ? (
          <div className="py-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">
            Insufficient historical data ({stats.chronologicalIncidents.length} recorded incident).
            A continuous risk trend line requires at least 2 recorded incidents in Firestore.
          </div>
        ) : (
          <div className="space-y-3">
            {/* Visual Point Trail */}
            <div className="relative pt-6 pb-2 px-3">
              {/* Reference Grid lines */}
              <div className="absolute inset-x-3 top-6 bottom-4 border-b border-t border-slate-800/60 pointer-events-none flex flex-col justify-between">
                <span className="text-[9px] text-red-400/50 font-mono -mt-2.5">Critical (85+)</span>
                <span className="text-[9px] text-amber-400/50 font-mono">High (70)</span>
                <span className="text-[9px] text-emerald-400/50 font-mono -mb-2">Safe (0-39)</span>
              </div>

              {/* Incidents Sequence */}
              <div className="relative z-10 flex items-center justify-between gap-2 overflow-x-auto py-2">
                {stats.chronologicalIncidents.map((inc, i) => {
                  const sevColor = getRiskBadgeColor(inc.severity);
                  return (
                    <div
                      key={inc.id || i}
                      className="flex flex-col items-center min-w-[72px] text-center group cursor-pointer"
                      title={`${inc.timestamp}: ${inc.description} (Risk: ${inc.riskScore})`}
                    >
                      <span className="text-[10px] font-mono font-bold text-white bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 group-hover:border-blue-500 transition-colors">
                        {inc.riskScore}
                      </span>
                      <div className={`mt-1.5 h-3.5 w-3.5 rounded-full border-2 ${sevColor.border} ${sevColor.bg} flex items-center justify-center ring-2 ring-slate-900 group-hover:scale-125 transition-transform`} />
                      <span className="mt-1 text-[9px] font-mono text-slate-400 truncate max-w-[68px]">
                        {inc.timestamp}
                      </span>
                      <span className={`text-[8px] font-bold uppercase mt-0.5 ${sevColor.text}`}>
                        {inc.severity}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Incident Log summary table for this driver */}
            <div className="mt-2 divide-y divide-slate-800 border-t border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-2 block mb-1">
                Recent Incident Log:
              </span>
              {stats.chronologicalIncidents.slice(-3).reverse().map((inc) => {
                const sevBadge = getRiskBadgeColor(inc.severity);
                return (
                  <div key={inc.id} className="py-1.5 flex items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-2 truncate">
                      <span className={`px-1.5 py-0.2 text-[9px] font-bold uppercase rounded border ${sevBadge.bg} ${sevBadge.text} ${sevBadge.border}`}>
                        {inc.severity}
                      </span>
                      <span className="text-slate-300 truncate">{inc.description}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 font-mono text-[11px] text-slate-400">
                      <span className="text-white font-bold">{inc.riskScore} pts</span>
                      <span>{inc.timestamp}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
