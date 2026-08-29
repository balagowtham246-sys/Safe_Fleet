import React, { useState } from 'react';
import {
  Bell,
  ShieldAlert,
  AlertOctagon,
  CheckCircle,
  Volume2,
  Radio,
  FileText,
  UserCheck,
  Send,
  Sparkles,
  PhoneCall,
  MessageSquare,
} from 'lucide-react';
import { RiskEngineResult, TelemetryState } from '../types';
import { audioAlerts } from '../utils/audioAlerts';

interface InterventionPanelProps {
  risk: RiskEngineResult;
  telemetry: TelemetryState;
  driverId?: string;
  driverName: string;
  driverPhone?: string;
  vehicleReg: string;
  onLogIncident: (description: string, arg2?: string, arg3?: string) => void;
  onViewEvents: () => void;
  onInitiateEmergencyCall?: (callTarget: {
    driverId: string;
    driverName: string;
    driverPhone?: string;
    vehicleReg: string;
    riskScore: number;
    riskLevel: any;
    reason?: string;
  }) => void;
}

export const InterventionPanel: React.FC<InterventionPanelProps> = ({
  risk,
  telemetry,
  driverId,
  driverName,
  driverPhone,
  vehicleReg,
  onLogIncident,
  onViewEvents,
  onInitiateEmergencyCall,
}) => {
  const [driverWarningDispatched, setDriverWarningDispatched] = useState(false);
  const [managerAlertSent, setManagerAlertSent] = useState(false);
  const [incidentLogged, setIncidentLogged] = useState(false);

  const [showSmsModal, setShowSmsModal] = useState(false);
  const [smsSending, setSmsSending] = useState(false);
  const [smsResult, setSmsResult] = useState<{ success?: boolean; message?: string; sid?: string; status?: string } | null>(null);

  // Dispatch Driver Warning
  const handleDispatchDriverWarning = () => {
    audioAlerts.playWarningChime();
    setDriverWarningDispatched(true);
    onLogIncident(
      risk.driverWarning || `Driver Warning Issued: ${risk.level} Risk (${risk.score}/100)`,
      'In-cab audio chime and display advisory dispatched'
    );
    setTimeout(() => setDriverWarningDispatched(false), 5000);
  };

  // Dispatch Fleet Manager Alert
  const handleDispatchManagerAlert = () => {
    audioAlerts.playCriticalAlarm();
    setManagerAlertSent(true);
    onLogIncident(
      risk.managerAlert || `Fleet Manager Escalation: ${risk.level} risk (${risk.score}/100) on ${vehicleReg}`,
      'Operations center high-priority dispatch bridge engaged'
    );
    setTimeout(() => setManagerAlertSent(false), 6000);
  };

  // Trigger Full Automated Proactive Protocol
  const handleExecuteAutomatedProtocol = () => {
    if (risk.level === 'CRITICAL') {
      audioAlerts.playCriticalAlarm();
    } else {
      audioAlerts.playWarningChime();
    }

    setDriverWarningDispatched(true);
    setManagerAlertSent(true);
    setIncidentLogged(true);

    onLogIncident(
      `Proactive Protocol Executed: ${risk.summaryExplanation}`,
      'Emergency driver alert + Manager alert + Incident record logged'
    );
  };

  const maskPhone = (phone?: string) => {
    if (!phone) return '+91 ******1234';
    const cleaned = phone.replace(/[^\d+]/g, '');
    if (cleaned.length < 6) return '******';
    return `${cleaned.slice(0, 3)} ******${cleaned.slice(-4)}`;
  };

  const handleSendSms = async () => {
    setSmsSending(true);
    setSmsResult(null);
    try {
      const res = await fetch('/api/emergency-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'manager',
        },
        body: JSON.stringify({
          incidentId: (risk as any).id || undefined,
          driverId: driverId || 'DRV-8021',
          driverName,
          driverPhone,
          riskLevel: risk.level,
          userRole: 'manager',
          managerName: 'Fleet Manager',
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const textData = await res.text();
        console.error('[SafeFleet SMS] Non-JSON response received:', textData.slice(0, 200));
        setSmsResult({
          success: false,
          message: 'SMS API returned a non-JSON response. Check the backend route.',
        });
        return;
      }

      const data = await res.json();
      if (res.ok && data.success) {
        setSmsResult({
          success: true,
          sid: data.smsProviderId || data.smsSid || data.messageSid,
          status: data.smsStatus || data.status,
          message: data.message,
        });
        onLogIncident(
          `Safety SMS Sent to ${driverName} (${risk.level} Risk)`,
          `Twilio SMS SID: ${data.smsProviderId || data.smsSid || data.messageSid} [Status: ${data.smsStatus || data.status}]`
        );
      } else {
        setSmsResult({
          success: false,
          message: data.message || data.error || 'Failed to send SMS alert.',
        });
      }
    } catch (err: any) {
      setSmsResult({
        success: false,
        message: err.message || 'Network error while sending SMS.',
      });
    } finally {
      setSmsSending(false);
    }
  };

  return (
    <div className="flex flex-col rounded-xl border border-slate-800 bg-[#1E293B] p-4 shadow-lg">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <Radio className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
              Proactive Safety Intervention
              {risk.level === 'CRITICAL' && (
                <span className="rounded bg-red-600 px-2 py-0.5 text-[10px] font-black uppercase text-white animate-pulse">
                  Action Required
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400">
              Automated multi-channel response triggers (Driver • Fleet Manager • Incident DB)
            </p>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-1.5">
          <span
            className={`rounded-md px-2.5 py-1 text-xs font-bold border ${
              risk.level === 'CRITICAL'
                ? 'bg-red-500/10 text-red-400 border-red-500/30 animate-pulse'
                : risk.level === 'HIGH'
                ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                : risk.level === 'MODERATE'
                ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}
          >
            {risk.level === 'CRITICAL'
              ? 'LEVEL 3: ESCALATE'
              : risk.level === 'HIGH'
              ? 'LEVEL 2: WARN DRIVER'
              : risk.level === 'MODERATE'
              ? 'LEVEL 1: MONITOR'
              : 'LEVEL 0: COMPLIANT'}
          </span>
        </div>
      </div>

      {/* Intervention Action Cards Grid */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {/* 1. Driver Warning Card */}
        <div className="flex flex-col justify-between rounded-lg border border-slate-800 bg-slate-900/90 p-3.5">
          <div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                <Volume2 className="h-3.5 w-3.5 text-yellow-400" />
                In-Cab Driver Warning
              </span>
              {driverWarningDispatched && (
                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5">
                  <CheckCircle className="h-3 w-3" /> Dispatched
                </span>
              )}
            </div>
            <p className="mt-2 text-xs italic text-slate-300 bg-[#1E293B] p-2 rounded border border-slate-800">
              "{risk.driverWarning || 'Maintain safe following distance and obey highway speed limit.'}"
            </p>
          </div>

          <button
            id="btn-dispatch-driver-warning"
            onClick={handleDispatchDriverWarning}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md bg-yellow-500/20 border border-yellow-500/40 px-3 py-2 text-xs font-bold text-yellow-300 hover:bg-yellow-500/30 transition-all shadow-sm"
          >
            <Volume2 className="h-3.5 w-3.5 text-yellow-400" />
            <span>Send Driver Audio Alert</span>
          </button>
        </div>

        {/* 2. Fleet Manager Alert Card */}
        <div className="flex flex-col justify-between rounded-lg border border-slate-800 bg-slate-900/90 p-3.5">
          <div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                <UserCheck className="h-3.5 w-3.5 text-red-400" />
                Fleet Manager Alert
              </span>
              {managerAlertSent && (
                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5">
                  <CheckCircle className="h-3 w-3" /> Sent to Ops
                </span>
              )}
            </div>
            <p className="mt-2 text-xs italic text-slate-300 bg-[#1E293B] p-2 rounded border border-slate-800">
              "{risk.managerAlert || `Vehicle ${vehicleReg} is operating within normal parameters.`}"
            </p>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <button
                id="btn-dispatch-manager-alert"
                onClick={handleDispatchManagerAlert}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-red-500/20 border border-red-500/40 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-500/30 transition-all shadow-sm cursor-pointer"
              >
                <Send className="h-3.5 w-3.5 text-red-400" />
                <span>Notify Ops</span>
              </button>

              {(risk.level === 'HIGH' || risk.level === 'CRITICAL') && onInitiateEmergencyCall && (
                <button
                  id="btn-call-driver-intervention"
                  onClick={() =>
                    onInitiateEmergencyCall({
                      driverId: driverId || 'DRV-UNKNOWN',
                      driverName,
                      driverPhone,
                      vehicleReg,
                      riskScore: risk.score,
                      riskLevel: risk.level,
                      reason: `${risk.level} SAFETY INTERVENTION (${risk.score}/100)`,
                    })
                  }
                  className="flex items-center justify-center gap-1.5 rounded-md bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700 transition-all shadow-sm cursor-pointer"
                  title={`Call driver ${driverName}`}
                >
                  <PhoneCall className="h-3.5 w-3.5" />
                  <span>📞 Call</span>
                </button>
              )}
            </div>

            {(risk.level === 'HIGH' || risk.level === 'CRITICAL') && (
              <button
                id="btn-send-sms-driver"
                onClick={() => { setShowSmsModal(true); setSmsResult(null); }}
                className="flex w-full items-center justify-center gap-1.5 rounded-md bg-blue-600/20 border border-blue-500/40 px-3 py-2 text-xs font-bold text-blue-300 hover:bg-blue-600/30 transition-all shadow-sm cursor-pointer"
              >
                <MessageSquare className="h-3.5 w-3.5 text-blue-400" />
                <span>📩 Send SMS to Driver</span>
              </button>
            )}
          </div>
        </div>

        {/* 3. Incident Logging & Persistence */}
        <div className="flex flex-col justify-between rounded-lg border border-slate-800 bg-slate-900/90 p-3.5">
          <div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                <FileText className="h-3.5 w-3.5 text-blue-400" />
                Incident Record Log
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Local DB Sync
              </span>
            </div>
            <div className="mt-2 space-y-1 text-[11px] text-slate-300">
              <div><strong>Driver:</strong> {driverName}</div>
              <div><strong>Vehicle:</strong> {vehicleReg}</div>
              <div><strong>Score:</strong> {risk.score}/100 ({risk.level})</div>
            </div>
          </div>

          <button
            id="btn-view-logged-events"
            onClick={onViewEvents}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-all shadow-md shadow-blue-900/30"
          >
            <FileText className="h-3.5 w-3.5 text-white" />
            <span>View Safety Event Timeline</span>
          </button>
        </div>
      </div>

      {/* Critical Compound Risk Banner Button */}
      {risk.level === 'CRITICAL' && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-500/40 bg-red-500/10 p-3.5 shadow-lg border-l-4 border-l-red-500">
          <div className="flex items-center gap-2.5">
            <AlertOctagon className="h-6 w-6 text-red-400 animate-pulse shrink-0" />
            <div>
              <div className="text-xs font-black text-red-300 uppercase tracking-wide">
                CRITICAL COMPOUND RISK TRIGGER ACTIVE ({risk.score}/100)
              </div>
              <p className="text-[11px] text-slate-300">
                Execute combined protocol: In-cab chime + Dispatch alert + Incident persistence.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onInitiateEmergencyCall && (
              <button
                id="btn-call-driver-critical-banner"
                onClick={() =>
                  onInitiateEmergencyCall({
                    driverId: driverId || 'DRV-UNKNOWN',
                    driverName,
                    driverPhone,
                    vehicleReg,
                    riskScore: risk.score,
                    riskLevel: risk.level,
                    reason: `CRITICAL SAFETY ALERT (${risk.score}/100)`,
                  })
                }
                className="flex items-center gap-1.5 rounded-md bg-red-700 hover:bg-red-800 px-3.5 py-2 text-xs font-bold uppercase text-white shadow-md shadow-red-950/50 transition-all cursor-pointer"
              >
                <PhoneCall className="h-4 w-4" />
                <span>📞 Call Driver</span>
              </button>
            )}

            <button
              id="btn-execute-critical-protocol"
              onClick={handleExecuteAutomatedProtocol}
              className="rounded-md bg-slate-800 border border-slate-700 hover:bg-slate-700 px-3.5 py-2 text-xs font-bold uppercase text-slate-200 transition-all cursor-pointer"
            >
              Execute Protocol
            </button>
          </div>
        </div>
      )}

      {/* SMS Confirmation Modal */}
      {showSmsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-400" />
              SEND SAFETY SMS?
            </h3>
            <div className="mt-4 space-y-2.5 text-xs text-slate-300">
              <div><strong>Driver:</strong> {driverName}</div>
              <div><strong>Phone:</strong> {maskPhone(driverPhone)}</div>
              <div className="mt-2 rounded bg-slate-800 p-3 text-[11px] font-mono text-slate-200 border border-slate-700">
                {risk.level === 'CRITICAL'
                  ? 'SafeFleet CRITICAL Alert: A critical driving risk has been detected. Please pull over safely when possible and contact your fleet manager. — SafeFleet AI'
                  : 'SafeFleet Safety Alert: A high-risk driving event has been detected. Please reduce speed, stay alert, and follow safe-driving procedures. — SafeFleet AI'}
              </div>
            </div>

            {smsResult && (
              <div className={`mt-4 rounded p-3 text-xs font-bold ${smsResult.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'}`}>
                {smsResult.success ? (
                  <div>
                    <div>SMS SENT / {smsResult.status?.toUpperCase() || 'QUEUED'}</div>
                    <div className="text-[10px] font-mono text-slate-300 mt-1">Message SID: {smsResult.sid}</div>
                  </div>
                ) : (
                  <div>
                    <div>SMS FAILED</div>
                    <div className="text-[11px] font-normal mt-1">{smsResult.message}</div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => { setShowSmsModal(false); setSmsResult(null); }}
                disabled={smsSending}
                className="rounded-md bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-all cursor-pointer"
              >
                {smsResult?.success ? 'Close' : 'Cancel'}
              </button>
              {!smsResult?.success && (
                <button
                  id="btn-confirm-send-sms"
                  onClick={handleSendSms}
                  disabled={smsSending}
                  className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {smsSending ? 'Sending...' : 'Send SMS'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
