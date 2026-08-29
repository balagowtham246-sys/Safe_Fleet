import React from 'react';
import { Play, Sparkles, AlertOctagon, ShieldCheck, Gauge, Moon, Smartphone, RefreshCw } from 'lucide-react';
import { DEMO_SCENARIOS } from '../data/demoScenarios';
import { DemoScenario, TelemetryState } from '../types';

interface DemoControlBarProps {
  currentScenarioId: string | null;
  onSelectScenario: (scenario: DemoScenario) => void;
  telemetry: TelemetryState;
  isSimulating: boolean;
  setIsSimulating: (sim: boolean) => void;
}

export const DemoControlBar: React.FC<DemoControlBarProps> = ({
  currentScenarioId,
  onSelectScenario,
  isSimulating,
  setIsSimulating,
}) => {
  return (
    <div className="border-b border-slate-800 bg-[#0F172A] px-4 py-2.5">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        {/* Left: Demo mode indicator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-md bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 text-xs font-semibold text-blue-400">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Simulation Control</span>
          </div>
          <span className="hidden text-xs text-slate-400 lg:inline">
            1-Click Predefined Risk Scenarios:
          </span>
        </div>

        {/* Center: Scenario Quick-Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {DEMO_SCENARIOS.map((scenario) => {
            const isSelected = currentScenarioId === scenario.id;
            const isCritical = scenario.id === 'scenario-5';

            return (
              <button
                key={scenario.id}
                id={`btn-${scenario.id}`}
                onClick={() => onSelectScenario(scenario)}
                className={`group flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                  isSelected
                    ? isCritical
                      ? 'bg-red-600 text-white shadow-md shadow-red-900/40 font-bold ring-1 ring-red-400'
                      : 'bg-blue-600 text-white shadow-md shadow-blue-900/40 ring-1 ring-blue-400'
                    : isCritical
                    ? 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20'
                    : 'bg-[#1E293B] text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {scenario.scenarioNumber === 1 && <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />}
                {scenario.scenarioNumber === 2 && <Gauge className="h-3.5 w-3.5 text-yellow-400" />}
                {scenario.scenarioNumber === 3 && <Moon className="h-3.5 w-3.5 text-amber-400" />}
                {scenario.scenarioNumber === 4 && <Smartphone className="h-3.5 w-3.5 text-orange-400" />}
                {scenario.scenarioNumber === 5 && (
                  <AlertOctagon className={`h-3.5 w-3.5 ${isSelected ? 'text-white' : 'text-red-400'} animate-pulse`} />
                )}

                <span>{scenario.title}</span>

                {isCritical && (
                  <span className="rounded bg-red-950 px-1.5 py-0.2 text-[10px] font-extrabold uppercase text-red-300 border border-red-800">
                    MVP Focus
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right: Live Dynamic Telemetry Stream Simulator */}
        <div className="flex items-center gap-2">
          <button
            id="btn-toggle-live-simulation"
            onClick={() => setIsSimulating(!isSimulating)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all border ${
              isSimulating
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                : 'bg-[#1E293B] text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSimulating ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} />
            <span>{isSimulating ? 'Live Telemetry Pulse Active' : 'Start Live Telemetry Pulse'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
