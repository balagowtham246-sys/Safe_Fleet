import React, { useState } from 'react';
import {
  Users,
  Search,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  AlertOctagon,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Phone,
  CreditCard,
  Truck,
  X,
  FileCheck,
  RefreshCw,
  BarChart3,
  CheckCircle2,
} from 'lucide-react';
import { Driver, RiskLevel, SafetyEvent } from '../types';
import { getRiskBadgeColor } from '../utils/riskEngine';
import { DriverSafetyTrendCard } from './DriverSafetyTrendCard';
import { computeDriverSafetyTrend } from '../utils/driverTrendAnalytics';

interface DriversViewProps {
  drivers: Driver[];
  events: SafetyEvent[];
  onSelectDriverForMonitoring: (driver: Driver) => void;
}

export const DriversView: React.FC<DriversViewProps> = ({
  drivers,
  events,
  onSelectDriverForMonitoring,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDriverForTrend, setSelectedDriverForTrend] = useState<string>(
    drivers[0]?.id || 'DRV-8021'
  );
  const [selectedDriverModal, setSelectedDriverModal] = useState<Driver | null>(null);
  const [coachingPlan, setCoachingPlan] = useState<any | null>(null);
  const [isGeneratingAIPlan, setIsGeneratingAIPlan] = useState(false);

  const activeTrendDriver =
    drivers.find((d) => d.id === selectedDriverForTrend) || drivers[0] || null;

  const filteredDrivers = drivers.filter(
    (d) =>
      (d.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.licenseNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.assignedVehicleReg || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleGenerateCoaching = async (driver: Driver) => {
    setIsGeneratingAIPlan(true);
    try {
      const res = await fetch('/api/gemini/safety-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driver }),
      });
      const data = await res.json();
      setCoachingPlan(data);
    } catch (err) {
      console.warn('Error fetching coaching report:', err);
    } finally {
      setIsGeneratingAIPlan(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Active Driver Safety Trend Panel */}
      {activeTrendDriver && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-400" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-300">
                Driver Safety Trend Analytics
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Select Driver to Analyze:</span>
              <select
                value={selectedDriverForTrend}
                onChange={(e) => setSelectedDriverForTrend(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-semibold text-slate-200 focus:border-blue-500 focus:outline-none"
              >
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DriverSafetyTrendCard
            driver={activeTrendDriver}
            incidents={events}
            onOpenLiveMonitoring={onSelectDriverForMonitoring}
          />
        </div>
      )}

      {/* Directory Header & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#1E293B] p-4 shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">Commercial Fleet Drivers Directory</h2>
            <p className="text-xs text-slate-400">
              Select any driver to inspect their real-time Firestore trend and incident history
            </p>
          </div>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search driver, license, vehicle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Driver Cards Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {filteredDrivers.map((driver, idx) => {
          const colors = getRiskBadgeColor(driver.riskLevel);
          const isSelectedForTrend = driver.id === selectedDriverForTrend;
          const liveDriverStats = computeDriverSafetyTrend(driver, events);

          return (
            <div
              key={`driver-card-${driver.id || driver.name || idx}-${idx}`}
              onClick={() => setSelectedDriverForTrend(driver.id)}
              className={`flex flex-col justify-between rounded-xl border bg-[#1E293B] p-4 shadow-lg cursor-pointer transition-all ${
                isSelectedForTrend
                  ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-blue-950/40'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                {/* Driver Top Row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={driver.avatar}
                      alt={driver.name}
                      referrerPolicy="no-referrer"
                      className="h-11 w-11 rounded-full object-cover ring-2 ring-slate-700"
                    />
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                        {driver.name}
                        {isSelectedForTrend && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                        )}
                      </h3>
                      <span className="text-[11px] font-mono text-slate-400">
                        {driver.id}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-extrabold uppercase border ${colors.bg} ${colors.text} ${colors.border}`}
                  >
                    {driver.riskLevel}
                  </span>
                </div>

                {/* Score & Trend */}
                <div className="mt-3.5 flex items-center justify-between rounded-lg bg-slate-900 p-2.5 border border-slate-800">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Safety Score
                    </span>
                    <div className="text-xl font-extrabold font-mono text-white">
                      {driver.safetyScore} <span className="text-xs text-slate-500 font-normal">/ 100</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end">
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider">
                      Firestore Trend
                    </span>
                    <span
                      className={`text-xs font-bold ${
                        liveDriverStats.trendState === 'WORSENING'
                          ? 'text-red-400'
                          : liveDriverStats.trendState === 'IMPROVING'
                          ? 'text-emerald-400'
                          : liveDriverStats.trendState === 'STABLE'
                          ? 'text-blue-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {liveDriverStats.trendState === 'WORSENING' && '↑ Worsening'}
                      {liveDriverStats.trendState === 'IMPROVING' && '↓ Improving'}
                      {liveDriverStats.trendState === 'STABLE' && '→ Stable'}
                      {liveDriverStats.trendState === 'INSUFFICIENT_DATA' && 'No trend data'}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="mt-3 space-y-1 text-xs text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Truck className="h-3 w-3" /> Vehicle:
                    </span>
                    <span className="font-mono font-bold text-blue-400">
                      {driver.assignedVehicleReg}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <CreditCard className="h-3 w-3" /> License:
                    </span>
                    <span className="font-mono text-[11px] text-slate-300">
                      {driver.licenseNumber}
                    </span>
                  </div>
                </div>

                {/* Live Firestore Incident Count & Frequent Risk */}
                <div className="mt-3 border-t border-slate-800 pt-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400">
                      Firestore Incidents:
                    </span>
                    <span className="text-[11px] font-mono font-bold text-white">
                      {liveDriverStats.totalIncidents} events
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {liveDriverStats.sortedFactors.slice(0, 3).map((f) => (
                      <span
                        key={f.factor}
                        className="rounded bg-slate-900 border border-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300 font-medium"
                      >
                        {f.count} × {f.factor}
                      </span>
                    ))}
                    {liveDriverStats.sortedFactors.length === 0 && (
                      <span className="text-[10px] text-slate-500 italic">No logged events</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-4 flex gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => {
                    setSelectedDriverModal(driver);
                    setCoachingPlan(null);
                  }}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-all"
                >
                  <span>Profile &amp; AI</span>
                </button>
                <button
                  onClick={() => onSelectDriverForMonitoring(driver)}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-all shadow-md shadow-blue-900/30"
                >
                  <span>Monitor</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Driver Profile Deep-Dive Modal */}
      {selectedDriverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-slate-800 bg-[#1E293B] p-6 shadow-2xl space-y-5">
            {/* Close Button */}
            <button
              onClick={() => setSelectedDriverModal(null)}
              className="absolute right-4 top-4 rounded-lg bg-slate-800 p-1.5 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Profile Header */}
            <div className="flex items-center gap-4 border-b border-slate-800 pb-4">
              <img
                src={selectedDriverModal.avatar}
                alt={selectedDriverModal.name}
                referrerPolicy="no-referrer"
                className="h-16 w-16 rounded-full object-cover ring-2 ring-blue-500/40"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white">{selectedDriverModal.name}</h2>
                  <span className="rounded bg-slate-900 px-2 py-0.5 text-xs font-mono text-blue-400 border border-slate-800">
                    {selectedDriverModal.id}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Assigned Vehicle: <strong className="text-white">{selectedDriverModal.assignedVehicleReg}</strong> • License: {selectedDriverModal.licenseNumber}
                </p>
                <p className="text-xs text-slate-400">
                  Phone: {selectedDriverModal.phone} • Experience: {selectedDriverModal.experienceYears} Years
                </p>
              </div>
            </div>

            {/* Driver Safety Trend Breakdown inside Profile Modal */}
            <DriverSafetyTrendCard
              driver={selectedDriverModal}
              incidents={events}
            />

            {/* AI Coaching Plan Button & Generated Card */}
            <div className="mt-4">
              {!coachingPlan ? (
                <button
                  onClick={() => handleGenerateCoaching(selectedDriverModal)}
                  disabled={isGeneratingAIPlan}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-900/30 hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  {isGeneratingAIPlan ? (
                    <RefreshCw className="h-4 w-4 animate-spin text-white" />
                  ) : (
                    <Sparkles className="h-4 w-4 text-white" />
                  )}
                  <span>{isGeneratingAIPlan ? 'Generating Coaching Plan with Gemini AI...' : 'Generate Driver Safety Coaching Plan (Gemini AI)'}</span>
                </button>
              ) : (
                <div className="rounded-lg border border-blue-800/60 bg-blue-950/20 p-4 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-blue-300 font-bold">
                    <Sparkles className="h-4 w-4" />
                    <span>Personalized AI Safety Coaching Assessment</span>
                  </div>
                  <p className="text-slate-200 leading-relaxed">{coachingPlan.summary}</p>

                  {coachingPlan.improvementAreas && (
                    <div>
                      <strong className="text-orange-300">Target Coaching Areas:</strong>
                      <ul className="list-disc pl-4 text-slate-300 mt-1 space-y-0.5">
                        {coachingPlan.improvementAreas.map((area: string, i: number) => (
                          <li key={i}>{area}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {coachingPlan.trainingRecommendations && (
                    <div>
                      <strong className="text-emerald-300">Recommended Modules:</strong>
                      <ul className="list-disc pl-4 text-slate-300 mt-1 space-y-0.5">
                        {coachingPlan.trainingRecommendations.map((mod: string, i: number) => (
                          <li key={i}>{mod}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="mt-5 flex justify-end gap-2 border-t border-slate-800 pt-3">
              <button
                onClick={() => setSelectedDriverModal(null)}
                className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
              >
                Close
              </button>
              <button
                onClick={() => {
                  onSelectDriverForMonitoring(selectedDriverModal);
                  setSelectedDriverModal(null);
                }}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-md"
              >
                Open in Live Monitoring
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

