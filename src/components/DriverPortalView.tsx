import React, { useState, useMemo } from 'react';
import {
  Truck,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  AlertOctagon,
  LogOut,
  Activity,
  Clock,
  Gauge,
  MapPin,
  Sparkles,
  Zap,
  Info,
  Calendar,
  Volume2,
  VolumeX,
  Phone,
  CreditCard,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Driver, SafetyEvent, Vehicle, UserProfile, TelemetryState } from '../types';
import { DriverSafetyTrendCard } from './DriverSafetyTrendCard';
import { AISafetyInsightCard } from './AISafetyInsightCard';
import { calculateCompoundRisk, getRiskBadgeColor } from '../utils/riskEngine';
import { auth, signOut } from '../lib/firebase';
import { logSafetyIncidentToFirestore } from '../lib/firestoreService';

interface DriverPortalViewProps {
  userProfile: UserProfile;
  driver: Driver;
  vehicle: Vehicle;
  driverIncidents: SafetyEvent[];
  onSignOut: () => void;
}

export const DriverPortalView: React.FC<DriverPortalViewProps> = ({
  userProfile,
  driver,
  vehicle,
  driverIncidents,
  onSignOut,
}) => {
  // Local telemetry state for the driver's current run
  const [telemetry, setTelemetry] = useState<TelemetryState>({
    speed: vehicle.speed || 62,
    speedLimit: vehicle.speedLimit || 65,
    drowsinessDetected: false,
    drowsinessConfidence: 0.1,
    distractionDetected: false,
    distractionConfidence: 0.1,
    isNightDriving: false,
    drivingDurationMinutes: vehicle.drivingDurationMinutes || 135,
    harshBrakingDetected: false,
    locationName: vehicle.locationName || 'Highway Route 45',
    vehicleId: vehicle.id,
    driverId: driver.id,
    timeOfDay: '14:30',
  });

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isSimulatingEvent, setIsSimulatingEvent] = useState(false);

  // Compute live deterministic risk for driver's current telemetry
  const currentRisk = useMemo(() => {
    return calculateCompoundRisk(telemetry);
  }, [telemetry]);

  const riskBadge = getRiskBadgeColor(currentRisk.level);

  // Quick simulator action to demonstrate real-time response for the driver
  const handleSimulateCondition = async (type: 'safe' | 'drowsy' | 'speeding' | 'critical') => {
    setIsSimulatingEvent(true);
    let updatedTelemetry: TelemetryState;

    if (type === 'safe') {
      updatedTelemetry = {
        ...telemetry,
        speed: 58,
        speedLimit: 65,
        drowsinessDetected: false,
        drowsinessConfidence: 0.05,
        distractionDetected: false,
        distractionConfidence: 0.05,
        isNightDriving: false,
        harshBrakingDetected: false,
      };
    } else if (type === 'drowsy') {
      updatedTelemetry = {
        ...telemetry,
        speed: 64,
        speedLimit: 65,
        drowsinessDetected: true,
        drowsinessConfidence: 0.88,
        distractionDetected: false,
        isNightDriving: true,
        drivingDurationMinutes: 260,
      };
    } else if (type === 'speeding') {
      updatedTelemetry = {
        ...telemetry,
        speed: 84,
        speedLimit: 65,
        drowsinessDetected: false,
        distractionDetected: true,
        distractionConfidence: 0.79,
        harshBrakingDetected: false,
      };
    } else {
      // Critical compound
      updatedTelemetry = {
        ...telemetry,
        speed: 86,
        speedLimit: 65,
        drowsinessDetected: true,
        drowsinessConfidence: 0.94,
        distractionDetected: true,
        distractionConfidence: 0.85,
        isNightDriving: true,
        drivingDurationMinutes: 310,
        harshBrakingDetected: true,
      };
    }

    setTelemetry(updatedTelemetry);
    const newRisk = calculateCompoundRisk(updatedTelemetry);

    // If moderate, high or critical, log an incident to Firestore for this driver
    if (newRisk.score >= 40) {
      const newEvent: SafetyEvent = {
        id: `EVT-${Date.now()}`,
        driverId: driver.id,
        driverName: driver.name,
        vehicleId: vehicle.id,
        vehicleReg: vehicle.registrationNumber,
        severity: newRisk.level,
        riskScore: newRisk.score,
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        location: telemetry.locationName,
        description: newRisk.summaryExplanation,
        actionTaken: newRisk.recommendedAction,
        factors: newRisk.factors.map((f) => f.label),
        resolved: false,
      };
      await logSafetyIncidentToFirestore(newEvent);
    }

    setTimeout(() => {
      setIsSimulatingEvent(false);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 pb-16">
      {/* Top Driver Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-[#1E293B]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 shadow-md shadow-emerald-900/30 border border-emerald-400/20">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-tight">SAFEFLEET AI</span>
                <span className="rounded bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-800/60 uppercase">
                  Driver Portal
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Personal Driver Safety &amp; Risk Insights
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Sound Mute Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Alert Chimes Enabled' : 'Alert Chimes Muted'}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:text-white transition-colors"
            >
              {soundEnabled ? <Volume2 className="h-4 w-4 text-emerald-400" /> : <VolumeX className="h-4 w-4 text-slate-500" />}
            </button>

            {/* Logout Button */}
            <button
              id="btn-driver-logout"
              onClick={onSignOut}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-red-950/40 hover:border-red-600/50 hover:text-red-300 transition-all cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        
        {/* Driver Identity Card & Vehicle Pairing */}
        <div className="rounded-xl border border-slate-800 bg-[#1E293B] p-5 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src={driver.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                alt={driver.name}
                referrerPolicy="no-referrer"
                className="h-16 w-16 rounded-full object-cover ring-2 ring-emerald-500/40"
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg font-bold text-white">{driver.name}</h1>
                  <span className="rounded bg-slate-900 px-2 py-0.5 text-xs font-mono text-blue-400 border border-slate-700">
                    ID: {driver.id}
                  </span>
                  <span className="rounded bg-emerald-950/80 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-700/50">
                    Active Driver
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                    License: <strong className="text-slate-300">{driver.licenseNumber}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    {driver.phone}
                  </span>
                  <span className="flex items-center gap-1">
                    <Truck className="h-3.5 w-3.5 text-blue-400" />
                    Vehicle: <strong className="text-blue-300">{vehicle.registrationNumber} ({vehicle.model})</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Safety Score Gauge */}
            <div className="flex items-center gap-3 rounded-lg bg-slate-900/80 px-4 py-2.5 border border-slate-800">
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                  Driver Safety Score
                </p>
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-2xl font-black text-emerald-400 font-mono">
                    {driver.safetyScore}
                  </span>
                  <span className="text-xs text-slate-400">/ 100</span>
                </div>
              </div>
              <div className="h-9 w-9 rounded-full bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Live Active Driving Status & Risk Indicator */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Live Telemetry & Active Risk Panel */}
          <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-[#1E293B] p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                  Real-Time Trip Telemetry &amp; Risk State
                </h2>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${riskBadge.bg} ${riskBadge.text} border ${riskBadge.border}`}>
                {currentRisk.level} RISK ({currentRisk.score}/100)
              </span>
            </div>

            {/* Warning Banner if High or Critical Risk */}
            {currentRisk.score >= 40 && (
              <div className={`rounded-lg p-3 border flex items-start gap-3 ${
                currentRisk.level === 'CRITICAL' 
                  ? 'bg-red-950/80 border-red-500/50 text-red-100 animate-pulse' 
                  : 'bg-amber-950/70 border-amber-500/50 text-amber-100'
              }`}>
                <AlertOctagon className="h-5 w-5 shrink-0 mt-0.5 text-red-400" />
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wide">
                    Safety Advisory Issued: {currentRisk.recommendedAction}
                  </h4>
                  <p className="text-xs mt-0.5 text-slate-300">
                    {currentRisk.summaryExplanation}
                  </p>
                </div>
              </div>
            )}

            {/* Key Telemetry Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg bg-slate-900/90 p-3 border border-slate-800">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Current Speed</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-extrabold font-mono text-white">{telemetry.speed}</span>
                  <span className="text-[10px] text-slate-400">mph</span>
                </div>
                <span className="text-[10px] text-slate-400">Limit: {telemetry.speedLimit} mph</span>
              </div>

              <div className="rounded-lg bg-slate-900/90 p-3 border border-slate-800">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Trip Duration</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-extrabold font-mono text-white">
                    {Math.floor(telemetry.drivingDurationMinutes / 60)}h {telemetry.drivingDurationMinutes % 60}m
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">Continuous driving</span>
              </div>

              <div className="rounded-lg bg-slate-900/90 p-3 border border-slate-800">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Fatigue / Eyes</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className={`h-2.5 w-2.5 rounded-full ${telemetry.drowsinessDetected ? 'bg-red-500 animate-ping' : 'bg-emerald-400'}`} />
                  <span className="text-xs font-bold text-white">
                    {telemetry.drowsinessDetected ? 'Drowsy Alert' : 'Alert & Attentive'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">Vision DMS Active</span>
              </div>

              <div className="rounded-lg bg-slate-900/90 p-3 border border-slate-800">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Location</span>
                <div className="flex items-center gap-1 mt-1">
                  <MapPin className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <span className="text-xs font-semibold text-white truncate">{telemetry.locationName}</span>
                </div>
                <span className="text-[10px] text-slate-400">Freight Corridor</span>
              </div>
            </div>

            {/* Quick Test Simulator for Driver */}
            <div className="rounded-lg bg-slate-900/60 p-3 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-400" />
                  Simulate Driving Condition (Instant Safety Feedback)
                </span>
                {isSimulatingEvent && (
                  <span className="text-[10px] text-blue-400 animate-pulse font-semibold">Updating...</span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleSimulateCondition('safe')}
                  className="rounded-md border border-emerald-500/30 bg-emerald-950/30 px-2.5 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-900/50 transition-all cursor-pointer text-center"
                >
                  Standard Safe
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulateCondition('drowsy')}
                  className="rounded-md border border-amber-500/30 bg-amber-950/30 px-2.5 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-900/50 transition-all cursor-pointer text-center"
                >
                  Fatigue Warning
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulateCondition('speeding')}
                  className="rounded-md border border-orange-500/30 bg-orange-950/30 px-2.5 py-1.5 text-xs font-semibold text-orange-300 hover:bg-orange-900/50 transition-all cursor-pointer text-center"
                >
                  Speeding Event
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulateCondition('critical')}
                  className="rounded-md border border-red-500/30 bg-red-950/30 px-2.5 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-900/50 transition-all cursor-pointer text-center"
                >
                  Critical Compound
                </button>
              </div>
            </div>
          </div>

          {/* AI Safety Explanation for Driver */}
          <div className="lg:col-span-1">
            <AISafetyInsightCard
              risk={currentRisk}
              telemetry={telemetry}
              driverName={driver.name}
              vehicleReg={vehicle.registrationNumber}
            />
          </div>
        </div>

        {/* Driver Safety Trend Component */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Personal Driver Safety Trend &amp; Audit Log
              </h2>
            </div>
            <span className="text-xs text-slate-400">
              Computed from {driverIncidents.length} recorded Firestore incident(s)
            </span>
          </div>

          {/* Render DriverSafetyTrendCard specifically for this driver */}
          <DriverSafetyTrendCard
            driver={driver}
            incidents={driverIncidents}
          />
        </section>

        {/* Personal Safety Incidents Table */}
        <section className="rounded-xl border border-slate-800 bg-[#1E293B] p-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                My Recent Safety Incidents
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Total Logged: {driverIncidents.length}
            </span>
          </div>

          {driverIncidents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-400 mb-2" />
              <p className="text-sm font-bold text-white">Zero Safety Incidents Logged</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Excellent driving! No harsh braking, severe speeding, or distracted driving violations have been recorded for your profile.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Event ID</th>
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3">Severity</th>
                    <th className="py-2.5 px-3">Risk Score</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Action Required</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {driverIncidents.slice(0, 10).map((evt) => (
                    <tr key={evt.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-blue-400">{evt.id}</td>
                      <td className="py-2.5 px-3 text-slate-300">{evt.timestamp}</td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${
                          evt.severity === 'CRITICAL' ? 'bg-red-950 text-red-300 border border-red-700' :
                          evt.severity === 'HIGH' ? 'bg-orange-950 text-orange-300 border border-orange-700' :
                          'bg-amber-950 text-amber-300 border border-amber-700'
                        }`}>
                          {evt.severity}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-white">{evt.riskScore ?? '--'}</td>
                      <td className="py-2.5 px-3 text-slate-300 max-w-xs truncate">{evt.description}</td>
                      <td className="py-2.5 px-3 text-slate-400">{evt.actionTaken}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </main>
    </div>
  );
};
