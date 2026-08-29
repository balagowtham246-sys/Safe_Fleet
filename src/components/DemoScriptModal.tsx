import React, { useState } from 'react';
import { Play, CheckCircle2, ChevronRight, X, Sparkles, ArrowRight, ShieldAlert, Radio } from 'lucide-react';
import { ActiveNavTab } from '../types';

interface DemoScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTab: (tab: ActiveNavTab) => void;
  onExecuteDemoStep: (stepNumber: number) => void;
}

export const DemoScriptModal: React.FC<DemoScriptModalProps> = ({
  isOpen,
  onClose,
  onNavigateToTab,
  onExecuteDemoStep,
}) => {
  const [currentStep, setCurrentStep] = useState(1);

  if (!isOpen) return null;

  const steps = [
    {
      step: 1,
      title: 'Step 1: Fleet Command Center Overview',
      tab: 'dashboard' as ActiveNavTab,
      description: 'Show overall fleet risk status: 24 total vehicles, 17 active, 15 safe, 6 moderate, 2 high risk, 1 critical.',
      talkingPoint: 'SafeFleet AI continuously monitors commercial fleets not just by tracking GPS, but by fusing real-time driver behaviour, vehicle telemetry, and contextual risk factors into explainable intelligence.',
    },
    {
      step: 2,
      title: 'Step 2: Live AI Vision & Telemetry Ingestion',
      tab: 'monitoring' as ActiveNavTab,
      description: 'Switch to Live Monitoring. Point out driver camera AI vision feed and vehicle telemetry CAN-bus streams.',
      talkingPoint: 'Here we see the in-cab computer vision stream evaluating eye closure (PERCLOS/EAR) and forward gaze, paired with real-time CAN-bus velocity and spatial context.',
    },
    {
      step: 3,
      title: 'Step 3: Velocity Excursion (> 80 km/h)',
      tab: 'monitoring' as ActiveNavTab,
      description: 'Increase simulated speed past 80 km/h (e.g. 94 km/h). Notice score rise to Moderate risk.',
      talkingPoint: 'Speeding alone increases risk moderately (+35 pts). The driver is exceeding corridor limits, but remains alert.',
    },
    {
      step: 4,
      title: 'Step 4: Driver Drowsiness Detection',
      tab: 'monitoring' as ActiveNavTab,
      description: 'Activate Drowsiness (+55 pts). Point to transparent points breakdown table.',
      talkingPoint: 'Our vision model detects prolonged eyelid closure (microsleep). Combined with shift duration, risk escalates directly to High alert.',
    },
    {
      step: 5,
      title: 'Step 5: Compound Risk Escalation (CRITICAL Multi-Vector)',
      tab: 'monitoring' as ActiveNavTab,
      description: 'Activate Distraction, Night Driving, and Speeding concurrently. Compound synergy multiplier engages, pushing the score into CRITICAL.',
      talkingPoint: 'This is the core innovation: Compound Risk. Drowsiness + Speeding + Distraction + Night Driving creates an exponential hazard far greater than isolated signals.',
    },
    {
      step: 6,
      title: 'Step 6: Proactive Multi-Channel Intervention',
      tab: 'monitoring' as ActiveNavTab,
      description: 'Trigger In-Cab Warning Chime + Fleet Manager Ops Notification + Auto-Incident DB Persistence.',
      talkingPoint: 'The system does not wait for a collision. It acts proactively: loud in-cab audio buzzer to snap driver focus, manager SMS dispatch, and automated compliance logging.',
    },
    {
      step: 7,
      title: 'Step 7: Explainable Safety Timeline & Driver Coaching',
      tab: 'events' as ActiveNavTab,
      description: 'Inspect logged incident audit log with factor tags and open Driver Profile to generate Gemini AI coaching plan.',
      talkingPoint: 'Every decision is 100% explainable and stored for fleet compliance, empowering managers to conduct targeted coaching and prevent future incidents.',
    },
  ];

  const handleRunStep = (stepNum: number) => {
    setCurrentStep(stepNum);
    onExecuteDemoStep(stepNum);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md">
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-slate-800 bg-[#1E293B] p-6 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg bg-slate-800 p-1.5 text-slate-400 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              SafeFleet AI — 2-Minute Hackathon Demo Script
            </h2>
            <p className="text-xs text-slate-400">
              Interactive 7-Step walkthrough demonstrating DETECT → UNDERSTAND → ACT
            </p>
          </div>
        </div>

        {/* Stepper Grid */}
        <div className="mt-5 space-y-3">
          {steps.map((s) => {
            const isCurrent = currentStep === s.step;
            return (
              <div
                key={s.step}
                className={`rounded-lg border p-4 transition-all ${
                  isCurrent
                    ? 'border-blue-500/60 bg-blue-950/20 shadow-md shadow-blue-950/40 ring-1 ring-blue-500/40'
                    : 'border-slate-800 bg-slate-900 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold font-mono ${
                        isCurrent ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {s.step}
                    </span>
                    <h3 className="text-sm font-bold text-white">{s.title}</h3>
                  </div>

                  <button
                    id={`btn-demo-step-${s.step}`}
                    onClick={() => handleRunStep(s.step)}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 transition-all shadow-sm self-start sm:self-auto"
                  >
                    <Play className="h-3 w-3 fill-white" />
                    <span>Execute Step {s.step}</span>
                  </button>
                </div>

                <p className="mt-2 text-xs text-slate-300">{s.description}</p>

                <div className="mt-2 rounded-lg bg-slate-950 p-2 text-xs italic text-amber-300 border border-slate-800">
                  <strong>🎙️ Presenter Script:</strong> "{s.talkingPoint}"
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4">
          <div className="text-xs text-slate-400">
            Click any step above to programmatically apply states and navigate.
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
          >
            Close Guide &amp; Return to App
          </button>
        </div>
      </div>
    </div>
  );
};
