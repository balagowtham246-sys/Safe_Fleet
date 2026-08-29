import { RiskEngineResult, RiskFactorItem, RiskLevel, TelemetryState } from '../types';

/**
 * Standardized fleet risk thresholds:
 * 0–39   = SAFE
 * 40–69  = MODERATE
 * 70–84  = HIGH
 * 85–100 = CRITICAL
 */
export const RISK_THRESHOLDS = {
  SAFE_MIN: 0,
  SAFE_MAX: 39,
  MODERATE_MIN: 40,
  MODERATE_MAX: 69,
  HIGH_MIN: 70,
  HIGH_MAX: 84,
  CRITICAL_MIN: 85,
  CRITICAL_MAX: 100,
} as const;

/**
 * Authoritative single source of truth for converting risk score to risk level.
 */
export function getRiskLevelFromScore(score: number): RiskLevel {
  const normalized = Math.min(100, Math.max(0, Math.round(score)));
  if (normalized >= 85) return 'CRITICAL';
  if (normalized >= 70) return 'HIGH';
  if (normalized >= 40) return 'MODERATE';
  return 'SAFE';
}

/**
 * calculateCompoundRisk
 * Single authoritative source of truth for fleet driver risk calculation.
 * Produces deterministic, 100% explainable scores directly reproducible from visible factors.
 */
