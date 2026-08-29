import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DemoControlBar } from './components/DemoControlBar';
import { DashboardView } from './components/DashboardView';
import { LiveMonitoringView } from './components/LiveMonitoringView';
import { DriversView } from './components/DriversView';
import { VehiclesView } from './components/VehiclesView';
import { EventsTimelineView } from './components/EventsTimelineView';
import { AnalyticsView } from './components/AnalyticsView';
import { DemoScriptModal } from './components/DemoScriptModal';
import { LoginView } from './components/LoginView';
import { DriverPortalView } from './components/DriverPortalView';
import { OnboardingView } from './components/OnboardingView';
import { EmergencyCallModal } from './components/EmergencyCallModal';

import { ActiveNavTab, DemoScenario, Driver, RiskLevel, SafetyEvent, TelemetryState, Vehicle, UserProfile } from './types';
import { INITIAL_DRIVERS, INITIAL_EVENTS, INITIAL_VEHICLES } from './data/fleetData';
import { calculateCompoundRisk } from './utils/riskEngine';
import { DEMO_SCENARIOS } from './data/demoScenarios';
import { audioAlerts } from './utils/audioAlerts';
import { normalizePhoneNumber } from './utils/authUtils';
import { auth, onAuthStateChanged, signOut, User } from './lib/firebase';
import {
  initializeFleetCollections,
  subscribeToVehicles,
  subscribeToDrivers,
  subscribeToDriverRecord,
  subscribeToIncidents,
  subscribeToDriverIncidents,
  logSafetyIncidentToFirestore,
  updateIncidentInFirestore,
  updateVehicleInFirestore,
  getUserProfile,
  saveUserProfile,
  ensureDriverRecordExists
} from './lib/firestoreService';
import { AlertCircle, LogOut, ShieldAlert, Sparkles } from 'lucide-react';

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveNavTab>('dashboard');
  const [vehicles, setVehicles] = useState<Vehicle[]>(INITIAL_VEHICLES);
  const [drivers, setDrivers] = useState<Driver[]>(INITIAL_DRIVERS);
  const [events, setEvents] = useState<SafetyEvent[]>(INITIAL_EVENTS);

  // Selected vehicle for Live Monitoring (Default: Critical unit VEH-101 / TN38XX1234 driven by Arun Kumar)
  const [currentVehicleId, setCurrentVehicleId] = useState<string>('VEH-101');

  // Real-time Telemetry State
  const [telemetry, setTelemetry] = useState<TelemetryState>({
    speed: 92,
    speedLimit: 80,
    drivingDurationMinutes: 252,
    locationName: 'Coimbatore - Walayar Highway, NH544',
    timeOfDay: '22:45',
    isNightDriving: true,
    drowsinessDetected: true,
    drowsinessConfidence: 91,
    distractionDetected: true,
    distractionConfidence: 88,
  });

  const [currentScenarioId, setCurrentScenarioId] = useState<string | null>('scenario-5');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isDemoScriptOpen, setIsDemoScriptOpen] = useState<boolean>(false);

  // Phase 7: Emergency Outbound Call State
  const [emergencyCallTarget, setEmergencyCallTarget] = useState<{
    driverId: string;
    driverName: string;
    driverPhone?: string;
    vehicleReg: string;
    riskScore: number;
    riskLevel: RiskLevel;
    incidentId?: string;
    reason?: string;
  } | null>(null);

  // Current Risk Calculation (Single authoritative deterministic source of truth)
  const currentRisk = calculateCompoundRisk(telemetry);

  // Find active vehicle object safely
  const currentVehicle: Vehicle =
    vehicles.find((v) => v.id === currentVehicleId || v.registrationNumber === currentVehicleId) ||
    INITIAL_VEHICLES[0];

  // Listen to Firebase Auth state and resolve UserProfile from Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          let profile = await getUserProfile(user.uid);
          if (!profile) {
            // Check for dedicated demo accounts and auto-seed if needed
            const email = (user.email || '').toLowerCase();
            if (email === 'manager@demo.safefleet.ai') {
              const demoManagerProfile: UserProfile = {
                uid: user.uid,
                name: 'Sarah Jenkins',
                email: user.email || 'manager@demo.safefleet.ai',
                role: 'manager',
                active: true,
                createdAt: new Date().toISOString(),
              };
              await saveUserProfile(demoManagerProfile);
              profile = demoManagerProfile;
            } else if (email === 'driver@demo.safefleet.ai') {
              const demoDriverProfile: UserProfile = {
                uid: user.uid,
                name: 'Arun Kumar',
                email: user.email || 'driver@demo.safefleet.ai',
                role: 'driver',
                driverId: 'DRV-8021',
                active: true,
                createdAt: new Date().toISOString(),
              };
              await saveUserProfile(demoDriverProfile);
              profile = demoDriverProfile;
            }
          }

          if (profile) {
            if (profile.role === 'driver' && profile.driverId) {
              await ensureDriverRecordExists(profile);
            }
            setUserProfile(profile);
            setProfileError(null);
          } else {
            // Profile does not exist yet -> Render OnboardingView
            setUserProfile(null);
            setProfileError(null);
          }
        } catch (err: any) {
          console.error('Error resolving user profile:', err);
          setProfileError('Failed to load user profile. Please check connection and permissions.');
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setProfileError(null);
      }
      setAuthChecking(false);
    });

    return () => unsubscribe();
  }, []);

  // Initialize and subscribe to Firestore collections based on authenticated role
  useEffect(() => {
    if (!currentUser || !userProfile) return;

    if (userProfile.role === 'manager') {
      // Seed initial fleet data to Firestore if not yet populated
      initializeFleetCollections();

      // Real-time subscription to vehicles in Firestore
      const unsubVehicles = subscribeToVehicles((firestoreVehicles) => {
        if (firestoreVehicles && firestoreVehicles.length > 0) {
          setVehicles(firestoreVehicles);
        }
      });

      // Real-time subscription to all drivers in Firestore
      const unsubDrivers = subscribeToDrivers((firestoreDrivers) => {
        if (firestoreDrivers && firestoreDrivers.length > 0) {
          setDrivers(firestoreDrivers);
        }
      });

      // Real-time subscription to all incidents in Firestore
      const unsubIncidents = subscribeToIncidents((firestoreEvents) => {
        if (firestoreEvents && firestoreEvents.length > 0) {
          setEvents(firestoreEvents);
        }
      });

      return () => {
        unsubVehicles();
        unsubDrivers();
        unsubIncidents();
      };
    } else if (userProfile.role === 'driver') {
      const driverId = userProfile.driverId || 'DRV-8021';

      // Drivers only subscribe to their own single driver profile record
      const unsubDriver = subscribeToDriverRecord(driverId, (driverRecord) => {
        if (driverRecord) {
          setDrivers([driverRecord]);
        }
      });

      // Drivers subscribe to vehicles to get telemetry
      const unsubVehicles = subscribeToVehicles((firestoreVehicles) => {
        if (firestoreVehicles && firestoreVehicles.length > 0) {
          setVehicles(firestoreVehicles);
        }
      });

      // Drivers strictly query and subscribe only to incidents matching their driverId
      const unsubDriverIncidents = subscribeToDriverIncidents(driverId, (driverEvents) => {
        setEvents(driverEvents);
      });

      return () => {
        unsubDriver();
        unsubVehicles();
        unsubDriverIncidents();
      };
    }
  }, [currentUser, userProfile]);

  // Update vehicle risk and speed dynamically in local state when telemetry changes
  useEffect(() => {
    setVehicles((prev) =>
      prev.map((v) => {
        if (v.id === currentVehicleId) {
          return {
            ...v,
            speed: telemetry.speed,
            riskScore: currentRisk.score,
            riskLevel: currentRisk.level,
            locationName: telemetry.locationName,
          };
        }
        return v;
      })
    );
  }, [telemetry.speed, telemetry.locationName, currentRisk.score, currentRisk.level, currentVehicleId]);

  // Debounced update to Firestore for active vehicle telemetry (prevents excessive writes)
  useEffect(() => {
    if (!currentVehicleId || userProfile?.role !== 'manager') return;

    const timer = setTimeout(() => {
      updateVehicleInFirestore(currentVehicleId, {
        speed: telemetry.speed,
        riskScore: currentRisk.score,
        riskLevel: currentRisk.level,
        locationName: telemetry.locationName,
      });
    }, 4000);

    return () => clearTimeout(timer);
  }, [telemetry.speed, telemetry.locationName, currentRisk.score, currentRisk.level, currentVehicleId, userProfile?.role]);

  // Live Telemetry Simulation Loop (When "Auto Simulating Live Drive" is engaged)
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setTelemetry((prev) => {
        // Subtle natural speed oscillation
        const speedDelta = Math.sin(Date.now() / 3000) * 3;
        const newSpeed = Math.round(Math.max(40, Math.min(110, prev.speed + speedDelta)));
        return {
          ...prev,
          speed: newSpeed,
          drivingDurationMinutes: prev.drivingDurationMinutes + 1,
        };
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isSimulating]);

  // Handlers
  const handleUpdateTelemetry = (updated: Partial<TelemetryState>) => {
    setTelemetry((prev) => ({ ...prev, ...updated }));
    setCurrentScenarioId(null);
  };

  const handleSelectScenario = (scenario: DemoScenario) => {
    setCurrentScenarioId(scenario.id);
    setTelemetry(scenario.telemetry);
    setActiveTab('monitoring');

    const scenarioRisk = calculateCompoundRisk(scenario.telemetry);
    if (scenarioRisk.level === 'CRITICAL') {
      audioAlerts.playCriticalAlarm();
    } else if (scenarioRisk.level === 'HIGH' || scenarioRisk.level === 'MODERATE') {
      audioAlerts.playCautionChime();
    }
  };

  const handleSelectVehicleForMonitoring = (vehicle: Vehicle) => {
    setCurrentVehicleId(vehicle.id);
    setTelemetry((prev) => ({
      ...prev,
      speed: vehicle.speed,
      speedLimit: vehicle.speedLimit,
      locationName: vehicle.locationName,
      drowsinessDetected: vehicle.riskLevel === 'CRITICAL' || vehicle.riskLevel === 'HIGH',
      drowsinessConfidence: vehicle.riskLevel === 'CRITICAL' ? 91 : vehicle.riskLevel === 'HIGH' ? 82 : 0,
      distractionDetected: vehicle.riskLevel === 'CRITICAL',
      distractionConfidence: vehicle.riskLevel === 'CRITICAL' ? 88 : 0,
    }));
    setActiveTab('monitoring');
  };

  const handleSelectDriverForMonitoring = (driver: Driver) => {
    const matchedVehicle =
      vehicles.find(
        (v) =>
          v.driverId === driver.id ||
          v.id === driver.assignedVehicleId ||
          v.registrationNumber === driver.assignedVehicleReg
      ) || vehicles[0];
    handleSelectVehicleForMonitoring(matchedVehicle);
  };

  const handleTriggerHarshBraking = () => {
    audioAlerts.playCautionChime();
    setTelemetry((prev) => ({
      ...prev,
      speed: Math.max(0, prev.speed - 32),
      harshBrakingDetected: true,
    }));

    handleLogIncident(
      `Harsh Braking Maneuver (-0.52G) detected on ${currentVehicle.registrationNumber}`,
      'Sudden deceleration recorded in CAN-bus safety buffer'
    );
  };

  const handleLogIncident = (
    description: string,
    arg2?: string,
    arg3?: string
  ) => {
    const resolvedDriverId =
      userProfile?.role === 'driver'
        ? userProfile.driverId || 'DRV-8021'
        : currentVehicle?.driverId ||
          drivers.find(
            (d) =>
              d.assignedVehicleId === currentVehicle?.id ||
              d.assignedVehicleReg === currentVehicle?.registrationNumber
          )?.id ||
          'DRV-8021';

    const resolvedDriverName =
      userProfile?.role === 'driver'
        ? userProfile.name || 'Arun Kumar'
        : currentVehicle?.driverName ||
          drivers.find((d) => d.id === resolvedDriverId)?.name ||
          'Arun Kumar';

    const resolvedVehicleId = currentVehicle?.id || 'VEH-101';
    const resolvedVehicleReg = currentVehicle?.registrationNumber || 'TN38XX1234';

    // The Risk Engine is the single authoritative source of truth for risk level & score
    const authoritativeSeverity: RiskLevel = currentRisk.level;
    const authoritativeScore: number = currentRisk.score;

    // Resolve actionTaken whether called with (desc, action) or (desc, sev, action)
    const actionTaken =
      arg3 !== undefined
        ? arg3
        : (arg2 && !['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'SAFE', 'MODERATE'].includes(arg2))
        ? arg2
        : 'Operations advisory dispatched';

    const newEvent: SafetyEvent = {
      id: `EVT-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      driverId: resolvedDriverId,
      driverName: resolvedDriverName,
      vehicleId: resolvedVehicleId,
      vehicleReg: resolvedVehicleReg,
      severity: authoritativeSeverity,
      riskScore: authoritativeScore,
      description: description || 'Safety event recorded',
      actionTaken,
      location: telemetry.locationName || currentVehicle?.locationName || 'Coimbatore - Walayar Highway, NH544',
      factors: (currentRisk.factors || []).map((f) => f.factor),
    };

    // Optimistic local state update (preventing duplicate IDs)
    setEvents((prev) => {
      if (prev.some((e) => e.id === newEvent.id)) return prev;
      return [newEvent, ...prev];
    });

    // Persist as single source of truth in Cloud Firestore
    logSafetyIncidentToFirestore(newEvent);
  };

  // Phase 7: Emergency Outbound Call Handler
  const handleInitiateEmergencyCall = (target: {
    driverId: string;
    driverName: string;
    driverPhone?: string;
    vehicleReg: string;
    riskScore: number;
    riskLevel: any;
    incidentId?: string;
    reason?: string;
  }) => {
    let phone = target.driverPhone;
    if (!phone) {
      const matched = drivers.find(
        (d) => d.id === target.driverId || d.name.toLowerCase() === target.driverName.toLowerCase()
      );
      phone = matched?.phone || INITIAL_DRIVERS.find((d) => d.id === target.driverId)?.phone || '+91 98421 88412';
    }

    setEmergencyCallTarget({
      ...target,
      driverPhone: phone,
      riskLevel: target.riskLevel || 'CRITICAL',
    });
  };

  const handleCallSuccess = (result: {
    callSid: string;
    callStatus: string;
    callType: 'live' | 'demo';
    driverPhone: string;
    callFrom?: string;
    callTo?: string;
  }) => {
    if (emergencyCallTarget?.incidentId) {
      // Update existing incident record
      const updates: Partial<SafetyEvent> = {
        callInitiatedAt: new Date().toISOString(),
        callInitiatedBy: userProfile?.name || 'Fleet Manager',
        callStatus: result.callStatus,
        callProviderId: result.callSid,
        callType: result.callType,
        callFrom: result.callFrom,
        callTo: result.callTo,
      };

      setEvents((prev) =>
        prev.map((e) => (e.id === emergencyCallTarget.incidentId ? { ...e, ...updates } : e))
      );

      updateIncidentInFirestore(emergencyCallTarget.incidentId, updates);
    } else {
      // Create a fresh escalation incident entry
      const newEvent: SafetyEvent = {
        id: `EVT-CALL-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        driverId: emergencyCallTarget?.driverId || currentVehicle.driverId,
        driverName: emergencyCallTarget?.driverName || currentVehicle.driverName,
        vehicleId: currentVehicle.id,
        vehicleReg: emergencyCallTarget?.vehicleReg || currentVehicle.registrationNumber,
        severity: emergencyCallTarget?.riskLevel || 'CRITICAL',
        riskScore: emergencyCallTarget?.riskScore || currentRisk.score,
        description: `Fleet Manager Emergency Call Escalation to ${emergencyCallTarget?.driverName || 'Driver'}`,
        actionTaken: `Outbound emergency call placed (${result.callType === 'live' ? 'Twilio Live' : 'Demo Mode'}) - SID: ${result.callSid}`,
        location: telemetry.locationName || currentVehicle.locationName || 'Coimbatore - Walayar Highway, NH544',
        factors: (currentRisk.factors || []).map((f) => f.factor),
        callInitiatedAt: new Date().toISOString(),
        callInitiatedBy: userProfile?.name || 'Fleet Manager',
        callStatus: result.callStatus,
        callProviderId: result.callSid,
        callType: result.callType,
        callFrom: result.callFrom,
        callTo: result.callTo,
      };

      setEvents((prev) => [newEvent, ...prev]);
      logSafetyIncidentToFirestore(newEvent);
    }
  };

  // Step Handler for Hackathon 2-Minute Demo Script
  const handleExecuteDemoStep = (stepNum: number) => {
    if (stepNum === 1) {
      setActiveTab('dashboard');
    } else if (stepNum === 2) {
      setActiveTab('monitoring');
      const safe = DEMO_SCENARIOS.find((s) => s.id === 'scenario-1');
      if (safe) handleSelectScenario(safe);
    } else if (stepNum === 3) {
      setActiveTab('monitoring');
      setTelemetry((prev) => ({
        ...prev,
        speed: 94,
        drowsinessDetected: false,
        distractionDetected: false,
      }));
    } else if (stepNum === 4) {
      setActiveTab('monitoring');
      const sc3 = DEMO_SCENARIOS.find((s) => s.id === 'scenario-3');
      if (sc3) handleSelectScenario(sc3);
    } else if (stepNum === 5) {
      setActiveTab('monitoring');
      const sc5 = DEMO_SCENARIOS.find((s) => s.id === 'scenario-5');
      if (sc5) handleSelectScenario(sc5);
    } else if (stepNum === 6) {
      setActiveTab('monitoring');
      audioAlerts.playCriticalAlarm();
      handleLogIncident(
        'Critical Compound Risk Proactive Intervention Triggered',
        'CRITICAL',
        'In-cab audio buzzer + Fleet manager dispatch bridge engaged'
      );
    } else if (stepNum === 7) {
      setActiveTab('events');
    }
  };

  const criticalEventCount = events.filter((e) => e.severity === 'CRITICAL').length;

  // 1. Initial Loading Screen while checking Authentication
  if (authChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F172A] text-slate-100">
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-xl shadow-blue-900/40 border border-blue-400/30">
            <span className="text-2xl font-black text-white">SF</span>
          </div>
          <h2 className="text-lg font-bold text-white uppercase tracking-wider">
            SafeFleet AI
          </h2>
          <div className="flex items-center justify-center gap-2 text-xs text-blue-400">
            <div className="h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <span>Resolving Secure Authentication &amp; Permissions...</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated state -> Show Login View
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0F172A]">
        <LoginView />
      </div>
    );
  }

  // 3. Authenticated but Profile Not Yet Created / Onboarding Flow
  if (!userProfile) {
    if (profileError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#0F172A] p-4 text-slate-100">
          <div className="w-full max-w-md rounded-2xl border border-red-500/40 bg-[#1E293B] p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-950/60 border border-red-500/30 mb-4">
              <AlertCircle className="h-6 w-6 text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Role Access Restriction</h3>
            <p className="text-xs text-slate-300 mb-6">{profileError}</p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => signOut(auth)}
                className="flex items-center gap-2 rounded-lg bg-slate-800 border border-slate-700 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition-all cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#0F172A]">
        <OnboardingView
          user={currentUser}
          onProfileCreated={(profile) => {
            setUserProfile(profile);
            setProfileError(null);
          }}
        />
      </div>
    );
  }

  // If driver profile is missing phone number, show profile completion screen
  if (userProfile.role === 'driver' && !userProfile.phone) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F172A] px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#1E293B] p-6 sm:p-8 shadow-2xl">
          <h2 className="text-xl font-extrabold uppercase text-white mb-2">COMPLETE YOUR DRIVER PROFILE</h2>
          <p className="text-xs text-slate-300 mb-4">
            Your mobile number is required for emergency safety communication.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const phoneInput = (e.currentTarget.elements.namedItem('phone') as HTMLInputElement)?.value;
              const normalized = normalizePhoneNumber(phoneInput);
              const updatedProfile = { ...userProfile, phone: normalized };
              await saveUserProfile(updatedProfile);
              setUserProfile(updatedProfile);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                defaultValue={userProfile.name}
                disabled
                className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3.5 py-2 text-xs text-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Mobile Number</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="+91 98421 88412"
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs text-white"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 transition-all cursor-pointer"
            >
              SAVE &amp; CONTINUE
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 4. Role: Commercial Driver -> Render Driver Portal View
  if (userProfile.role === 'driver') {
    const assignedDriver =
      drivers.find((d) => d.id === (userProfile.driverId || 'DRV-8021')) ||
      INITIAL_DRIVERS.find((d) => d.id === (userProfile.driverId || 'DRV-8021')) ||
      INITIAL_DRIVERS[0];

    const assignedVehicle =
      vehicles.find(
        (v) =>
          v.driverId === assignedDriver.id ||
          v.id === assignedDriver.assignedVehicleId ||
          v.registrationNumber === assignedDriver.assignedVehicleReg
      ) || INITIAL_VEHICLES[0];

    const driverSpecificIncidents = events.filter(
      (e) => e.driverId === assignedDriver.id || e.driverId === userProfile.driverId
    );

    return (
      <DriverPortalView
        userProfile={userProfile}
        driver={assignedDriver}
        vehicle={assignedVehicle}
        driverIncidents={driverSpecificIncidents}
        onSignOut={() => signOut(auth)}
      />
    );
  }

  // 5. Role: Fleet Manager -> Render Fleet Manager Dashboard
  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 antialiased selection:bg-blue-600 selection:text-white flex flex-col justify-between">
      <div>
        {/* Top Main Navigation Bar */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          criticalEventCount={criticalEventCount}
          isAudioMuted={isAudioMuted}
          setIsAudioMuted={setIsAudioMuted}
          onOpenDemoScript={() => setIsDemoScriptOpen(true)}
          currentUser={currentUser}
          userProfile={userProfile}
        />

        {/* Demo Simulation Bar */}
        <DemoControlBar
          currentScenarioId={currentScenarioId}
          onSelectScenario={handleSelectScenario}
          telemetry={telemetry}
          isSimulating={isSimulating}
          setIsSimulating={setIsSimulating}
        />

        {/* Main Content Area */}
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          {activeTab === 'dashboard' && (
            <DashboardView
              vehicles={vehicles}
              drivers={drivers}
              events={events}
              onSelectVehicleForMonitoring={handleSelectVehicleForMonitoring}
              onNavigateToTab={setActiveTab}
              onInitiateEmergencyCall={handleInitiateEmergencyCall}
            />
          )}

          {activeTab === 'monitoring' && (
            <LiveMonitoringView
              telemetry={telemetry}
              onUpdateTelemetry={handleUpdateTelemetry}
              risk={currentRisk}
              currentVehicle={currentVehicle}
              driverPhone={drivers.find((d) => d.id === currentVehicle.driverId || d.name.toLowerCase() === currentVehicle.driverName.toLowerCase())?.phone}
              onTriggerHarshBraking={handleTriggerHarshBraking}
              onLogIncident={handleLogIncident}
              onViewEvents={() => setActiveTab('events')}
              onInitiateEmergencyCall={handleInitiateEmergencyCall}
            />
          )}

          {activeTab === 'drivers' && (
            <DriversView
              drivers={drivers}
              events={events}
              onSelectDriverForMonitoring={handleSelectDriverForMonitoring}
            />
          )}

          {activeTab === 'vehicles' && (
            <VehiclesView
              vehicles={vehicles}
              onSelectVehicleForMonitoring={handleSelectVehicleForMonitoring}
            />
          )}

          {activeTab === 'events' && (
            <EventsTimelineView
              events={events}
              drivers={drivers}
              onInitiateEmergencyCall={handleInitiateEmergencyCall}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView
              vehicles={vehicles}
              drivers={drivers}
              events={events}
              isSimulating={isSimulating}
            />
          )}
        </main>
      </div>

      {/* Professional Polish Footer Status Bar */}
      <footer className="h-9 bg-slate-900 border-t border-slate-800 px-6 flex items-center justify-between shrink-0 text-[11px] text-slate-400 mt-8">
        <div className="flex items-center gap-4 sm:gap-6 font-mono">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
            System: <strong className="text-slate-300">Live</strong>
          </span>
          <span className="hidden sm:inline">Telemetry: <strong className="text-slate-300">Synchronized</strong></span>
          <span>Risk Engine: <strong className="text-emerald-400">Online</strong></span>
          <span className="hidden md:inline text-blue-400">Role: <strong>Fleet Manager</strong></span>
        </div>
        <div className="text-[10px] text-slate-500">
          Commercial fleet safety monitoring &copy; SafeFleet AI
        </div>
      </footer>

      {/* Emergency Driver Call Modal */}
      <EmergencyCallModal
        isOpen={Boolean(emergencyCallTarget)}
        onClose={() => setEmergencyCallTarget(null)}
        driverId={emergencyCallTarget?.driverId || ''}
        driverName={emergencyCallTarget?.driverName || ''}
        driverPhone={emergencyCallTarget?.driverPhone}
        vehicleReg={emergencyCallTarget?.vehicleReg || ''}
        riskScore={emergencyCallTarget?.riskScore || 85}
        riskLevel={emergencyCallTarget?.riskLevel || 'CRITICAL'}
        incidentId={emergencyCallTarget?.incidentId}
        reason={emergencyCallTarget?.reason}
        userProfile={userProfile}
        onCallSuccess={handleCallSuccess}
      />

      {/* Demo Script Walkthrough Modal */}
      <DemoScriptModal
        isOpen={isDemoScriptOpen}
        onClose={() => setIsDemoScriptOpen(false)}
        onNavigateToTab={setActiveTab}
        onExecuteDemoStep={handleExecuteDemoStep}
      />
    </div>
  );
}

export default App;
