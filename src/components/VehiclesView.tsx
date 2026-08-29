import React, { useState } from 'react';
import { Truck, Search, Radio, MapPin, Gauge, ShieldCheck, AlertTriangle, AlertOctagon, Filter } from 'lucide-react';
import { RiskLevel, Vehicle } from '../types';
import { getRiskBadgeColor } from '../utils/riskEngine';

interface VehiclesViewProps {
  vehicles: Vehicle[];
  onSelectVehicleForMonitoring: (vehicle: Vehicle) => void;
}

export const VehiclesView: React.FC<VehiclesViewProps> = ({
  vehicles,
  onSelectVehicleForMonitoring,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'IDLE' | 'REST_STOP' | 'CRITICAL_RISK'>('ALL');

  const filteredVehicles = vehicles.filter((v) => {
    const matchesSearch =
      (v.registrationNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.driverName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.model || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.locationName || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'ACTIVE') return v.status === 'ACTIVE';
    if (statusFilter === 'IDLE') return v.status === 'IDLE';
    if (statusFilter === 'REST_STOP') return v.status === 'REST_STOP';
    if (statusFilter === 'CRITICAL_RISK') return v.riskLevel === 'CRITICAL' || v.riskLevel === 'HIGH';

    return true;
  });

  return (
    <div className="space-y-5">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#1E293B] p-4 shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">Commercial Fleet Vehicles Directory</h2>
            <p className="text-xs text-slate-400">
              24 Heavy Logistics &amp; Transport Units with Live Telematics
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search vehicle, driver, model..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-slate-900 p-1 border border-slate-800">
            {(['ALL', 'ACTIVE', 'CRITICAL_RISK'] as const).map((filter) => (
              <button
                key={`veh-filter-${filter}`}
                onClick={() => setStatusFilter(filter)}
                className={`rounded px-2.5 py-1 text-[11px] font-semibold transition-all ${
                  statusFilter === filter
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {filter === 'ALL'
                  ? 'All (24)'
                  : filter === 'ACTIVE'
                  ? 'Active (17)'
                  : 'High Risk (3)'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Vehicle Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredVehicles.map((vehicle, idx) => {
          const colors = getRiskBadgeColor(vehicle.riskLevel);
          const isCritical = vehicle.riskLevel === 'CRITICAL';
          const isHigh = vehicle.riskLevel === 'HIGH';

          return (
            <div
              key={`veh-item-${vehicle.id || vehicle.registrationNumber || idx}-${idx}`}
              className={`flex flex-col justify-between rounded-xl border bg-[#1E293B] p-4 shadow-lg transition-all ${
                isCritical
                  ? 'border-red-500/50 shadow-red-950/20 ring-1 ring-red-500/30'
                  : isHigh
                  ? 'border-orange-500/40'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black font-mono text-white">
                        {vehicle.registrationNumber}
                      </h3>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          vehicle.status === 'ACTIVE'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : vehicle.status === 'REST_STOP'
                            ? 'bg-blue-950 text-blue-400 border border-blue-800'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {vehicle.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      {vehicle.model}
                    </p>
                  </div>

                  <span
                    className={`rounded px-2.5 py-0.5 text-[10px] font-extrabold uppercase border ${colors.bg} ${colors.text} ${colors.border}`}
                  >
                    {vehicle.riskScore}/100 {vehicle.riskLevel}
                  </span>
                </div>

                {/* Driver & Telematics Strip */}
                <div className="mt-3.5 space-y-2 rounded-lg bg-slate-900 p-3 border border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Assigned Driver:</span>
                    <strong className="text-white">{vehicle.driverName}</strong>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Gauge className="h-3 w-3" /> Velocity:
                    </span>
                    <span className="font-mono font-bold text-slate-200">
                      {vehicle.speed?.toLocaleString() ?? '0'} km/h{' '}
                      <span className="text-[10px] text-slate-500 font-normal">
                        (Limit: {vehicle.speedLimit ?? 'N/A'})
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> Corridor:
                    </span>
                    <span className="text-[11px] text-slate-300 font-medium truncate max-w-[170px]">
                      {vehicle.locationName ?? 'Unknown Location'}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Fuel: {vehicle.fuelLevel ?? 0}%</span>
                  <span>Odometer: {vehicle.odometerKm?.toLocaleString() ?? '0'} km</span>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-4">
                <button
                  onClick={() => onSelectVehicleForMonitoring(vehicle)}
                  className={`flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all shadow-md ${
                    isCritical
                      ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-900/30'
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-900/30'
                  }`}
                >
                  <Radio className="h-4 w-4" />
                  <span>Inspect Live AI Telematics Feed</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