export function calculateCompoundRisk(telemetry: TelemetryState): RiskEngineResult {
  const factors: RiskFactorItem[] = [];

  const speed = telemetry.speed ?? 0;
  const speedLimit = telemetry.speedLimit || 80;
  const speedExcess = speed - speedLimit;
  const hasSpeeding = speedExcess > 0;
  const hasDrowsiness = Boolean(telemetry.drowsinessDetected);
  const hasDistraction = Boolean(telemetry.distractionDetected);
  const hasNight = Boolean(telemetry.isNightDriving);
  const hasLongShift = (telemetry.drivingDurationMinutes ?? 0) >= 180;
  const hasCriticalShift = (telemetry.drivingDurationMinutes ?? 0) >= 240;
  const hasHarshBraking = Boolean(telemetry.harshBrakingDetected);

  const isMultiFactor = [hasSpeeding, hasDrowsiness, hasDistraction, hasNight].filter(Boolean).length >= 3;

  // 1. Speeding Risk Factor
  if (hasSpeeding) {
    let speedPoints = 12;
    let sev: 'medium' | 'high' | 'critical' = 'medium';

    if (speedExcess >= 14) {
      speedPoints = isMultiFactor ? 25 : 35;
      sev = 'critical';
    } else if (speedExcess >= 8) {
      speedPoints = isMultiFactor ? 20 : 25;
      sev = 'high';
    } else {
      speedPoints = 12;
      sev = 'medium';
    }

    factors.push({
      id: 'speeding',
      factor: 'Speeding',
      label: `Speed: ${speed} km/h (Limit: ${speedLimit} km/h)`,
      points: speedPoints,
      details: `${speedExcess} km/h above corridor speed limit (${speed} vs ${speedLimit} km/h)`,
      severity: sev,
      icon: 'Gauge',
    });
  }

  // 2. Drowsiness / Microsleep Risk Factor (High single-vector severity)
  if (hasDrowsiness) {
    const confidence = telemetry.drowsinessConfidence || 90;
    // Primary driver alertness failure is inherently high risk (50 pts isolated, 25 pts multi-factor)
    const drowsinessPoints = isMultiFactor ? 25 : 50;

    factors.push({
      id: 'drowsiness',
      factor: 'Drowsiness',
      label: 'Drowsiness Detected',
      points: drowsinessPoints,
      details: `Prolonged eyelid closure (PERCLOS index > 0.28, ${confidence}% confidence)`,
      severity: 'critical',
      icon: 'Moon',
    });
  }

  // 3. Driver Distraction / Mobile Device Handling
  if (hasDistraction) {
    const confidence = telemetry.distractionConfidence || 88;
    const phonePoints = isMultiFactor ? 15 : 30;

    factors.push({
      id: 'distraction',
      factor: 'Distraction',
      label: 'Phone Usage / Inattention',
      points: phonePoints,
      details: `In-cab mobile device handling detected (${confidence}% confidence)`,
      severity: 'high',
      icon: 'Smartphone',
    });
  }

  // 4. Extended Continuous Driving Duration
  const durationMinutes = telemetry.drivingDurationMinutes ?? 0;
  const durationHours = durationMinutes / 60;

  if (hasCriticalShift) {
    factors.push({
      id: 'duration',
      factor: 'Extended Driving Shift',
      label: `Continuous Driving (${durationHours.toFixed(1)}h)`,
      points: 10,
      details: `Continuous driving for ${durationHours.toFixed(1)}h exceeds 4-hour safety rest rule`,
      severity: 'high',
      icon: 'Clock',
    });
  } else if (hasLongShift) {
    factors.push({
      id: 'duration',
      factor: 'Shift Fatigue Exposure',
      label: `Continuous Driving (${durationHours.toFixed(1)}h)`,
      points: 10,
      details: `Continuous driving for ${durationHours.toFixed(1)}h approaching fatigue threshold`,
      severity: 'medium',
      icon: 'Clock',
    });
  }

  // 5. Contextual Night Driving
  if (hasNight) {
    factors.push({
      id: 'night_driving',
      factor: 'Night Driving Context',
      label: 'Night Transit Window',
      points: 10,
      details: `Reduced peripheral illumination during circadian dip (${telemetry.timeOfDay || '22:45'})`,
      severity: 'medium',
      icon: 'CloudMoon',
    });
  }

  // 6. Harsh Braking / Dynamic G-Force Deceleration
  if (hasHarshBraking) {
    factors.push({
      id: 'harsh_braking',
      factor: 'Harsh Braking',
      label: 'Abrupt Deceleration Event',
      points: 5,
      details: 'Sudden deceleration peak (-0.52G) recorded in CAN-bus buffer',
      severity: 'medium',
      icon: 'AlertTriangle',
    });
  }

  // 7. Compound Risk Synergy Logic
  let compoundRiskDetected = false;
  let compoundMultiplier = 1.0;
  let compoundReason = '';
  let synergyBonus = 0;

  if (hasDrowsiness && hasSpeeding && hasDistraction && hasNight) {
    compoundRiskDetected = true;
    compoundMultiplier = 1.25;
    synergyBonus = 6;
    compoundReason = 'FATAL COMPOUND VECTOR: Drowsiness + High Speed + Mobile Distraction + Night Corridor';
  } else if (hasDrowsiness && hasSpeeding && (hasNight || hasDistraction || hasCriticalShift)) {
    compoundRiskDetected = true;
    compoundMultiplier = 1.2;
    synergyBonus = 5;
    compoundReason = 'CRITICAL COMPOUND: High-velocity transit coupled with acute driver drowsiness';
  } else if (hasDrowsiness && (hasSpeeding || hasDistraction)) {
    compoundRiskDetected = true;
    compoundMultiplier = 1.15;
    synergyBonus = 4;
    compoundReason = 'ELEVATED COMPOUND: Drowsiness and active inattention occurring concurrently';
  } else if (hasDistraction && hasSpeeding) {
    compoundRiskDetected = true;
    compoundMultiplier = 1.12;
    synergyBonus = 4;
    compoundReason = 'HIGH COMPOUND: Active mobile distraction while exceeding speed limits';
  }

  if (compoundRiskDetected && synergyBonus > 0) {
    factors.push({
      id: 'compound_synergy',
      factor: 'Compound Risk Synergy',
      label: 'Multi-Risk Factor Fusion',
      points: synergyBonus,
      details: compoundReason,
      severity: 'critical',
      icon: 'Zap',
    });
  }

  // Final score is the exact sum of all displayed factor points (capped cleanly between 0 and 100)
  const sumOfFactors = factors.reduce((sum, f) => sum + f.points, 0);
  const finalScore = Math.min(100, Math.max(0, sumOfFactors));

  // Risk Classification Thresholds (Deterministic & Explainable)
  // Safe: 0–39 | Moderate: 40–69 | High: 70–84 | Critical: 85–100
  const level: RiskLevel = getRiskLevelFromScore(finalScore);

  // Recommended Action & Automated Interventions (Derived from same authoritative result)
  let recommendedAction = '';
  let driverWarning: string | undefined = undefined;
  let managerAlert: string | undefined = undefined;
  let summaryExplanation = '';

  const activeFactorsList = factors.filter((f) => f.id !== 'compound_synergy').map((f) => f.factor.toLowerCase());

  if (level === 'CRITICAL') {
    recommendedAction = '🔴 Immediate proactive intervention: In-cab audio alarm, safety operations escalation, and incident log.';
    driverWarning = hasDrowsiness
      ? `CRITICAL ALERT: Severe drowsiness and high risk behavior detected at ${speed} km/h. Reduce speed immediately and take an emergency break.`
      : `CRITICAL ALERT: Immediate risk detected (${finalScore}/100). Please slow down and focus completely on the road.`;
    managerAlert = `Vehicle ${telemetry.vehicleId || 'TN38XX1234'} is at CRITICAL RISK (${finalScore}/100). Simultaneous ${activeFactorsList.join(', ')} detected. Proactive warning dispatched.`;
    summaryExplanation = `The driver risk score is at CRITICAL levels (${finalScore}/100) due to compounded danger factors: ${activeFactorsList.join(' + ')}. Exponential hazard requires proactive intervention.`;
  } else if (level === 'HIGH') {
    recommendedAction = '🟠 Driver Warning — Dispatch direct in-vehicle audio chime and recommend upcoming rest stop.';
    driverWarning = hasDrowsiness
      ? 'Drowsiness detected. Please reduce speed and consider taking a break at the next stop.'
      : hasDistraction
      ? 'Distraction alert: Please put down mobile device and maintain focus on the forward roadway.'
      : `Speed warning: Exceeding posted limit (${speed} km/h in ${speedLimit} km/h zone). Please slow down.`;
    summaryExplanation = `Driver is operating at HIGH RISK (${finalScore}/100). Detected signals include ${activeFactorsList.join(' and ')}. Immediate driver warning dispatched.`;
  } else if (level === 'MODERATE') {
    recommendedAction = '🟡 Monitor Driver — Telemetry metrics are elevated above baseline. Safety operations desk actively tracking.';
    summaryExplanation = `Driver is at MODERATE risk (${finalScore}/100). Detected factor (${activeFactorsList.join(', ')}) requires continued automated telemetry surveillance.`;
  } else {
    recommendedAction = '🟢 Normal operating parameters. Telemetry within safe compliance bounds.';
    summaryExplanation = `Driver is SAFE (${finalScore}/100). All telemetry, facial alertness indices, and driving patterns are within standard operating thresholds.`;
  }

  return {
    score: finalScore,
    level,
    factors,
    compoundRiskDetected,
    compoundMultiplier,
    compoundReason,
    recommendedAction,
    driverWarning,
    managerAlert,
    summaryExplanation,
  };
}

