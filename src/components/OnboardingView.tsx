import React, { useState } from 'react';
import {
  ShieldCheck,
  Truck,
  AlertCircle,
  CheckCircle2,
  LogOut,
  ArrowRight,
  ShieldAlert,
  UserCheck,
  Sparkles,
  Phone,
  User as UserIcon
} from 'lucide-react';
import { auth, signOut } from '../lib/firebase';
import type { User } from '../lib/firebase';
import { UserProfile, Driver } from '../types';
import { saveUserProfile, getUserProfile, generateUniqueDriverId, saveDriverRecord } from '../lib/firestoreService';
import { isApprovedManagerEmail, normalizePhoneNumber } from '../utils/authUtils';

interface OnboardingViewProps {
  user: User;
  onProfileCreated: (profile: UserProfile) => void;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({ user, onProfileCreated }) => {
  const [selectedRole, setSelectedRole] = useState<'manager' | 'driver' | null>(null);
  const [driverFullName, setDriverFullName] = useState<string>(user.displayName || 'Arun Kumar');
  const [driverPhone, setDriverPhone] = useState<string>('+91 98421 88412');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDriverFormOpen, setIsDriverFormOpen] = useState<boolean>(false);

  const displayName = user.displayName || user.email?.split('@')[0] || 'User';

