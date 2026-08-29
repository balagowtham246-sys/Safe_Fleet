import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Zap,
} from 'lucide-react';
import { RiskEngineResult, TelemetryState } from '../types';
import { getRiskBadgeColor } from '../utils/riskEngine';

interface RiskGaugeCardProps {
  risk: RiskEngineResult;
  telemetry: TelemetryState;
  driverName: string;
  vehicleReg: string;
  onDispatchAction?: () => void;
}

export const RiskGaugeCard: React.FC<RiskGaugeCardProps> = ({
  risk,
  telemetry,
  driverName,
  vehicleReg,
}) => {
  const colors = getRiskBadgeColor(risk.level);

  return (
    <div className="flex flex-col rounded-xl border border-slate-800 bg-[#1E293B] p-5 shadow-lg">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg border ${colors.border} ${colors.bg} ${colors.glow}`}>
            {risk.level === 'CRITICAL' ? (
              <AlertOctagon className={`h-5 w-5 ${colors.text} animate-pulse`} />
            ) : risk.level === 'HIGH' ? (
              <AlertTriangle className={`h-5 w-5 ${colors.text}`} />
            ) : risk.level === 'MODERATE' ? (
              <ShieldAlert className={`h-5 w-5 ${colors.text}`} />
            ) : (
              <ShieldCheck className={`h-5 w-5 ${colors.text}`} />
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              Dynamic Compound Risk Engine
              {risk.compoundRiskDetected && (
                <span className="inline-flex items-center gap-1 rounded bg-red-500/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-red-400 border border-red-500/40 animate-pulse">
                  <Zap className="h-3 w-3 text-red-400" />
                  Compound Risk Multiplier Active
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              Multi-signal fusion: Vision + CAN-Bus Velocity + Spatial Context + Circadian Fatigue
            </p>
          </div>
        </div>

        {/* Engine Metadata Badge */}
        <div className="flex items-center gap-1.5">
          <span className="rounded-md bg-slate-900 border border-slate-800 px-2.5 py-1 text-xs font-mono text-slate-400">
            Deterministic Formula v2.4
          </span>
        </div>
      </div>

      {/* Main Score & Factor Split Layout */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left: Dynamic Risk Score Gauge (4 Cols) */}
        <div className="flex flex-col items-center justify-center rounded-lg border border-slate-800 bg-slate-900/90 p-5 lg:col-span-4">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Current Driver Risk
          </span>

          {/* Large Visual Score Dial */}
          <div className="relative my-3 flex h-36 w-36 items-center justify-center">
            {/* SVG Background Circle */}
            <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="42"
                className="stroke-slate-800"
                strokeWidth="10"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                className={`transition-all duration-700 ease-out ${
                  risk.level === 'CRITICAL'
                    ? 'stroke-red-500'
                    : risk.level === 'HIGH'
                    ? 'stroke-orange-500'
                    : risk.level === 'MODERATE'
                    ? 'stroke-yellow-400'
                    : 'stroke-emerald-500'
                }`}
                strokeWidth="10"
                strokeDasharray={264}
                strokeDashoffset={264 - (264 * risk.score) / 100}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>

            {/* Center Score Text */}
            <div className="absolute flex flex-col items-center justify-center">
              <span className={`text-4xl font-black font-mono tracking-tight ${colors.text}`}>
                {risk.score}
              </span>
              <span className="text-[11px] font-bold text-slate-400 uppercase">/ 100</span>
            </div>
          </div>

          {/* Risk Level Badge */}
          <div
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-extrabold tracking-wider uppercase border ${colors.bg} ${colors.text} ${colors.border} ${colors.glow}`}
          >
            <span className={`h-2 w-2 rounded-full ${colors.dot} ${risk.level === 'CRITICAL' ? 'animate-ping' : ''}`} />
            <span>{risk.level} RISK</span>
          </div>

          <div className="mt-3 text-center text-[11px] text-slate-400">
            {risk.score >= 85
              ? '85–100 Threshold: CRITICAL'
              : risk.score >= 70
              ? '70–84 Threshold: HIGH'
              : risk.score >= 40
              ? '40–69 Threshold: MODERATE'
              : '0–39 Threshold: SAFE'}
          </div>
        </div>

        {/* Right: Transparent Explainable Points Breakdown Table (8 Cols) */}
        <div className="flex flex-col justify-between rounded-lg border border-slate-800 bg-slate-900/90 p-4 lg:col-span-8">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Transparent Factor Breakdown (Additive &amp; Compound Fusion)
              </span>
              <span className="text-[11px] font-mono text-emerald-400">
                100% Reproducible Formula
              </span>
            </div>

            {/* Factors List Table */}
            <div className="space-y-1.5">
              {risk.factors.length === 0 ? (
                <div className="flex items-center justify-between rounded-md px-3 py-2.5 text-xs bg-emerald-950/30 border border-emerald-700/40 text-emerald-300">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Baseline Safe Compliance — Speed, alertness, phone usage, and shift duration within safe limits</span>
                  </div>
                  <span className="font-mono font-bold text-sm text-emerald-400">+0 pts</span>
                </div>
              ) : (
                risk.factors.map((f, fIdx) => {
                  const isCompound = f.id === 'compound_synergy';
                  return (
                    <div
                      key={`risk-factor-${f.id}-${fIdx}`}
                      className={`flex items-center justify-between rounded-md px-3 py-2 text-xs transition-all border ${
                        isCompound
                          ? 'bg-red-500/15 border-red-500/50 text-red-300 font-bold border-l-4 border-l-red-500'
                          : f.severity === 'critical'
                          ? 'bg-red-500/10 border-red-500/30 text-red-300 border-l-2 border-l-red-500'
                          : f.severity === 'high'
                          ? 'bg-orange-500/10 border-orange-500/30 text-orange-300 border-l-2 border-l-orange-500'
                          : 'bg-[#1E293B] border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{f.factor}</span>
                        <span className="text-[11px] text-slate-400 font-normal truncate max-w-[200px] sm:max-w-[320px]">
                          — {f.details}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-sm shrink-0">
                        +{f.points}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Total Row */}
            <div className="mt-2.5 flex items-center justify-between border-t border-slate-800 pt-2 px-1">
              <span className="text-xs font-bold uppercase text-slate-300">
                Calculated Total Risk Score (Sum of Active Factors)
              </span>
              <span className={`font-mono text-base font-black ${colors.text}`}>
                {risk.score} / 100
              </span>
            </div>
          </div>

          {/* Action / Intervention Recommendation Footer */}
          <div className="mt-3 rounded-md border border-slate-800 bg-[#1E293B] p-2.5">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-xs font-bold uppercase text-slate-400 shrink-0">
                Recommended Action:
              </span>
              <p className="text-xs font-medium text-slate-200">
                {risk.recommendedAction}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Deterministic Rule Engine Mathematical Summary Footer */}
      <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/80 p-3.5 flex items-center justify-between text-xs text-slate-300">
        <div>
          <span className="font-semibold text-slate-200">Recommended Operational Action: </span>
          <span className="text-slate-300">{risk.recommendedAction}</span>
        </div>
        <div className="font-mono text-[11px] text-slate-400">
          Base: {risk.factors.reduce((acc, f) => acc + f.points, 0)} pts {risk.compoundMultiplier > 1 ? `× ${risk.compoundMultiplier} mult` : ''} = {risk.score}/100
        </div>
      </div>
    </div>
  );
};
