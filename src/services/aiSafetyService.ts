import { RiskEngineResult, RiskFactorItem, RiskLevel, TelemetryState } from '../types';

export interface AISafetyExplanation {
  explanation: string;
  primaryDriver?: string;
  combinationImpact?: string;
  recommendedImmediateAction?: string;
  source: 'gemini-3.7-flash' | 'deterministic-fallback';
  isAI: boolean;
  timestamp: string;
  riskScore: number;
  riskLevel: RiskLevel;
}

export interface ExplainRiskRequestParams {
  driverName?: string;
  vehicleReg?: string;
  telemetry: TelemetryState;
  factors: RiskFactorItem[];
  riskScore: number;
  riskLevel: RiskLevel;
  recommendedAction?: string;
  incidentId?: string;
  forceRefresh?: boolean;
}

// In-memory runtime cache for explanation results
const memoryCache = new Map<string, AISafetyExplanation>();
const inFlightRequests = new Map<string, Promise<AISafetyExplanation>>();

/**
 * Generate a cache key based on the incident ID or the structured factor signature
 */
export function getExplanationCacheKey(params: ExplainRiskRequestParams): string {
  if (params.incidentId) {
    return `incident_${params.incidentId}`;
  }
  const factorIds = (params.factors || []).map((f) => f.id).sort().join('-');
  const bucketScore = Math.floor(params.riskScore / 5) * 5;
  return `state_${params.riskLevel}_${bucketScore}_${factorIds}`;
}

/**
 * Generate a local immediate deterministic insight when offline or falling back
 */
export function generateLocalFallbackInsight(params: ExplainRiskRequestParams): AISafetyExplanation {
  const { telemetry, factors, riskScore, riskLevel, recommendedAction } = params;
  const activeFactors = factors || [];
  const hasSpeed = Boolean(telemetry?.speed && telemetry?.speedLimit && telemetry.speed > telemetry.speedLimit);
  const hasDrowsy = Boolean(telemetry?.drowsinessDetected);
  const hasDistract = Boolean(telemetry?.distractionDetected);
  const hasNight = Boolean(telemetry?.isNightDriving);

  let explanation = '';
  let primaryDriver = 'Normal operational baseline';
  let combinationImpact = 'Driving parameters are compliant with fleet safety corridors';
  let recAction = recommendedAction || 'Continue routine safe driving operations.';

  if (riskLevel === 'CRITICAL' || activeFactors.length >= 3) {
    primaryDriver = `${hasDrowsy ? 'Drowsiness' : 'Fatigue'} combined with ${hasSpeed ? 'speeding' : 'velocity anomalies'}${hasNight ? ' and night driving' : ''}`;
    combinationImpact = 'Simultaneous physiological impairment and elevated kinetic speed drastically degrade stopping reaction capability';
    recAction = recommendedAction || 'Disengage throttle immediately, alert operations center, and pull over at the nearest rest stop.';
    explanation = `Critical risk is primarily driven by ${primaryDriver.toLowerCase()}. This high-severity combination severely delays driver reaction time and increases stopping distance. Immediate in-cab warning and dispatcher intervention are recommended.`;
  } else if (hasDrowsy) {
    primaryDriver = 'Driver eyelid closure and microsleep indicators';
    combinationImpact = 'Drowsiness causes involuntary lapses in forward lane tracking and obstacle detection';
    recAction = recommendedAction || 'Issue in-cab audio buzzer and schedule mandatory 15-minute rest pause.';
    explanation = `Elevated risk is driven by detected driver drowsiness and fatigue indicators. Involuntary micro-sleep episodes reduce attentiveness to road hazards, so the driver should slow down and take an immediate rest break.`;
  } else if (hasDistract) {
    primaryDriver = 'Secondary mobile device handling and gaze diversion';
    combinationImpact = 'Gaze off-road prevents timely perception of sudden brake events or pedestrians';
    recAction = recommendedAction || 'Issue driver heads-up alert to dock mobile device immediately.';
    explanation = `Elevated risk is driven by secondary device interaction and driver visual inattention. Diverted gaze delays obstacle perception, so the driver should immediately stow the device and refocus on the forward road.`;
  } else if (hasSpeed) {
    const excess = (telemetry?.speed || 0) - (telemetry?.speedLimit || 80);
    primaryDriver = `Excessive corridor speed (+${excess} km/h over limit)`;
    combinationImpact = 'Increased kinetic momentum extends braking distances on commercial freight corridors';
    recAction = recommendedAction || 'Decelerate to posted corridor limit.';
    explanation = `Elevated risk is driven by vehicle speed exceeding the corridor limit by ${excess} km/h. Higher velocities exponentially increase required braking distance, so the driver should decelerate to within the posted limit.`;
  } else if (riskLevel === 'SAFE') {
    primaryDriver = 'All telemetry signals within safe thresholds';
    combinationImpact = 'Zero active hazard flags detected across vision and CAN-bus telemetry';
    recAction = 'Maintain standard defensive driving practices.';
    explanation = `Vehicle and driver are operating safely within posted corridor limits and normal alertness metrics. No hazardous anomalies detected; continue standard defensive driving.`;
  } else {
    primaryDriver = (activeFactors.map((f) => f.factor).join(', ')) || 'Active telemetry variance';
    combinationImpact = 'Cumulative moderate risk indicators require active operator awareness';
    recAction = recommendedAction || 'Maintain safe following distance and monitor cabin alerts.';
    explanation = `Moderate risk is driven by ${primaryDriver.toLowerCase()}. The current conditions require increased caution, and the driver should adhere to recommended speed buffers and alert guidelines.`;
  }

  return {
    explanation,
    primaryDriver,
    combinationImpact,
    recommendedImmediateAction: recAction,
    source: 'deterministic-fallback',
    isAI: false,
    timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    riskScore,
    riskLevel,
  };
}

