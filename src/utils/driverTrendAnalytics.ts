import { SafetyEvent, RiskLevel, Driver } from '../types';

export interface DriverIncidentStats {
  driverId: string;
  driverName: string;
  totalIncidents: number;
  averageRiskScore: number;
  severityCounts: {
    SAFE: number;
    MODERATE: number;
    HIGH: number;
    CRITICAL: number;
  };
  factorCounts: { [factorName: string]: number };
  sortedFactors: Array<{ factor: string; count: number; percentage: number }>;
  mostFrequentFactor: string | null;
  trendState: 'WORSENING' | 'IMPROVING' | 'STABLE' | 'INSUFFICIENT_DATA';
  trendDeltaScore: number | null;
  trendLabel: string;
  safetyInsight: string;
  hasEnoughDataForTrend: boolean;
  chronologicalIncidents: Array<{
    id: string;
    index: number;
    timestamp: string;
    riskScore: number;
    severity: RiskLevel;
    description: string;
    factors: string[];
    actionTaken?: string;
  }>;
}

/**
 * Standardize and clean factor strings from raw Firestore data.
 * Examples:
 *   "Drowsiness (+30)" -> "Drowsiness"
 *   "Speeding (+25)" -> "Speeding"
 *   "Phone Usage (+20)" -> "Distraction"
 *   "DISTRACTION_PHONE" -> "Distraction"
 */
