import React from 'react';
import {
  Truck,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  ShieldAlert,
  Radio,
  ArrowUpRight,
  TrendingDown,
  Activity,
  History,
  Sparkles,
  PhoneCall,
} from 'lucide-react';
import { Driver, SafetyEvent, Vehicle } from '../types';
import { FleetMapView } from './FleetMapView';

interface DashboardViewProps {
  vehicles: Vehicle[];
  drivers: Driver[];
  events: SafetyEvent[];
  onSelectVehicleForMonitoring: (vehicle: Vehicle) => void;
  onNavigateToTab: (tab: any) => void;
  onInitiateEmergencyCall?: (callTarget: {
    driverId: string;
    driverName: string;
    driverPhone?: string;
    vehicleReg: string;
    riskScore: number;
    riskLevel: any;
    incidentId?: string;
    reason?: string;
  }) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  vehicles,
  drivers,
  events,
  onSelectVehicleForMonitoring,
  onNavigateToTab,
  onInitiateEmergencyCall,
}) => {
  const totalVehicles = vehicles.length;
  const activeTrips = vehicles.filter((v) => v.status === 'ACTIVE').length;
  const safeCount = vehicles.filter((v) => v.riskLevel === 'SAFE').length;
  const moderateCount = vehicles.filter((v) => v.riskLevel === 'MODERATE').length;
  const highRiskCount = vehicles.filter((v) => v.riskLevel === 'HIGH').length;
  const criticalCount = vehicles.filter((v) => v.riskLevel === 'CRITICAL').length;

  const highPriorityVehicles = vehicles
    .filter((v) => v.riskLevel === 'CRITICAL' || v.riskLevel === 'HIGH')
    .sort((a, b) => b.riskScore - a.riskScore);

  return (
    <div className="space-y-5">
      {/* Product Vision Positioning Statement Banner */}
      <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-[#1E293B] p-5 shadow-lg">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md shadow-blue-900/30">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                Predictive Fleet Safety Command Center
                <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[10px] font-mono text-blue-400 border border-blue-500/20">
                  DETECT → UNDERSTAND → ACT
                </span>
              </h2>
              <p className="text-xs text-slate-300 max-w-3xl mt-1 leading-relaxed">
                <strong>SafeFleet AI</strong> combines real-time driver vision intelligence, vehicle telemetry, and contextual risk factors to identify rising compound hazards and trigger proactive intervention before they become incidents.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateToTab('monitoring')}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-900/30 hover:bg-blue-700 transition-all"
          >
            <Radio className="h-4 w-4" />
            <span>Open Live Monitoring</span>
          </button>
        </div>
      </div>

      {/* Top 6 KPI Metric Cards matching Professional Polish design specifications */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
        {/* Total Vehicles */}
        <div className="bg-[#1E293B] border border-slate-800 p-4 rounded-xl flex flex-col justify-center shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
              Total Vehicles
            </span>
            <Truck className="h-4 w-4 text-slate-400" />
          </div>
          <span className="text-2xl font-bold mt-1 text-white font-mono">{totalVehicles}</span>
          <span className="text-[10px] text-slate-400">Fleet units registered</span>
        </div>

        {/* Active Trips */}
        <div className="bg-[#1E293B] border border-slate-800 p-4 rounded-xl flex flex-col justify-center shadow-md border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-blue-400 uppercase tracking-widest font-bold">
              Active Trips
            </span>
            <Activity className="h-4 w-4 text-blue-400 animate-pulse" />
          </div>
          <span className="text-2xl font-bold mt-1 text-blue-400 font-mono">{activeTrips}</span>
          <span className="text-[10px] text-slate-400">Highways in transit</span>
        </div>

        {/* Safe */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex flex-col justify-center border-l-4 border-l-emerald-500 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold">
              Safe (0–39)
            </span>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <span className="text-2xl font-bold mt-1 text-emerald-400 font-mono">{safeCount}</span>
          <span className="text-[10px] text-emerald-400/80">Standard monitoring</span>
        </div>

        {/* Moderate */}
        <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl flex flex-col justify-center border-l-4 border-l-yellow-500 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-yellow-400 uppercase tracking-widest font-bold">
              Moderate (40–69)
            </span>
            <ShieldAlert className="h-4 w-4 text-yellow-400" />
          </div>
          <span className="text-2xl font-bold mt-1 text-yellow-400 font-mono">{moderateCount}</span>
          <span className="text-[10px] text-yellow-400/80">Monitor driver</span>
        </div>

        {/* High Risk */}
        <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl flex flex-col justify-center border-l-4 border-l-orange-500 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-orange-400 uppercase tracking-widest font-bold">
              High Risk (70–84)
            </span>
            <AlertTriangle className="h-4 w-4 text-orange-400" />
          </div>
          <span className="text-2xl font-bold mt-1 text-orange-400 font-mono">{highRiskCount}</span>
          <span className="text-[10px] text-orange-400/80">Driver advisory issued</span>
        </div>

        {/* Critical Risk */}
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex flex-col justify-center border-l-4 border-l-red-500 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-red-400 uppercase tracking-widest font-bold">
              Critical (85–100)
            </span>
            <AlertOctagon className="h-4 w-4 text-red-400 animate-pulse" />
          </div>
          <span className="text-2xl font-bold mt-1 text-red-400 font-mono">{criticalCount}</span>
          <span className="text-[10px] text-red-400 font-semibold">Immediate intervention</span>
        </div>
      </div>

      {/* Main Grid: Interactive Fleet Risk Map (Left 8 Cols) & Priority Interventions (Right 4 Cols) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Map Container */}
        <div className="flex flex-col rounded-xl border border-slate-800 bg-[#1E293B] p-4 shadow-lg lg:col-span-8">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-400 animate-ping" />
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Fleet Risk Spatial Mapping
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">
              Click vehicle marker to inspect live camera &amp; telemetry
            </span>
          </div>

          <div className="h-[440px] w-full rounded-lg overflow-hidden border border-slate-800">
            <FleetMapView
              vehicles={vehicles}
              selectedVehicleId={vehicles[0]?.id}
              onSelectVehicle={onSelectVehicleForMonitoring}
            />
          </div>
        </div>

        {/* Right Action Column: High Risk Vehicles & Live Safety Events Ticker */}
        <div className="flex flex-col gap-4 lg:col-span-4">
          {/* Priority Attention Vehicles */}
          <div className="rounded-xl border border-slate-800 bg-[#1E293B] p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <AlertOctagon className="h-3.5 w-3.5 text-red-400" />
                Active Risk Alerts
              </h3>
              <span className="rounded bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-400 border border-red-500/20">
                {highPriorityVehicles.length} Units
              </span>
            </div>

            <div className="space-y-2.5">
              {highPriorityVehicles.map((vehicle, idx) => {
                const isCritical = vehicle.riskLevel === 'CRITICAL';
                const matchedDriver = drivers.find(
                  (d) => d.id === vehicle.driverId || d.name.toLowerCase() === vehicle.driverName.toLowerCase()
                );
                const driverPhone = matchedDriver?.phone;

                return (
                  <div
                    key={`priority-veh-${vehicle.id || vehicle.registrationNumber || idx}-${idx}`}
                    className={`rounded-lg p-3 border transition-all ${
                      isCritical
                        ? 'bg-red-500/10 border-red-500/40 shadow-sm border-l-4 border-l-red-500'
                        : 'bg-orange-500/10 border-orange-500/40 border-l-4 border-l-orange-500'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white font-mono">
                            {vehicle.registrationNumber}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.2 text-[10px] font-extrabold ${
                              isCritical ? 'bg-red-600 text-white' : 'bg-orange-500 text-slate-950'
                            }`}
                          >
                            {vehicle.riskScore}/100 {vehicle.riskLevel}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          Driver: <strong>{vehicle.driverName}</strong> • {vehicle.speed} km/h
                        </p>
                        <p className="text-[10px] text-slate-400 truncate max-w-[200px]">
                          {vehicle.locationName}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {onInitiateEmergencyCall && (
                          <button
                            id={`btn-call-driver-${vehicle.driverId || idx}`}
                            onClick={() =>
                              onInitiateEmergencyCall({
                                driverId: vehicle.driverId,
                                driverName: vehicle.driverName,
                                driverPhone: driverPhone,
                                vehicleReg: vehicle.registrationNumber,
                                riskScore: vehicle.riskScore,
                                riskLevel: vehicle.riskLevel,
                                reason: `${vehicle.riskLevel} SAFETY ALERT (${vehicle.riskScore}/100)`,
                              })
                            }
                            className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-bold transition-all shadow-sm cursor-pointer ${
                              isCritical
                                ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-950/40'
                                : 'bg-orange-500 hover:bg-orange-600 text-slate-950 font-extrabold'
                            }`}
                            title={`Call ${vehicle.driverName}`}
                          >
                            <PhoneCall className="h-3.5 w-3.5" />
                            <span>📞 Call Driver</span>
                          </button>
                        )}

                        <button
                          onClick={() => onSelectVehicleForMonitoring(vehicle)}
                          className="rounded-md p-1.5 text-xs font-bold bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white transition-all cursor-pointer"
                          title="Open in Live Monitoring"
                        >
                          <ArrowUpRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chronological Event Ticker */}
          <div className="flex flex-1 flex-col rounded-xl border border-slate-800 bg-[#1E293B] p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <History className="h-3.5 w-3.5 text-blue-400" />
                Live Incident Ticker
              </h3>
              <button
                onClick={() => onNavigateToTab('events')}
                className="text-[11px] font-semibold text-blue-400 hover:underline"
              >
                View All →
              </button>
            </div>

            <div className="space-y-2.5 overflow-y-auto max-h-[190px] pr-1">
              {events.slice(0, 4).map((evt, idx) => (
                <div
                  key={`ticker-evt-${evt.id || idx}-${evt.timestamp || idx}-${idx}`}
                  className={`rounded-lg bg-slate-900/90 p-2.5 border-l-2 text-xs text-slate-300 border ${
                    evt.severity === 'CRITICAL'
                      ? 'border-l-red-500 border-slate-800'
                      : evt.severity === 'HIGH'
                      ? 'border-l-orange-500 border-slate-800'
                      : 'border-l-yellow-500 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span className="font-mono text-slate-400">{evt.timestamp}</span>
                    <span
                      className={`font-bold ${
                        evt.severity === 'CRITICAL'
                          ? 'text-red-400'
                          : evt.severity === 'HIGH'
                          ? 'text-orange-400'
                          : 'text-yellow-400'
                      }`}
                    >
                      {evt.severity}
                    </span>
                  </div>
                  <div className="font-semibold text-white text-[11px]">{evt.description}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {evt.driverName} • {evt.vehicleReg}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
