import React, { useState } from 'react';
import {
  PhoneCall,
  PhoneOff,
  AlertOctagon,
  AlertTriangle,
  X,
  Radio,
  CheckCircle,
  Loader2,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { RiskLevel, UserProfile } from '../types';

interface EmergencyCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  driverId: string;
  driverName: string;
  driverPhone?: string;
  vehicleReg: string;
  riskScore: number;
  riskLevel: RiskLevel;
  incidentId?: string;
  reason?: string;
  userProfile: UserProfile | null;
  onCallSuccess?: (result: {
    callSid: string;
    callStatus: string;
    callType: 'live' | 'demo';
    driverPhone: string;
    callFrom?: string;
    callTo?: string;
  }) => void;
}

export const EmergencyCallModal: React.FC<EmergencyCallModalProps> = ({
  isOpen,
  onClose,
  driverId,
  driverName,
  driverPhone,
  vehicleReg,
  riskScore,
  riskLevel,
  incidentId,
  reason,
  userProfile,
  onCallSuccess,
}) => {
  const [isCalling, setIsCalling] = useState(false);
  const [callState, setCallState] = useState<'idle' | 'calling' | 'active' | 'ended' | 'error'>('idle');
  const [callDetails, setCallDetails] = useState<{
    callSid?: string;
    callStatus?: string;
    callType?: 'live' | 'demo';
    message?: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Mask phone number for privacy: e.g. +91 98421 88412 -> +91 98421 •••••
  const maskPhone = (phone?: string) => {
    if (!phone) return 'Not registered';
    const trimmed = phone.trim();
    if (trimmed.length <= 6) return trimmed;
    const prefix = trimmed.slice(0, Math.min(9, trimmed.length - 4));
    return `${prefix} •••••`;
  };

  const isCritical = riskLevel === 'CRITICAL';
  const isHigh = riskLevel === 'HIGH';

  const handleInitiateCall = async () => {
    if (isCalling) return;

    if (!driverPhone || driverPhone.trim() === '') {
      setErrorMessage('Driver phone number is not available.');
      setCallState('error');
      return;
    }

    if (userProfile?.role !== 'manager') {
      setErrorMessage('PERMISSION_DENIED: Only authenticated Fleet Managers can initiate emergency driver calls.');
      setCallState('error');
      return;
    }

    setIsCalling(true);
    setCallState('calling');
    setErrorMessage(null);

    try {
      const response = await fetch('/api/emergency-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': userProfile.role,
        },
        body: JSON.stringify({
          driverId,
          driverName,
          driverPhone,
          vehicleReg,
          riskScore,
          riskLevel,
          incidentId,
          reason: reason || `${riskLevel} SAFETY EVENT`,
          managerUid: userProfile.uid,
          managerName: userProfile.name,
          managerPhone: userProfile.phone,
          userRole: userProfile.role,
        }),
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        throw new Error(`Server returned invalid response: ${text.slice(0, 100)}`);
      }

      if (!response.ok || data.error) {
        throw new Error(data.error || data.message || 'Unable to initiate the call. Please verify the driver\'s phone number.');
      }

      setCallDetails({
        callSid: data.callSid,
        callStatus: data.callStatus || 'initiated',
        callType: data.callType,
        message: data.message,
      });
      setCallState('active');

      if (onCallSuccess) {
        onCallSuccess({
          callSid: data.callSid,
          callStatus: data.callStatus || 'initiated',
          callType: data.callType,
          driverPhone: data.driverPhone || driverPhone,
          callFrom: data.callFrom,
          callTo: data.callTo,
        });
      }
    } catch (err: any) {
      console.error('Failed to initiate emergency call:', err);
      setErrorMessage(err.message || 'Unable to initiate the call. Please verify the driver\'s phone number.');
      setCallState('error');
    } finally {
      setIsCalling(false);
    }
  };

  const handleClose = () => {
    if (isCalling) return; // Prevent closing while in flight
    setCallState('idle');
    setCallDetails(null);
    setErrorMessage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-[#1E293B] p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-lg border ${
                isCritical
                  ? 'bg-red-500/20 text-red-400 border-red-500/30'
                  : 'bg-orange-500/20 text-orange-400 border-orange-500/30'
              }`}
            >
              <PhoneCall className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                CALL DRIVER?
              </h3>
              <p className="text-[11px] text-slate-400">Emergency Outbound Safety Escalation</p>
            </div>
          </div>

          <button
            onClick={handleClose}
            disabled={isCalling}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-all cursor-pointer disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="mt-4 space-y-3.5">
          {/* Driver & Event Card */}
          <div className="rounded-xl border border-slate-850 bg-slate-900/90 p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Driver:</span>
              <strong className="text-white text-sm">{driverName}</strong>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Phone:</span>
              <span className="font-mono text-slate-300 font-semibold">{maskPhone(driverPhone)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Vehicle:</span>
              <span className="font-mono text-blue-400 font-bold">{vehicleReg}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Reason:</span>
              <span
                className={`font-extrabold uppercase px-2 py-0.5 rounded text-[10px] ${
                  isCritical ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                }`}
              >
                {reason || `${riskLevel} SAFETY EVENT`}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-800">
              <span className="text-slate-400">Compound Risk Score:</span>
              <strong
                className={`text-sm font-mono ${
                  isCritical ? 'text-red-400' : 'text-orange-400'
                }`}
              >
                {riskScore} / 100
              </strong>
            </div>
          </div>

          {/* Voice Prompt Content Preview */}
          <div className="rounded-lg bg-blue-950/30 border border-blue-500/30 p-3 text-[11px] text-slate-300">
            <div className="flex items-center gap-1.5 font-semibold text-blue-400 mb-1">
              <Radio className="h-3.5 w-3.5" />
              <span>Automated Voice Alert Message:</span>
            </div>
            <p className="italic text-slate-300 text-[11px] leading-relaxed">
              "SafeFleet safety alert. This is an urgent safety notification from your fleet manager. A critical driving risk has been detected. Please pull over safely and contact your fleet manager."
            </p>
          </div>

          {/* Call Status / Feedback */}
          {callState === 'calling' && (
            <div className="flex items-center justify-center gap-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-3 text-xs font-semibold text-yellow-300 animate-pulse">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Calling... Initiating outbound call bridge</span>
            </div>
          )}

          {callState === 'active' && callDetails && (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                  <CheckCircle className="h-4 w-4" />
                  Call Initiated
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${
                    callDetails.callType === 'live'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                  }`}
                >
                  {callDetails.callType === 'live' ? 'LIVE CALL' : 'DEMO CALL'}
                </span>
              </div>

              <div className="text-[11px] text-slate-300">
                {callDetails.callType === 'demo' ? (
                  <div className="space-y-1">
                    <p className="text-yellow-300/90 font-medium">
                      Call request simulated because voice provider is not configured.
                    </p>
                    <p className="text-slate-400 font-mono text-[10px]">
                      Simulated SID: {callDetails.callSid}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-emerald-300">
                      Outbound emergency voice call placed to driver via Twilio.
                    </p>
                    <p className="text-slate-400 font-mono text-[10px]">
                      Twilio Call SID: {callDetails.callSid}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {callState === 'error' && errorMessage && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-red-400">
                <AlertOctagon className="h-4 w-4 shrink-0" />
                <span>Call Failed</span>
              </div>
              <p className="text-[11px] text-slate-300">{errorMessage}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-5 flex items-center justify-end gap-3 border-t border-slate-800 pt-3.5">
          {callState === 'active' ? (
            <button
              onClick={handleClose}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition-all cursor-pointer shadow-lg shadow-emerald-950/40"
            >
              Close &amp; Return to Console
            </button>
          ) : (
            <>
              <button
                onClick={handleClose}
                disabled={isCalling}
                className="rounded-lg bg-slate-800 border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                onClick={handleInitiateCall}
                disabled={isCalling || !driverPhone}
                className={`flex items-center gap-2 rounded-lg px-5 py-2 text-xs font-bold text-white shadow-lg transition-all cursor-pointer disabled:opacity-50 ${
                  isCritical
                    ? 'bg-red-600 hover:bg-red-700 shadow-red-950/50'
                    : 'bg-orange-600 hover:bg-orange-700 shadow-orange-950/50'
                }`}
              >
                {isCalling ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Calling...</span>
                  </>
                ) : (
                  <>
                    <PhoneCall className="h-3.5 w-3.5" />
                    <span>📞 Call Driver</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