  // Handle Fleet Manager choice
  const handleSelectManager = async () => {
    setSelectedRole('manager');
    setIsDriverFormOpen(false);
    setErrorMessage(null);

    const userEmail = user.email || '';
    const isApproved = isApprovedManagerEmail(userEmail);

    if (!isApproved) {
      setErrorMessage('Manager access requires administrator approval. Your account does not have authorization for fleet management.');
      return;
    }

    setIsLoading(true);
    try {
      // Check duplicate profile
      const existing = await getUserProfile(user.uid);
      if (existing) {
        onProfileCreated(existing);
        return;
      }

      const managerProfile: UserProfile = {
        uid: user.uid,
        name: user.displayName || userEmail.split('@')[0].toUpperCase(),
        email: userEmail,
        role: 'manager',
        active: true,
        createdAt: new Date().toISOString(),
      };

      await saveUserProfile(managerProfile);
      onProfileCreated(managerProfile);
    } catch (err: any) {
      console.error('Error saving manager profile:', err);
      setErrorMessage('Failed to configure manager profile. Please check permissions.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Driver choice (open driver registration form)
  const handleSelectDriver = () => {
    setSelectedRole('driver');
    setErrorMessage(null);
    setIsDriverFormOpen(true);
  };

  // Confirm Driver registration and auto-generate unique Driver ID
  const handleConfirmDriverRegistration = async () => {
    if (!driverFullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!driverPhone.trim()) {
      setErrorMessage('Please enter your mobile phone number for emergency safety calls.');
      return;
    }

    const normalizedPhone = normalizePhoneNumber(driverPhone);
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Duplicate protection: Check if user profile already exists
      const existingProfile = await getUserProfile(user.uid);
      if (existingProfile && existingProfile.driverId) {
        onProfileCreated(existingProfile);
        return;
      }

      const assignedDriverId = await generateUniqueDriverId();

      const driverProfile: UserProfile = {
        uid: user.uid,
        name: driverFullName.trim(),
        email: user.email || '',
        phone: normalizedPhone,
        role: 'driver',
        driverId: assignedDriverId,
        active: true,
        createdAt: new Date().toISOString(),
      };

      await saveUserProfile(driverProfile);

      const newDriverRecord: Driver = {
        id: assignedDriverId,
        driverId: assignedDriverId,
        uid: user.uid,
        name: driverFullName.trim(),
        email: user.email || '',
        phone: normalizedPhone,
        role: 'driver',
        licenseNumber: `DL-${Math.floor(100000 + Math.random() * 900000)}`,
        assignedVehicleId: undefined,
        assignedVehicleReg: undefined,
        safetyScore: 85,
        riskLevel: 'SAFE',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        experienceYears: 2,
        totalTrips: 0,
        incidentCount: 0,
        trendPercentage: 0,
        trendDirection: 'stable',
        breakdown: { speeding: 0, drowsiness: 0, distraction: 0, harshBraking: 0 },
        recentEvents: ['Driver account registered on SafeFleet AI'],
      };

      await saveDriverRecord(newDriverRecord);

      onProfileCreated(driverProfile);
    } catch (err: any) {
      console.error('Error saving driver profile:', err);
      setErrorMessage('Failed to create driver record. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[90vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-xl shadow-blue-900/40 border border-blue-400/30 mb-4">
            <span className="text-2xl font-black tracking-tighter text-white">SF</span>
          </div>
          <h1 className="text-xl font-extrabold uppercase tracking-tight text-white sm:text-2xl">
            WELCOME TO SAFEFLEET AI
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-300">
            Welcome, <span className="font-bold text-white">{displayName}</span>
          </p>
          <div className="mt-1 flex items-center justify-center gap-1.5 text-xs text-emerald-400 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Your Google account has been authenticated.</span>
          </div>
        </div>

        {/* Main Card */}
        <div className="rounded-2xl border border-slate-800 bg-[#1E293B] p-6 sm:p-8 shadow-2xl shadow-slate-950/60 backdrop-blur-xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4 text-center">
            Choose your SafeFleet account type:
          </p>

          {/* Role Selection Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {/* Driver Option */}
            <button
              type="button"
              id="btn-onboarding-driver"
              onClick={handleSelectDriver}
              disabled={isLoading}
              className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all cursor-pointer ${
                selectedRole === 'driver'
                  ? 'border-emerald-500 bg-emerald-950/40 ring-2 ring-emerald-500/40'
                  : 'border-slate-700 bg-slate-900 hover:border-emerald-500/40 hover:bg-emerald-950/20'
              }`}
            >
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-1">
                <Truck className="h-4 w-4" />
                <span>Driver</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Access your real-time cab safety gauge, incident breakdown, and individual safety trend.
              </p>
            </button>

            {/* Fleet Manager Option */}
            <button
              type="button"
              id="btn-onboarding-manager"
              onClick={handleSelectManager}
              disabled={isLoading}
              className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all cursor-pointer ${
                selectedRole === 'manager'
                  ? 'border-blue-500 bg-blue-950/40 ring-2 ring-blue-500/40'
                  : 'border-slate-700 bg-slate-900 hover:border-blue-500/40 hover:bg-blue-900/20'
              }`}
            >
              <div className="flex items-center gap-2 text-blue-400 font-bold text-sm mb-1">
                <ShieldCheck className="h-4 w-4" />
                <span>Fleet Manager</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Full supervisory dashboard, fleet-wide telematics, driver risk matrix, and live operations dispatch.
              </p>
            </button>
          </div>

          {/* Driver Registration Form (when Driver is selected) */}
          {isDriverFormOpen && (
            <div className="mb-6 rounded-xl border border-emerald-500/30 bg-slate-900/90 p-4 space-y-3 animate-fadeIn">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={driverFullName}
                    onChange={(e) => setDriverFullName(e.target.value)}
                    placeholder="Arun Kumar"
                    required
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-9 pr-3.5 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mobile Phone Number (for Emergency Voice Calls)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    placeholder="+91 98421 88412"
                    required
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-9 pr-3.5 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/30 p-3">
                <p className="text-[11px] font-medium text-emerald-300 leading-relaxed">
                  <span className="font-bold">Automatic Driver ID:</span> Your unique SafeFleet Driver ID (e.g., DRV-8023) will be generated automatically upon registration.
                </p>
              </div>

              <button
                type="button"
                id="btn-confirm-driver-onboarding"
                onClick={handleConfirmDriverRegistration}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-900/30 mt-2"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Configuring Driver Portal...</span>
                  </div>
                ) : (
                  <>
                    <span>Confirm Driver Profile &amp; Enter Portal</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Error Message Box */}
          {errorMessage && (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-500/40 bg-red-950/50 p-3 text-xs text-red-200 animate-fadeIn">
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Sign Out / Cancel */}
          <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              Authenticated as: <strong className="text-slate-400">{user.email}</strong>
            </span>
            <button
              type="button"
              onClick={() => signOut(auth)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
