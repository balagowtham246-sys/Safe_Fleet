import React, { useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Zap,
  Info,
  CheckCircle2,
  BrainCircuit,
} from 'lucide-react';
import { RiskEngineResult, TelemetryState } from '../types';
import { AISafetyExplanation, fetchAISafetyExplanation, generateLocalFallbackInsight } from '../services/aiSafetyService';

interface AISafetyInsightCardProps {
  risk: RiskEngineResult;
  telemetry: TelemetryState;
  driverName: string;
  vehicleReg: string;
  activeEventTrigger?: string | null;
}

export const AISafetyInsightCard: React.FC<AISafetyInsightCardProps> = ({
  risk,
  telemetry,
  driverName,
  vehicleReg,
  activeEventTrigger,
}) => {
  const [insight, setInsight] = useState<AISafetyExplanation>(() =>
    generateLocalFallbackInsight({
      driverName,
      vehicleReg,
      telemetry,
      factors: risk.factors,
      riskScore: risk.score,
      riskLevel: risk.level,
      recommendedAction: risk.recommendedAction,
    })
  );
  const [isLoading, setIsLoading] = useState(false);

  // Track the signature of the previous risk state so we NEVER fire on minor frame fluctuations
  const lastRiskLevelRef = useRef<string>(risk.level);
  const lastFactorsSignatureRef = useRef<string>('');
  const lastEventTriggerRef = useRef<string | null>(null);

  // Material signature generator: only changes on risk level change, factor additions/removals, or discrete events
  const currentFactorsSignature = (risk.factors || []).map((f) => f.id).sort().join('-');

  const loadExplanation = async (forceRefresh = false) => {
    setIsLoading(true);
    try {
      const result = await fetchAISafetyExplanation({
        driverName,
        vehicleReg,
        telemetry,
        factors: risk.factors,
        riskScore: risk.score,
        riskLevel: risk.level,
        recommendedAction: risk.recommendedAction,
        forceRefresh,
      });
      setInsight(result);
    } catch (err) {
      console.warn('Unable to load AI explanation, using deterministic engine fallback:', err);
      setInsight(
        generateLocalFallbackInsight({
          driverName,
          vehicleReg,
          telemetry,
          factors: risk.factors,
          riskScore: risk.score,
          riskLevel: risk.level,
          recommendedAction: risk.recommendedAction,
        })
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger ONLY when:
  // 1. Risk level changes materially (e.g. SAFE -> MODERATE -> HIGH -> CRITICAL)
  // 2. The active set of risk factors changes (e.g. speeding detected, drowsiness detected)
  // 3. A new significant safety event is logged (activeEventTrigger changed)
  useEffect(() => {
    const riskLevelChanged = lastRiskLevelRef.current !== risk.level;
    const factorsChanged = lastFactorsSignatureRef.current !== currentFactorsSignature;
    const eventTriggered = activeEventTrigger && activeEventTrigger !== lastEventTriggerRef.current;

    if (riskLevelChanged || factorsChanged || eventTriggered) {
      lastRiskLevelRef.current = risk.level;
      lastFactorsSignatureRef.current = currentFactorsSignature;
      lastEventTriggerRef.current = activeEventTrigger || null;

      // Fetch explanation (cached automatically by factor signature)
      loadExplanation(false);
    }
  }, [risk.level, currentFactorsSignature, activeEventTrigger]);

  const isAI = insight.isAI && insight.source === 'gemini-3.7-flash';

  return (
    <div
      id="card-ai-safety-insight"
      className="flex flex-col rounded-xl border border-slate-800 bg-[#1E293B] p-4.5 shadow-lg relative overflow-hidden"
    >
      {/* Top Accent Stripe based on Risk Level */}
      <div
        className={`absolute top-0 left-0 right-0 h-1 ${
          risk.level === 'CRITICAL'
            ? 'bg-red-500'
            : risk.level === 'HIGH'
            ? 'bg-orange-500'
            : risk.level === 'MODERATE'
            ? 'bg-yellow-500'
            : 'bg-emerald-500'
        }`}
      />

      {/* Header Bar */}
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3 pt-1">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
              isAI
                ? 'bg-blue-500/20 text-blue-400 border-blue-500/40 shadow-sm shadow-blue-500/20'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {isAI ? (
              <BrainCircuit className="h-4 w-4 text-blue-400" />
            ) : (
              <Sparkles className="h-4 w-4 text-slate-400" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-200">
                {isAI ? 'AI Safety Insight' : 'Safety Insight'}
              </h3>
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border ${
                  isAI
                    ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                {isAI ? 'Gemini 3.7 Flash' : 'Deterministic Engine'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Contextual human-readable reasoning synthesized from authoritative risk engine data
            </p>
          </div>
        </div>

        {/* Right Controls: Deterministic Score Anchor + Request AI Button */}
        <div className="flex items-center gap-2.5">
          {/* Authoritative Single Source of Truth Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-md bg-slate-900 px-2.5 py-1 text-xs border border-slate-800">
            <span className="text-slate-400 text-[11px]">Risk Engine:</span>
            <span
              className={`font-mono font-bold ${
                risk.level === 'CRITICAL'
                  ? 'text-red-400'
                  : risk.level === 'HIGH'
                  ? 'text-orange-400'
                  : risk.level === 'MODERATE'
                  ? 'text-yellow-400'
                  : 'text-emerald-400'
              }`}
            >
              {risk.score} / {risk.level}
            </span>
          </div>

          {/* Regenerate / Request AI Insight Button */}
          <button
            id="btn-request-ai-explanation"
            onClick={() => loadExplanation(true)}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600/90 hover:bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-all disabled:opacity-50 shadow-sm border border-blue-500/40"
            title="Request fresh explanation from Gemini AI"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Synthesizing...' : 'Request AI Insight'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="my-1 rounded-lg border border-slate-800 bg-slate-900/80 p-4 animate-pulse">
          <div className="flex items-center gap-2 text-xs font-medium text-blue-400 mb-2.5">
            <BrainCircuit className="h-4 w-4 animate-pulse" />
            <span>Generating explainable AI safety insight with Gemini...</span>
          </div>
          <div className="space-y-2">
            <div className="h-3 w-11/12 rounded bg-slate-800" />
            <div className="h-3 w-4/5 rounded bg-slate-800" />
            <div className="h-3 w-3/5 rounded bg-slate-800" />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Primary Natural Language Explanation Callout */}
          <div
            className={`rounded-lg border p-3.5 ${
              risk.level === 'CRITICAL'
                ? 'border-red-500/30 bg-red-500/5'
                : risk.level === 'HIGH'
                ? 'border-orange-500/30 bg-orange-500/5'
                : risk.level === 'MODERATE'
                ? 'border-yellow-500/30 bg-yellow-500/5'
                : 'border-emerald-500/20 bg-emerald-500/5'
            }`}
          >
            <p className="text-xs sm:text-sm leading-relaxed text-slate-200 font-normal">
              {insight.explanation}
            </p>
          </div>

          {/* Structured Key Takeaway Micro-Cards */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 pt-0.5">
            {/* 1. Primary Risk Driver */}
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Primary Risk Driver
              </span>
              <p className="text-xs font-semibold text-slate-200 truncate" title={insight.primaryDriver}>
                {insight.primaryDriver || 'Operational compliance'}
              </p>
            </div>

            {/* 2. Compound Risk Impact */}
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Combination Impact
              </span>
              <p className="text-xs font-semibold text-slate-200 truncate" title={insight.combinationImpact}>
                {insight.combinationImpact || 'Operating within safe envelope'}
              </p>
            </div>

            {/* 3. Recommended Immediate Action */}
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Immediate Action
              </span>
              <p className="text-xs font-semibold text-slate-200 truncate" title={insight.recommendedImmediateAction}>
                {insight.recommendedImmediateAction || risk.recommendedAction}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer Timestamp & Guardrail Note */}
      <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2 text-[10px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <Info className="h-3 w-3 text-slate-400" />
          <span>
            {isAI
              ? 'AI explanation grounded in deterministic risk factors. Numerical score and severity are engine-governed.'
              : 'Deterministic rule-based safety insight grounded in active telemetry factors.'}
          </span>
        </div>
        <span className="font-mono text-slate-400">
          Updated: {insight.timestamp || 'Live'}
        </span>
      </div>
    </div>
  );
};
