import React from 'react';
import { Gauge, Clock, MapPin, Moon, Sun, AlertTriangle, ChevronUp, ChevronDown, Compass } from 'lucide-react';
import { TelemetryState } from '../types';

interface TelemetryControlPanelProps {
  telemetry: TelemetryState;
  onUpdateTelemetry: (updated: Partial<TelemetryState>) => void;
  onTriggerHarshBraking: () => void;
}

export const TelemetryControlPanel: React.FC<TelemetryControlPanelProps> = ({
  telemetry,
  onUpdateTelemetry,
  onTriggerHarshBraking,
}) => {
  const isOverSpeed = telemetry.speed > telemetry.speedLimit;
  const speedDelta = telemetry.speed - telemetry.speedLimit;

  const handleSpeedChange = (newSpeed: number) => {
    onUpdateTelemetry({ speed: Math.max(0, Math.min(140, newSpeed)) });
  };

  const handleDurationChange = (newMins: number) => {
    onUpdateTelemetry({ drivingDurationMinutes: Math.max(0, Math.min(600, newMins)) });
  };

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m < 10 ? '0' : ''}${m}m`;
  };

  return (
    <div className="flex flex-col rounded-xl border border-slate-800 bg-[#1E293B] p-4 shadow-lg">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <Gauge className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Vehicle Telemetry Ingestion</h3>
            <p className="text-xs text-slate-300">Live CAN-Bus &amp; GPS Telematics Stream</p>
          </div>
        </div>

        {/* Location badge */}
        <div className="flex items-center gap-1.5 rounded-md bg-slate-900 px-2.5 py-1 text-xs font-mono text-slate-300 border border-slate-800">
          <MapPin className="h-3.5 w-3.5 text-red-400" />
          <span className="truncate max-w-[140px] sm:max-w-[180px]">{telemetry.locationName}</span>
        </div>
      </div>

      {/* Speed & Gauge Block */}
      <div className="mb-4 rounded-lg border border-slate-800 bg-slate-900/90 p-3.5">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Current Speed
            </span>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-3xl font-extrabold tracking-tight font-mono ${
                  isOverSpeed ? 'text-red-400 animate-pulse' : 'text-white'
                }`}
              >
                {telemetry.speed}
              </span>
              <span className="text-xs font-bold text-slate-400">km/h</span>
              {isOverSpeed && (
                <span className="rounded bg-red-950 border border-red-600 px-1.5 py-0.5 text-[10px] font-bold text-red-300">
                  +{speedDelta} km/h OVER LIMIT
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Speed Limit
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-red-500 bg-white font-mono text-sm font-black text-slate-950 shadow-md">
              {telemetry.speedLimit}
            </div>
          </div>
        </div>

        {/* Interactive Speed Slider */}
        <div className="mt-3">
          <input
            id="slider-vehicle-speed"
            type="range"
            min="0"
            max="130"
            value={telemetry.speed}
            onChange={(e) => handleSpeedChange(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-blue-500"
          />
          <div className="mt-1.5 flex justify-between text-[10px] font-mono text-slate-400">
            <span>0 km/h</span>
            <span className="text-yellow-400 font-bold">80 km/h (Limit)</span>
            <span>130 km/h</span>
          </div>
        </div>

        {/* Speed Quick Step Buttons (Useful for Step 3 of Demo Script) */}
        <div className="mt-2.5 flex items-center justify-between gap-1.5">
          <span className="text-[11px] text-slate-400">Demo Presets:</span>
          <div className="flex items-center gap-1">
            {[62, 72, 81, 94].map((stepSpeed) => (
              <button
                key={stepSpeed}
                onClick={() => handleSpeedChange(stepSpeed)}
                className={`rounded px-2.5 py-1 text-xs font-mono font-semibold transition-all border ${
                  telemetry.speed === stepSpeed
                    ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                    : 'bg-[#1E293B] text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {stepSpeed} km/h
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of Duration, Time Context, & Deceleration */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Continuous Driving Duration */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
              <Clock className="h-3.5 w-3.5 text-yellow-400" />
              Driving Duration
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span
              className={`text-lg font-bold font-mono ${
                telemetry.drivingDurationMinutes >= 240
                  ? 'text-red-400'
                  : telemetry.drivingDurationMinutes >= 180
                  ? 'text-yellow-400'
                  : 'text-white'
              }`}
            >
              {formatDuration(telemetry.drivingDurationMinutes)}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleDurationChange(telemetry.drivingDurationMinutes - 30)}
                className="rounded bg-slate-800 p-1 text-slate-300 hover:bg-slate-700"
                title="Decrease 30 mins"
              >
                <ChevronDown className="h-3 w-3" />
              </button>
              <button
                onClick={() => handleDurationChange(telemetry.drivingDurationMinutes + 30)}
                className="rounded bg-slate-800 p-1 text-slate-300 hover:bg-slate-700"
                title="Increase 30 mins"
              >
                <ChevronUp className="h-3 w-3" />
              </button>
            </div>
          </div>
          <p className="mt-1 text-[10px] text-slate-400">
            {telemetry.drivingDurationMinutes >= 240 ? '⚠️ Exceeds 4h rest rule' : 'Shift compliance OK'}
          </p>
        </div>

        {/* Night Driving Context Toggle */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
              {telemetry.isNightDriving ? (
                <Moon className="h-3.5 w-3.5 text-blue-400" />
              ) : (
                <Sun className="h-3.5 w-3.5 text-yellow-400" />
              )}
              Time Context
            </span>
            <button
              id="btn-toggle-night"
              onClick={() =>
                onUpdateTelemetry({
                  isNightDriving: !telemetry.isNightDriving,
                  timeOfDay: !telemetry.isNightDriving ? '22:45' : '14:20',
                })
              }
              className={`rounded-md px-2 py-0.5 text-[10px] font-bold transition-all border ${
                telemetry.isNightDriving
                  ? 'bg-blue-950 text-blue-300 border-blue-600'
                  : 'bg-yellow-950/80 text-yellow-300 border-yellow-600'
              }`}
            >
              {telemetry.isNightDriving ? '🌙 NIGHT (22:45)' : '☀️ DAY (14:20)'}
            </button>
          </div>
          <div className="mt-2 text-xs font-mono font-semibold text-slate-300">
            {telemetry.isNightDriving ? 'Night Window (+12 pts)' : 'Daytime Clear (+0)'}
          </div>
          <p className="mt-1 text-[10px] text-slate-400">
            {telemetry.isNightDriving ? 'High circadian risk dip' : 'Standard daylight visibility'}
          </p>
        </div>
      </div>

      {/* Harsh Braking One-Click Trigger */}
      <div className="mt-3">
        <button
          id="btn-trigger-harsh-braking"
          onClick={onTriggerHarshBraking}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-slate-700 hover:bg-slate-800 transition-all"
        >
          <AlertTriangle className="h-4 w-4 text-yellow-400" />
          <span>Simulate Sudden Deceleration / Harsh Braking Event (-0.52G)</span>
        </button>
      </div>
    </div>
  );
};
