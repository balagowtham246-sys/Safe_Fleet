export type UserRole = 'manager' | 'driver';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  driverId?: string;
  active: boolean;
  createdAt?: string | any;
}

export type RiskLevel = 'SAFE' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface RiskFactorItem {
  id: string;
  factor: string;
  label: string;
  points: number;
  details: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  icon: string;
}

export interface RiskEngineResult {
  score: number;
  level: RiskLevel;
  factors: RiskFactorItem[];
  compoundRiskDetected: boolean;
  compoundMultiplier: number;
  compoundReason?: string;
  recommendedAction: string;
  driverWarning?: string;
  managerAlert?: string;
  summaryExplanation: string;
}

export interface TelemetryState {
  speed: number;
  speedLimit: number;
  drowsinessDetected: boolean;
  drowsinessConfidence: number;
  distractionDetected: boolean;
  distractionConfidence: number;
  isNightDriving: boolean;
  drivingDurationMinutes: number;
  harshBrakingDetected: boolean;
  locationName: string;
  vehicleId: string;
  driverId: string;
  timeOfDay: string;
}

export interface Driver {
  id: string;
  driverId?: string;
  uid?: string;
  name: string;
  email?: string;
  role?: string;
  phone: string;
  licenseNumber: string;
  assignedVehicleId: string;
  assignedVehicleReg: string;
  safetyScore: number;
  riskLevel: RiskLevel;
  avatar: string;
  experienceYears: number;
  totalTrips: number;
  incidentCount: number;
  trendPercentage: number;
  trendDirection: 'improving' | 'declining' | 'stable';
  breakdown: {
    speeding: number;
    drowsiness: number;
    distraction: number;
    harshBraking: number;
  };
  recentEvents: string[];
}

export interface Vehicle {
  id: string;
  registrationNumber: string;
  model: string;
  driverId: string;
  driverName: string;
  latitude: number;
  longitude: number;
  speed: number;
  speedLimit: number;
  status: 'ACTIVE' | 'IDLE' | 'REST_STOP' | 'MAINTENANCE';
  riskScore: number;
  riskLevel: RiskLevel;
  drivingDurationMinutes: number;
  locationName: string;
  heading: number;
  lastUpdated: string;
  fuelLevel?: number;
  odometerKm?: number;
}

export interface SafetyEvent {
  id: string;
  driverId: string;
  driverName: string;
  vehicleId: string;
  vehicleReg: string;
  eventType?: string;
  severity: RiskLevel | 'LOW' | 'MEDIUM';
  confidence?: number;
  timestamp: string;
  location: string;
  description: string;
  actionTaken: string;
  resolved?: boolean;
  riskScore?: number;
  riskScoreAtTime?: number;
  factors: string[];
  callInitiatedAt?: string;
  callInitiatedBy?: string;
  callStatus?: 'initiating' | 'queued' | 'ringing' | 'in-progress' | 'completed' | 'failed' | 'busy' | 'no-answer' | 'demo_simulated' | string;
  callProviderId?: string;
  callType?: 'live' | 'demo';
  callFrom?: string;
  callTo?: string;
}

export interface DemoScenario {
  id: string;
  title: string;
  scenarioNumber: number;
  description: string;
  telemetry: TelemetryState;
  highlightText?: string;
}

export type ActiveNavTab = 'dashboard' | 'monitoring' | 'drivers' | 'vehicles' | 'events' | 'analytics';