/**
 * Fetch an AI safety explanation from the server-side Gemini API with robust caching and fallbacks
 */
export async function fetchAISafetyExplanation(
  params: ExplainRiskRequestParams
): Promise<AISafetyExplanation> {
  const cacheKey = getExplanationCacheKey(params);

  // 1. Check in-memory cache unless forced
  if (!params.forceRefresh && memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!;
  }

  // 2. Check sessionStorage cache
  if (!params.forceRefresh && typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const stored = window.sessionStorage.getItem(`safefleet_insight_${cacheKey}`);
      if (stored) {
        const parsed = JSON.parse(stored) as AISafetyExplanation;
        memoryCache.set(cacheKey, parsed);
        return parsed;
      }
    } catch {
      // Ignore sessionStorage read errors
    }
  }

  // 3. Deduplicate in-flight requests for the same key
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)!;
  }

  const requestPromise = (async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6500);

      const response = await fetch('/api/gemini/explain-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          driverName: params.driverName,
          vehicleReg: params.vehicleReg,
          telemetry: params.telemetry,
          factors: params.factors,
          riskScore: params.riskScore,
          riskLevel: params.riskLevel,
          recommendedAction: params.recommendedAction,
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();

      const result: AISafetyExplanation = {
        explanation: data.explanation || generateLocalFallbackInsight(params).explanation,
        primaryDriver: data.primaryDriver || 'Identified active risk factors',
        combinationImpact: data.combinationImpact || 'Elevates hazard exposure during transit',
        recommendedImmediateAction: data.recommendedImmediateAction || params.recommendedAction || 'Follow fleet safety protocol',
        source: data.source === 'gemini-3.7-flash' ? 'gemini-3.7-flash' : 'deterministic-fallback',
        isAI: Boolean(data.isAI),
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        riskScore: params.riskScore,
        riskLevel: params.riskLevel,
      };

      // Save to memory cache
      memoryCache.set(cacheKey, result);

      // Save to session storage
      if (typeof window !== 'undefined' && window.sessionStorage) {
        try {
          window.sessionStorage.setItem(`safefleet_insight_${cacheKey}`, JSON.stringify(result));
        } catch {
          // Ignore session storage quota issues
        }
      }

      return result;
    } catch (err) {
      console.warn('AI Safety service fallback engaged:', err);
      const fallback = generateLocalFallbackInsight(params);
      memoryCache.set(cacheKey, fallback);
      return fallback;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, requestPromise);
  return requestPromise;
}
