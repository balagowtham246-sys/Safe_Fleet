import React, { useState } from 'react';
import {
  ShieldAlert,
  Lock,
  Mail,
  Truck,
  UserCheck,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  KeyRound,
  Sparkles,
  Info,
  Phone,
  User
} from 'lucide-react';
import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  googleProvider
} from '../lib/firebase';
import { saveUserProfile, getUserProfile, generateUniqueDriverId, saveDriverRecord } from '../lib/firestoreService';
import { UserProfile, Driver } from '../types';
import { normalizePhoneNumber } from '../utils/authUtils';

interface LoginViewProps {
  onLoginSuccess?: (profile: UserProfile) => void;
}

export const LoginView: React.FC<LoginViewProps> = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [signupRole, setSignupRole] = useState<'driver' | 'manager'>('driver');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  // Handle manual form submission
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    if (authMode === 'signup') {
      if (!fullName.trim()) {
        setErrorMessage('Please enter your full name.');
        return;
      }
      if (!phone.trim()) {
        setErrorMessage('Please enter your mobile phone number for emergency safety alerts.');
        return;
      }
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (authMode === 'signin') {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        const userCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const isManager = signupRole === 'manager';
        const normalizedPhone = normalizePhoneNumber(phone);

        // Duplicate protection check
        const existingProfile = await getUserProfile(userCred.user.uid);
        if (existingProfile) {
          return;
        }

        const assignedDriverId = isManager ? undefined : await generateUniqueDriverId();

        const initialProfile: UserProfile = {
          uid: userCred.user.uid,
          name: fullName.trim(),
          email: userCred.user.email || email.trim(),
          phone: normalizedPhone,
          role: isManager ? 'manager' : 'driver',
          driverId: assignedDriverId,
          active: true,
          createdAt: new Date().toISOString(),
        };
        await saveUserProfile(initialProfile);

        if (!isManager && assignedDriverId) {
          const driverRecord: Driver = {
            id: assignedDriverId,
            driverId: assignedDriverId,
            uid: userCred.user.uid,
            name: fullName.trim(),
            email: userCred.user.email || email.trim(),
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
            recentEvents: ['Account registered via SafeFleet portal'],
          };
          await saveDriverRecord(driverRecord);
        }
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
      const code = err?.code || '';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setErrorMessage('Invalid email or password. Please verify your credentials.');
      } else if (code === 'auth/user-disabled') {
        setErrorMessage('This user account has been disabled. Contact your fleet safety administrator.');
      } else if (code === 'auth/email-already-in-use') {
        setErrorMessage('An account with this email address already exists. Please sign in instead.');
      } else if (code === 'auth/weak-password') {
        setErrorMessage('Password must be at least 6 characters in length.');
      } else if (code === 'auth/invalid-email') {
        setErrorMessage('Please enter a valid email address format.');
      } else if (code === 'auth/network-request-failed') {
        setErrorMessage('Network connection error. Please check your internet connection.');
      } else {
        setErrorMessage(err?.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Helper for quick Demo Account sign-in
  const handleQuickDemoLogin = async (type: 'manager' | 'driver') => {
    setIsLoading(true);
    setErrorMessage(null);

    const demoEmail = type === 'manager' ? 'manager@demo.safefleet.ai' : 'driver@demo.safefleet.ai';
    const demoPassword = type === 'manager' ? 'SafeFleetManager2026!' : 'SafeFleetDriver2026!';
    const demoName = type === 'manager' ? 'Sarah Jenkins' : 'Arun Kumar';
    const driverId = type === 'driver' ? 'DRV-8021' : undefined;

    try {
      let userCred;
      try {
        userCred = await signInWithEmailAndPassword(auth, demoEmail, demoPassword);
      } catch (signInErr: any) {
        if (signInErr?.code === 'auth/user-not-found' || signInErr?.code === 'auth/invalid-credential') {
          // If not created yet in this Firebase project, create it cleanly
          userCred = await createUserWithEmailAndPassword(auth, demoEmail, demoPassword);
        } else {
          throw signInErr;
        }
      }

      // Ensure profile is synced to Firestore users collection
      if (userCred?.user) {
        const existing = await getUserProfile(userCred.user.uid);
        if (!existing) {
          const profile: UserProfile = {
            uid: userCred.user.uid,
            name: demoName,
            email: demoEmail,
            role: type,
            driverId,
            active: true,
            createdAt: new Date().toISOString(),
          };
          await saveUserProfile(profile);
        }
      }
    } catch (err: any) {
      console.error('Demo login error:', err);
      setErrorMessage(err?.message || 'Failed to authenticate demo account.');
    } finally {
      setIsLoading(false);
    }
  };

  // Google Sign In option
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await signInWithPopup(auth, googleProvider);
      // Auth state changes are handled by the main auth state listener in App.tsx
    } catch (err: any) {
      console.warn('Google sign-in error:', err);
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        // User closed popup without signing in
      } else if (code === 'auth/popup-blocked') {
        setErrorMessage('Google sign-in popup was blocked by your browser. Please allow popups for this site.');
      } else if (code === 'auth/network-request-failed') {
        setErrorMessage('Network connection error. Please check your internet connection.');
      } else if (code === 'auth/user-disabled') {
        setErrorMessage('This user account has been disabled. Contact your fleet administrator.');
      } else {
        setErrorMessage(err?.message || 'Google sign-in failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[90vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* SafeFleet AI Logo & Branding Header */}
        <div className="text-center mb-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-xl shadow-blue-900/40 border border-blue-400/30 mb-4">
            <span className="text-2xl font-black tracking-tighter text-white">SF</span>
          </div>
          <h1 className="text-2xl font-extrabold uppercase tracking-tight text-white sm:text-3xl">
            SafeFleet AI
          </h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-blue-400">
            Intelligent Driver Safety &amp; Risk Intelligence
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Secure Role-Based Access for Fleet Managers &amp; Commercial Drivers
          </p>
        </div>

        {/* Main Authentication Card */}
        <div className="rounded-2xl border border-slate-800 bg-[#1E293B] p-6 sm:p-8 shadow-2xl shadow-slate-950/60 backdrop-blur-xl">
          {/* Quick Demo Role Selector */}
          <div className="mb-6 rounded-xl bg-slate-900/90 p-3 border border-slate-800">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-2.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Instant Demo Role Switcher</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                id="btn-demo-manager-login"
                onClick={() => handleQuickDemoLogin('manager')}
                disabled={isLoading}
                className="flex flex-col items-start rounded-lg border border-blue-500/30 bg-blue-950/40 p-2.5 text-left hover:bg-blue-900/40 transition-all disabled:opacity-50 group"
              >
                <div className="flex items-center gap-1.5 text-blue-400 font-bold text-xs">
                  <ShieldCheck className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
                  <span>Fleet Manager</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 font-mono">
                  manager@demo.safefleet.ai
                </span>
              </button>

              <button
                type="button"
                id="btn-demo-driver-login"
                onClick={() => handleQuickDemoLogin('driver')}
                disabled={isLoading}
                className="flex flex-col items-start rounded-lg border border-emerald-500/30 bg-emerald-950/40 p-2.5 text-left hover:bg-emerald-900/40 transition-all disabled:opacity-50 group"
              >
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                  <Truck className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
                  <span>Driver (DRV-8021)</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 font-mono">
                  driver@demo.safefleet.ai
                </span>
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#1E293B] px-2 text-[10px] font-semibold text-slate-500 tracking-wider">
                Or Sign In with Email &amp; Password
              </span>
            </div>
          </div>

          {/* Error Message Box */}
          {errorMessage && (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-500/40 bg-red-950/50 p-3 text-xs text-red-200 animate-fadeIn">
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Email / Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {authMode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      id="input-signup-fullname"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Arun Kumar"
                      required={authMode === 'signup'}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Mobile Phone Number (for Emergency Voice Calls)
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      id="input-signup-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      required={authMode === 'signup'}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Account Role
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSignupRole('driver')}
                      className={`rounded-lg border px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                        signupRole === 'driver'
                          ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300'
                          : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Driver
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignupRole('manager')}
                      className={`rounded-lg border px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                        signupRole === 'manager'
                          ? 'border-blue-500 bg-blue-950/60 text-blue-300'
                          : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Fleet Manager
                    </button>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Corporate Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="input-login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@safefleet.ai"
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Password
                </label>
                {authMode === 'signin' && (
                  <span className="text-[10px] text-slate-400">
                    Min 6 characters
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="input-login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="btn-submit-auth"
              type="submit"
              disabled={isLoading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-900/30 hover:bg-blue-500 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating Identity...</span>
                </div>
              ) : (
                <>
                  <span>{authMode === 'signin' ? 'Sign In to SafeFleet' : 'Create SafeFleet Account'}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Toggle between Sign In & Sign Up */}
          <div className="mt-4 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800 pt-3">
            <span>
              {authMode === 'signin' ? "Don't have an account yet?" : 'Already registered?'}
            </span>
            <button
              type="button"
              onClick={() => {
                setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                setErrorMessage(null);
              }}
              className="font-semibold text-blue-400 hover:text-blue-300 underline"
            >
              {authMode === 'signin' ? 'Register Account' : 'Back to Sign In'}
            </button>
          </div>

          {/* Google SSO button */}
          <div className="mt-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-all disabled:opacity-50"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.8 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>
        </div>

        {/* Security & Zero-Trust Notice */}
        <div className="mt-6 flex items-center justify-center gap-2 text-center text-[11px] text-slate-400">
          <KeyRound className="h-3.5 w-3.5 text-blue-400" />
          <span>Protected by Firebase Authentication &amp; Firestore Security Rules</span>
        </div>
      </div>
    </div>
  );
};
