import React, { useState } from 'react';
import {
  History,
  Search,
  Filter,
  Download,
  AlertOctagon,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  FileSpreadsheet,
  Clock,
  MapPin,
  PhoneCall,
  PhoneForwarded,
} from 'lucide-react';
import { Driver, SafetyEvent } from '../types';

interface EventsTimelineViewProps {
  events: SafetyEvent[];
  drivers?: Driver[];
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

export const EventsTimelineView: React.FC<EventsTimelineViewProps> = ({
  events,
  drivers = [],
  onInitiateEmergencyCall,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  const filteredEvents = events.filter((evt) => {
    const matchesSearch =
      (evt.driverName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (evt.vehicleReg || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (evt.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (evt.location || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (severityFilter !== 'ALL') {
      if (severityFilter === 'MODERATE' && (evt.severity === 'MODERATE' || (evt.severity as any) === 'MEDIUM')) return true;
      if (severityFilter === 'SAFE' && (evt.severity === 'SAFE' || (evt.severity as any) === 'LOW')) return true;
      if (evt.severity !== severityFilter) return false;
    }
    return true;
  });

  const exportCSV = () => {
    const headers = ['ID', 'Timestamp', 'Driver', 'Vehicle', 'Severity', 'Risk Score', 'Description', 'Action Taken', 'Location'];
    const rows = filteredEvents.map((e) => [
      e.id,
      e.timestamp,
      `"${e.driverName}"`,
      e.vehicleReg,
      e.severity,
      e.riskScore,
      `"${e.description.replace(/"/g, '""')}"`,
      `"${e.actionTaken.replace(/"/g, '""')}"`,
      `"${e.location}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `safefleet_safety_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#1E293B] p-4 shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <History className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Safety Event Timeline &amp; Audit Log</h2>
            <p className="text-xs text-slate-400">
              Immutable record of compound risk detections and proactive interventions
            </p>
          </div>
        </div>

        {/* Export Button */}
        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-all shadow-md shadow-blue-900/30"
        >
          <Download className="h-4 w-4" />
          <span>Export Compliance Audit (CSV)</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#1E293B] p-3 shadow-md">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search events by driver, vehicle, incident..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Severity Filter Pills */}
        <div className="flex items-center gap-1 rounded-lg bg-slate-900 p-1 border border-slate-800">
          {['ALL', 'CRITICAL', 'HIGH', 'MODERATE', 'SAFE'].map((sev) => (
            <button
              key={`sev-filter-${sev}`}
              onClick={() => setSeverityFilter(sev)}
              className={`rounded px-3 py-1 text-[11px] font-semibold transition-all ${
                severityFilter === sev
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline List */}
      <div className="space-y-3">
        {filteredEvents.map((evt, idx) => {
          const isCritical = evt.severity === 'CRITICAL';
          const isHigh = evt.severity === 'HIGH';
          const isMod = evt.severity === 'MODERATE' || (evt.severity as any) === 'MEDIUM';
          const isSafe = evt.severity === 'SAFE' || (evt.severity as any) === 'LOW';

          return (
            <div
              key={`evt-card-${evt.id || idx}-${evt.timestamp || idx}-${idx}`}
              className={`rounded-xl border p-4 transition-all shadow-md ${
                isCritical
                  ? 'border-red-500/40 bg-red-500/10 border-l-4 border-l-red-500'
                  : isHigh
                  ? 'border-orange-500/40 bg-orange-500/10 border-l-4 border-l-orange-500'
                  : isMod
                  ? 'border-yellow-500/40 bg-yellow-500/10 border-l-4 border-l-yellow-500'
                  : 'border-emerald-500/30 bg-emerald-500/10 border-l-4 border-l-emerald-500'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                      isCritical
                        ? 'bg-red-500/20 text-red-400'
                        : isHigh
                        ? 'bg-orange-500/20 text-orange-400'
                        : isMod
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {isCritical ? (
                      <AlertOctagon className="h-4 w-4" />
                    ) : isHigh ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : isMod ? (
                      <ShieldAlert className="h-4 w-4" />
                    ) : (
                      <ShieldCheck className="h-4 w-4" />
                    )}
                  </div>
                  <span className="font-bold text-white text-sm">{evt.description}</span>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                      isCritical
                        ? 'bg-red-600 text-white'
                        : isHigh
                        ? 'bg-orange-500 text-slate-950'
                        : isMod
                        ? 'bg-yellow-500 text-slate-950'
                        : 'bg-emerald-500 text-slate-950'
                    }`}
                  >
                    {evt.severity} • {evt.riskScore}/100
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-blue-400" />
                    {evt.timestamp}
                  </span>
                  <span className="rounded bg-slate-900 px-2 py-0.5 border border-slate-800 text-slate-300">
                    {evt.id}
                  </span>
                </div>
              </div>

              {/* Event Context & Factors */}
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px] block">Driver &amp; Vehicle:</span>
                  <strong className="text-white">{evt.driverName}</strong>
                  <span className="ml-1 font-mono text-blue-400">({evt.vehicleReg})</span>
                </div>

                <div>
                  <span className="text-slate-400 text-[11px] block">Location &amp; Corridor:</span>
                  <span className="text-slate-300 flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-red-400" /> {evt.location}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 text-[11px] block">Action Taken:</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {evt.actionTaken}
                  </span>
                </div>
              </div>

              {/* Factors Tags & Escalation Call Audit */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase text-slate-400 mr-1">
                    Compound Factors:
                  </span>
                  {evt.factors.map((f, i) => (
                    <span
                      key={i}
                      className="rounded bg-slate-900 px-2 py-0.5 text-[11px] font-medium text-slate-300 border border-slate-800"
                    >
                      {f}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  {/* If call audit exists on this incident */}
                  {evt.callStatus ? (
                    <div className="flex items-center gap-1.5 rounded-md bg-emerald-950/40 border border-emerald-500/30 px-2 py-1 text-[11px] text-emerald-300">
                      <PhoneForwarded className="h-3 w-3 text-emerald-400" />
                      <span className="font-semibold uppercase text-[10px]">
                        Call: {evt.callStatus}
                      </span>
                      <span className="text-slate-400 text-[9px] font-mono">
                        ({evt.callType === 'live' ? 'Twilio Live' : 'Demo'})
                      </span>
                    </div>
                  ) : null}

                  {/* If High or Critical and not yet called, show Call Driver button */}
                  {(isCritical || isHigh) && onInitiateEmergencyCall && (
                    <button
                      id={`btn-timeline-call-${evt.id || idx}`}
                      onClick={() => {
                        const matchedDriver = drivers.find(
                          (d) => d.id === evt.driverId || d.name.toLowerCase() === evt.driverName.toLowerCase()
                        );
                        onInitiateEmergencyCall({
                          driverId: evt.driverId,
                          driverName: evt.driverName,
                          driverPhone: matchedDriver?.phone,
                          vehicleReg: evt.vehicleReg,
                          riskScore: evt.riskScore || (isCritical ? 85 : 65),
                          riskLevel: evt.severity,
                          incidentId: evt.id,
                          reason: `${evt.severity} SAFETY INCIDENT AUDIT`,
                        });
                      }}
                      className={`flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-bold transition-all shadow-sm cursor-pointer ${
                        isCritical
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-orange-500 hover:bg-orange-600 text-slate-950 font-extrabold'
                      }`}
                      title={`Call ${evt.driverName}`}
                    >
                      <PhoneCall className="h-3 w-3" />
                      <span>📞 Call Driver</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