export function getRiskBadgeColor(level: RiskLevel): {
  bg: string;
  text: string;
  border: string;
  dot: string;
  glow: string;
} {
  switch (level) {
    case 'CRITICAL':
      return {
        bg: 'bg-rose-950/80',
        text: 'text-rose-400',
        border: 'border-rose-700/60',
        dot: 'bg-rose-500',
        glow: 'shadow-[0_0_15px_rgba(244,63,94,0.35)]',
      };
    case 'HIGH':
      return {
        bg: 'bg-amber-950/80',
        text: 'text-amber-400',
        border: 'border-amber-700/60',
        dot: 'bg-amber-500',
        glow: 'shadow-[0_0_15px_rgba(245,158,11,0.3)]',
      };
    case 'MODERATE':
      return {
        bg: 'bg-yellow-950/70',
        text: 'text-yellow-400',
        border: 'border-yellow-700/50',
        dot: 'bg-yellow-400',
        glow: 'shadow-[0_0_12px_rgba(234,179,8,0.25)]',
      };
    case 'SAFE':
    default:
      return {
        bg: 'bg-emerald-950/70',
        text: 'text-emerald-400',
        border: 'border-emerald-700/50',
        dot: 'bg-emerald-400',
        glow: 'shadow-[0_0_12px_rgba(16,185,129,0.2)]',
      };
  }
}
