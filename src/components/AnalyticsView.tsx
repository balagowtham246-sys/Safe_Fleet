import React from 'react';
import { BarChart3, ShieldCheck, AlertTriangle, Clock, Radio, Activity, Send, CheckCircle2 } from 'lucide-react';
import { Driver, Vehicle, SafetyEvent } from '../types';

interface AnalyticsViewProps {
  vehicles: Vehicle[];
  drivers: Driver[];
  events?: SafetyEvent[];
  isSimulating?: boolean;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  vehicles,
  drivers,
  events = [],
  isSimulating = false,
}) => {
  // Current fleet risk distribution
  const totalVehicles = vehicles.length;
  const safeCount = vehicles.filter((v) => v.riskLevel === 'SAFE').length;
  const modCount = vehicles.filter((v) => v.riskLevel === 'MODERATE').length;
  const highCount = vehicles.filter((v) => v.riskLevel === 'HIGH').length;
  const critCount = vehicles.filter((v) => v.riskLevel === 'CRITICAL').length;

  const safePercent = totalVehicles > 0 ? Math.round((safeCount / totalVehicles) * 100) : 0;
  const modPercent = totalVehicles > 0 ? Math.round((modCount / totalVehicles) * 100) : 0;
  const highPercent = totalVehicles > 0 ? Math.round((highCount / totalVehicles) * 100) : 0;
  const critPercent = totalVehicles > 0 ? Math.round((critCount / totalVehicles) * 100) : 0;

  // Average current fleet risk score
  const validVehicleScores = vehicles
    .map((v) => v.riskScore)
    .filter((s): s is number => typeof s === 'number' && !isNaN(s));
  const avgFleetRiskScore =
    validVehicleScores.length > 0
      ? (validVehicleScores.reduce((acc, val) => acc + val, 0) / validVehicleScores.length).toFixed(1)
      : null;

  // Total incidents & counts by type computed from actual events (or driver records)
  const totalIncidents = events.length > 0
    ? events.length
    : drivers.reduce((acc, d) => acc + (d.incidentCount || 0), 0);

  // Incidents by type from actual events
  let speedingCount = 0;
  let drowsinessCount = 0;
  let distractionCount = 0;
  let harshBrakingCount = 0;

  if (events.length > 0) {
    events.forEach((e) => {
      const allText = `${e.eventType || ''} ${e.description || ''} ${(e.factors || []).join(' ')}`.toLowerCase();
      if (allText.includes('speed')) speedingCount++;
      if (allText.includes('drows') || allText.includes('fatigue') || allText.includes('sleep') || allText.includes('eye')) drowsinessCount++;
      if (allText.includes('distract') || allText.includes('phone') || allText.includes('device')) distractionCount++;
      if (allText.includes('brak') || allText.includes('decel') || allText.includes('tailgat')) harshBrakingCount++;
    });
  } else {
    // Fallback to driver breakdown records
    speedingCount = drivers.reduce((acc, d) => acc + (d.breakdown?.speeding || 0), 0);
    drowsinessCount = drivers.reduce((acc, d) => acc + (d.breakdown?.drowsiness || 0), 0);
    distractionCount = drivers.reduce((acc, d) => acc + (d.breakdown?.distraction || 0), 0);
    harshBrakingCount = drivers.reduce((acc, d) => acc + (d.breakdown?.harshBraking || 0), 0);
  }

  const categorizedTotal = speedingCount + drowsinessCount + distractionCount + harshBrakingCount;
  const denominator = categorizedTotal > 0 ? categorizedTotal : (totalIncidents > 0 ? totalIncidents : 1);

  const speedPercent = categorizedTotal > 0 ? Math.round((speedingCount / denominator) * 100) : 0;
  const drowsyPercent = categorizedTotal > 0 ? Math.round((drowsinessCount / denominator) * 100) : 0;
  const distractPercent = categorizedTotal > 0 ? Math.round((distractionCount / denominator) * 100) : 0;
  const brakePercent = categorizedTotal > 0 ? Math.round((harshBrakingCount / denominator) * 100) : 0;

  // Number of interventions issued
  const totalInterventions = events.filter(
    (e) => Boolean(e.actionTaken && e.actionTaken.trim().length > 0 && e.actionTaken !== 'None' && e.actionTaken !== 'Monitoring')
  ).length;

  // Number of critical incidents
  const criticalIncidentsCount = events.filter((e) => e.severity === 'CRITICAL').length;

  // Time-of-day Incident Distribution based on actual event timestamps
  const timeBuckets = [
    { label: '00:00–04:00', startH: 0, endH: 4, count: 0 },
    { label: '04:00–08:00', startH: 4, endH: 8, count: 0 },
    { label: '08:00–12:00', startH: 8, endH: 12, count: 0 },
    { label: '12:00–16:00', startH: 12, endH: 16, count: 0 },
    { label: '16:00–20:00', startH: 16, endH: 20, count: 0 },
    { label: '20:00–24:00', startH: 20, endH: 24, count: 0 },
  ];

  events.forEach((e) => {
    if (!e.timestamp) return;
    const parts = e.timestamp.split(':');
    if (parts.length > 0) {
      const hour = parseInt(parts[0], 10);
      if (!isNaN(hour)) {
        const bucket = timeBuckets.find((b) => hour >= b.startH && hour < b.endH);
        if (bucket) bucket.count++;
      }
    }
  });

  const maxBucketCount = Math.max(...timeBuckets.map((b) => b.count), 1);
  const hasEventTimeData = events.some((e) => Boolean(e.timestamp && e.timestamp.includes(':')));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#1E293B] p-4 shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Fleet Safety Intelligence &amp; Measured Analytics
            </h2>
            <p className="text-xs text-slate-400">
              Aggregated metrics computed directly from Firestore application records
            </p>
          </div>
        </div>
        {isSimulating ? (
          <span className="rounded bg-amber-950/80 px-2.5 py-1 text-[11px] font-semibold text-amber-300 border border-amber-700/50">
            Simulation Data
          </span>
        ) : (
          <span className="rounded bg-emerald-950/80 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 border border-emerald-700/50">
            Live Fleet Data
          </span>
        )}
      </div>

      {/* Top 4 Performance Cards with Actual Computed Values */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Average Current Fleet Risk Score */}
        <div className="rounded-xl border border-slate-800 bg-[#1E293B] p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Avg Fleet Risk Score
            </span>
            <ShieldCheck className="h-4 w-4 text-blue-400" />
          </div>
          <div className="mt-2 text-3xl font-extrabold font-mono text-white">
            {avgFleetRiskScore !== null ? (
              <>
                {avgFleetRiskScore} <span className="text-sm text-slate-500 font-normal">/ 100</span>
              </>
            ) : (
              <span className="text-sm text-slate-400 font-normal">N/A — insufficient historical data</span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Calculated across {totalVehicles} active fleet units
          </p>
        </div>

        {/* 2. Number of Interventions Issued */}
        <div className="rounded-xl border border-slate-800 bg-[#1E293B] p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Interventions Issued
            </span>
            <Send className="h-4 w-4 text-blue-400" />
          </div>
          <div className="mt-2 text-3xl font-extrabold font-mono text-blue-400">
            {totalInterventions}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Dispatched in-cab driver safety alerts
          </p>
        </div>

        {/* 3. Total Logged Safety Incidents */}
        <div className="rounded-xl border border-slate-800 bg-[#1E293B] p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Total Logged Incidents
            </span>
            <AlertTriangle className="h-4 w-4 text-orange-400" />
          </div>
          <div className="mt-2 text-3xl font-extrabold font-mono text-orange-400">
            {totalIncidents}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Recorded in database audit log
          </p>
        </div>

        {/* 4. Number of Critical Incidents */}
        <div className="rounded-xl border border-slate-800 bg-[#1E293B] p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Critical Incidents
            </span>
            <Activity className="h-4 w-4 text-red-400" />
          </div>
          <div className="mt-2 text-3xl font-extrabold font-mono text-red-400">
            {criticalIncidentsCount}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            High-severity compound risk events
          </p>
        </div>
      </div>

      {/* Main Analytical Visualizations */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Incident Frequency by Time of Day (7 Cols) */}
        <div className="rounded-xl border border-slate-800 bg-[#1E293B] p-5 shadow-lg lg:col-span-7 flex flex-col justify-between">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-400" />
                  Recorded Incidents by Time of Day
                </h3>
                <p className="text-xs text-slate-300">
                  Distribution of {events.length} safety incidents by recorded timestamp
                </p>
              </div>
              <span className="rounded bg-slate-900 px-2 py-0.5 text-[10px] font-mono text-slate-300 border border-slate-700">
                {events.length} Event{events.length !== 1 ? 's' : ''}
              </span>
            </div>

            {hasEventTimeData ? (
              <div className="mt-6 flex h-44 items-end gap-3 sm:gap-4 border-b border-slate-800 pb-2">
                {timeBuckets.map((bucket, idx) => {
                  const heightPercent = maxBucketCount > 0 ? Math.max((bucket.count / maxBucketCount) * 100, bucket.count > 0 ? 12 : 4) : 4;
                  return (
                    <div key={idx} className="flex flex-1 flex-col items-center gap-1 group relative">
                      {/* Tooltip */}
                      <div className="absolute -top-7 hidden rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-mono text-white border border-slate-700 group-hover:block z-10 whitespace-nowrap">
                        {bucket.count} incident{bucket.count !== 1 ? 's' : ''}
                      </div>

                      <div className="w-full rounded-t-md bg-slate-900/60 relative h-32 flex items-end">
                        <div
                          className={`w-full rounded-t-md transition-all duration-500 ${
                            bucket.count > 0 ? 'bg-blue-500 shadow-sm' : 'bg-slate-800'
                          }`}
                          style={{ height: `${bucket.count > 0 ? heightPercent : 4}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 text-center leading-tight mt-1">
                        {bucket.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-44 flex-col items-center justify-center rounded-lg bg-slate-900/50 border border-slate-800/80 p-6 text-center">
                <Clock className="h-6 w-6 text-slate-600 mb-2" />
                <p className="text-xs text-slate-400 font-medium">N/A — insufficient historical data</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Time-of-day distribution populates as incidents are recorded in the database
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 rounded-lg bg-slate-900/80 p-3 border border-slate-800 text-xs text-slate-400">
            <strong className="text-slate-300">Data Source:</strong> Active Firestore events collection ({events.length} records analyzed).
          </div>
        </div>

        {/* Incidents by Type Breakdown (5 Cols) */}
        <div className="rounded-xl border border-slate-800 bg-[#1E293B] p-5 shadow-lg lg:col-span-5 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
              Incidents by Hazard Type
            </h3>
            <p className="text-xs text-slate-300 mb-4">
              Breakdown across recorded fleet safety events
            </p>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                  <span>Speeding</span>
                  <span className="font-mono text-yellow-400">
                    {speedingCount} ({speedPercent}%)
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                  <div className="h-full bg-yellow-400" style={{ width: `${speedPercent}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                  <span>Drowsiness</span>
                  <span className="font-mono text-red-400">
                    {drowsinessCount} ({drowsyPercent}%)
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                  <div className="h-full bg-red-500" style={{ width: `${drowsyPercent}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                  <span>Distraction</span>
                  <span className="font-mono text-orange-400">
                    {distractionCount} ({distractPercent}%)
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                  <div className="h-full bg-orange-400" style={{ width: `${distractPercent}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                  <span>Harsh Braking</span>
                  <span className="font-mono text-blue-400">
                    {harshBrakingCount} ({brakePercent}%)
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                  <div className="h-full bg-blue-500" style={{ width: `${brakePercent}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-slate-900/80 p-3 border border-slate-800 text-xs text-slate-400">
            <strong className="text-slate-300">Hazard Analysis:</strong> Total of {categorizedTotal} categorized hazard triggers identified across recorded logs.
          </div>
        </div>
      </div>

      {/* Fleet Risk Distribution Section */}
      <div className="rounded-xl border border-slate-800 bg-[#1E293B] p-5 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Current Fleet Risk Distribution
            </h3>
            <p className="text-xs text-slate-300">
              Live status categorization across all {totalVehicles} tracked commercial units
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {totalVehicles} Units Total
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-slate-900 p-3 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold mb-1">
              <span>SAFE (0–39 pts)</span>
              <span className="font-mono">{safeCount} ({safePercent}%)</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${safePercent}%` }} />
            </div>
          </div>

          <div className="rounded-lg bg-slate-900 p-3 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-yellow-400 font-semibold mb-1">
              <span>MODERATE (40–69 pts)</span>
              <span className="font-mono">{modCount} ({modPercent}%)</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-yellow-400" style={{ width: `${modPercent}%` }} />
            </div>
          </div>

          <div className="rounded-lg bg-slate-900 p-3 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-orange-400 font-semibold mb-1">
              <span>HIGH (70–84 pts)</span>
              <span className="font-mono">{highCount} ({highPercent}%)</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-orange-500" style={{ width: `${highPercent}%` }} />
            </div>
          </div>

          <div className="rounded-lg bg-slate-900 p-3 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-red-400 font-semibold mb-1">
              <span>CRITICAL (85–100 pts)</span>
              <span className="font-mono">{critCount} ({critPercent}%)</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-red-500" style={{ width: `${critPercent}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