export function normalizeFactorName(rawFactor: string): string {
  if (!rawFactor) return 'Other Risk';
  const clean = rawFactor.replace(/\s*\(\+\d+\)\s*/g, '').trim();

  const lower = clean.toLowerCase();
  if (lower.includes('drows') || lower.includes('fatigue') || lower.includes('sleep') || lower.includes('eyelid')) {
    return 'Drowsiness';
  }
  if (lower.includes('speed') || lower.includes('velocity')) {
    return 'Speeding';
  }
  if (lower.includes('phone') || lower.includes('distract') || lower.includes('gaze') || lower.includes('inattention')) {
    return 'Distraction';
  }
  if (lower.includes('brake') || lower.includes('braking') || lower.includes('deceleration')) {
    return 'Harsh Braking';
  }
  if (lower.includes('night') || lower.includes('circadian')) {
    return 'Night Driving';
  }
  if (lower.includes('continuous') || lower.includes('shift') || lower.includes('duration') || lower.includes('long driving')) {
    return 'Extended Driving Shift';
  }
  if (lower.includes('tailgating') || lower.includes('following distance') || lower.includes('proximity')) {
    return 'Close Following Distance';
  }

  // Return formatted clean title
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/**
 * Normalizes severity string to standard 4 RiskLevel tiers: SAFE, MODERATE, HIGH, CRITICAL.
 */
export function normalizeSeverity(rawSeverity?: string): RiskLevel {
  if (!rawSeverity) return 'MODERATE';
  const s = rawSeverity.toUpperCase();
  if (s === 'CRITICAL') return 'CRITICAL';
  if (s === 'HIGH') return 'HIGH';
  if (s === 'MEDIUM' || s === 'MODERATE') return 'MODERATE';
  if (s === 'LOW' || s === 'SAFE') return 'SAFE';
  return 'MODERATE';
}

/**
 * Calculate transparent, explainable driver safety trend analytics from real Firestore incidents.
 *
 * Trend Calculation Logic (Deterministic & Documented):
 * 1. Filter incidents where `incident.driverId === driver.id`.
 * 2. If total incidents < 2, return `INSUFFICIENT_DATA` ("Insufficient historical data").
 * 3. If total incidents >= 2, split chronological incidents into:
 *    - Previous Period (first half of chronological incident history)
 *    - Recent Period (second half of chronological incident history)
 * 4. Compare the average risk score between Recent and Previous periods:
 *    - delta > +3 pts  => WORSENING (↑ Recent incidents are riskier)
 *    - delta < -3 pts  => IMPROVING (↓ Recent incidents are lower risk)
 *    - within +/-3 pts => STABLE (→ Risk levels are consistent)
 * 5. Calculate exact factor frequencies, severity counts, and average risk score.
 */
export function computeDriverSafetyTrend(
  driver: Driver,
  allIncidents: SafetyEvent[]
): DriverIncidentStats {
  // 1. Filter strictly by driver ID
  const driverIncidents = (allIncidents || []).filter(
    (inc) => inc.driverId === driver.id || inc.driverName?.toLowerCase() === driver.name.toLowerCase()
  );

  const totalIncidents = driverIncidents.length;

  // Severity counts
  const severityCounts = {
    SAFE: 0,
    MODERATE: 0,
    HIGH: 0,
    CRITICAL: 0,
  };

  // Factor frequency mapping
  const factorCounts: { [factorName: string]: number } = {};

  let totalRiskScoreSum = 0;

  // Process each incident
  const chronological = driverIncidents.map((inc, index) => {
    const score = typeof inc.riskScore === 'number' ? inc.riskScore : typeof inc.riskScoreAtTime === 'number' ? inc.riskScoreAtTime : 50;
    totalRiskScoreSum += score;

    const normSev = normalizeSeverity(inc.severity);
    severityCounts[normSev] = (severityCounts[normSev] || 0) + 1;

    // Extract factors
    const extractedFactors: string[] = [];
    if (Array.isArray(inc.factors) && inc.factors.length > 0) {
      inc.factors.forEach((f) => {
        // Skip purely operational labels like 'In-cab Alert Stream' or 'Fleet Ops Intervention' if other behavioral factors exist
        const norm = normalizeFactorName(f);
        if (norm && norm !== 'In-cab Alert Stream' && norm !== 'Fleet Ops Intervention') {
          extractedFactors.push(norm);
          factorCounts[norm] = (factorCounts[norm] || 0) + 1;
        }
      });
    }

    // Fallback to eventType if no factors extracted
    if (extractedFactors.length === 0 && inc.eventType) {
      const norm = normalizeFactorName(inc.eventType);
      extractedFactors.push(norm);
      factorCounts[norm] = (factorCounts[norm] || 0) + 1;
    }

    // If still empty, fallback to description keywords
    if (extractedFactors.length === 0 && inc.description) {
      const norm = normalizeFactorName(inc.description);
      extractedFactors.push(norm);
      factorCounts[norm] = (factorCounts[norm] || 0) + 1;
    }

    return {
      id: inc.id,
      index: index + 1,
      timestamp: inc.timestamp || 'Recorded event',
      riskScore: score,
      severity: normSev,
      description: inc.description || 'Safety incident',
      factors: extractedFactors.length > 0 ? extractedFactors : ['Unclassified variance'],
      actionTaken: inc.actionTaken,
    };
  });

  const averageRiskScore = totalIncidents > 0 ? Math.round(totalRiskScoreSum / totalIncidents) : 0;

  // Sort factors by descending frequency
  const sortedFactors = Object.entries(factorCounts)
    .map(([factor, count]) => ({
      factor,
      count,
      percentage: totalIncidents > 0 ? Math.round((count / totalIncidents) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const mostFrequentFactor = sortedFactors.length > 0 ? sortedFactors[0].factor : null;

  // Trend Evaluation
  let trendState: 'WORSENING' | 'IMPROVING' | 'STABLE' | 'INSUFFICIENT_DATA' = 'INSUFFICIENT_DATA';
  let trendDeltaScore: number | null = null;
  let trendLabel = 'Insufficient historical data';
  let safetyInsight = '';
  const hasEnoughDataForTrend = totalIncidents >= 2;

  if (totalIncidents === 0) {
    trendState = 'INSUFFICIENT_DATA';
    trendLabel = 'Insufficient historical data';
    safetyInsight = 'This driver currently has no recorded safety incidents. Historical trend analysis will become available as more real monitoring events are recorded.';
  } else if (totalIncidents === 1) {
    trendState = 'INSUFFICIENT_DATA';
    trendLabel = 'Insufficient historical data';
    safetyInsight = `Only 1 recorded safety incident (${mostFrequentFactor || 'Event'}). Not enough recorded incidents to determine a reliable trend.`;
  } else {
    // Chronological period split: older half vs newer half
    const midpoint = Math.floor(totalIncidents / 2);
    const olderHalf = chronological.slice(0, midpoint);
    const newerHalf = chronological.slice(midpoint);

    const avgOlder = olderHalf.reduce((acc, cur) => acc + cur.riskScore, 0) / olderHalf.length;
    const avgNewer = newerHalf.reduce((acc, cur) => acc + cur.riskScore, 0) / newerHalf.length;
    const delta = Math.round(avgNewer - avgOlder);
    trendDeltaScore = delta;

    if (delta > 3) {
      trendState = 'WORSENING';
      trendLabel = `↑ Worsening (+${delta} avg risk)`;
      safetyInsight = `${mostFrequentFactor || 'Safety variance'} is the driver's most frequent recorded risk factor. Recent incidents indicate increased risk (+${delta} avg risk) compared with the previous period. Corrective coaching is recommended.`;
    } else if (delta < -3) {
      trendState = 'IMPROVING';
      trendLabel = `↓ Improving (${delta} avg risk)`;
      safetyInsight = `${mostFrequentFactor || 'Safety variance'} is the driver's most frequent recorded risk factor. Recent incidents indicate reduced risk (${delta} avg risk) compared with the previous period, showing positive driving adjustments.`;
    } else {
      trendState = 'STABLE';
      trendLabel = '→ Stable';
      safetyInsight = `${mostFrequentFactor || 'Safety variance'} is the driver's most frequent recorded risk factor. Risk levels have remained consistent across recorded periods.`;
    }
  }

  return {
    driverId: driver.id,
    driverName: driver.name,
    totalIncidents,
    averageRiskScore,
    severityCounts,
    factorCounts,
    sortedFactors,
    mostFrequentFactor,
    trendState,
    trendDeltaScore,
    trendLabel,
    safetyInsight,
    hasEnoughDataForTrend,
    chronologicalIncidents: chronological,
  };
}
