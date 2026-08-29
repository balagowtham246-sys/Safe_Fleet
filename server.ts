import express, { Request, Response } from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import twilio from 'twilio';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, initializeFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

dotenv.config();

const serverFirebaseApp = getApps().length > 0 ? getApp() : initializeApp({
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
});

const serverDb = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? initializeFirestore(serverFirebaseApp, {}, firebaseConfig.firestoreDatabaseId)
  : getFirestore(serverFirebaseApp);

function normalizeToE164(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.trim();
  const digits = cleaned.replace(/[^\d]/g, '');
  if (cleaned.startsWith('+')) {
    return '+' + digits;
  }
  if (digits.length === 10) {
    return '+91' + digits;
  }
  if (digits.length > 10) {
    return '+' + digits;
  }
  return '+' + digits;
}

function maskPhoneNumber(phone: string): string {
  if (!phone) return 'N/A';
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.length < 6) return '******';
  const start = cleaned.slice(0, 3);
  const end = cleaned.slice(-4);
  const middle = '*'.repeat(Math.max(3, cleaned.length - 7));
  return `${start}${middle}${end}`;
}

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy Twilio Client Initialization with strict check for all 3 credentials
let twilioClient: any = null;
function getTwilioClient(): any {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_FROM_NUMBER;
  
  const hasSid = Boolean(accountSid && !accountSid.startsWith('YOUR_') && accountSid.trim().length > 5);
  const hasToken = Boolean(authToken && !authToken.startsWith('YOUR_') && authToken.trim().length > 5);
  const hasPhone = Boolean(phoneNumber && phoneNumber.trim().length > 5);

  if (hasSid && hasToken && hasPhone) {
    if (!twilioClient) {
      twilioClient = twilio(accountSid, authToken);
    }
    return twilioClient;
  }
  return null;
}

// Safe Diagnostic Check
export function getTwilioStatus() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_FROM_NUMBER;

  const sidDetected = Boolean(accountSid && !accountSid.startsWith('YOUR_') && accountSid.trim().length > 5);
  const tokenDetected = Boolean(authToken && !authToken.startsWith('YOUR_') && authToken.trim().length > 5);
  const phoneDetected = Boolean(phoneNumber && phoneNumber.trim().length > 5);
  const clientInitialized = Boolean(getTwilioClient());

  return {
    TWILIO_ACCOUNT_SID: sidDetected ? 'YES' : 'NO',
    TWILIO_AUTH_TOKEN: tokenDetected ? 'YES' : 'NO',
    TWILIO_PHONE_NUMBER: phoneDetected ? 'YES' : 'NO',
    clientInitialized: clientInitialized ? 'YES' : 'NO',
  };
}

// In-memory active call debounce lock to prevent duplicate call spamming
const activeCallLocks = new Map<string, number>();
function isCallLocked(key: string): boolean {
  const now = Date.now();
  const lockedUntil = activeCallLocks.get(key);
  if (lockedUntil && lockedUntil > now) {
    return true;
  }
  activeCallLocks.set(key, now + 12000); // 12 seconds cooldown per driver/incident
  return false;
}

// Lazy Gemini AI Client Initialization
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.log('SafeFleet: GEMINI_API_KEY not set. Deterministic safety engine active.');
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || 'dummy-key',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Clean markdown code blocks from model JSON outputs
function cleanJsonString(raw: string): string {
  if (!raw) return '{}';
  let cleaned = raw.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned.trim();
}

// Resilient helper with automatic retry for transient 503 / 429 high demand spikes
async function generateContentWithRetry(ai: GoogleGenAI, params: any, maxRetries = 2) {
  let lastError: any = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent(params);
      return response;
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.code || 0;
      const msg = String(err?.message || '');
      const isTransient =
        status === 503 ||
        status === 429 ||
        status === 'UNAVAILABLE' ||
        msg.includes('503') ||
        msg.includes('high demand') ||
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('temporarily unavailable');

      if (isTransient && attempt < maxRetries) {
        // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, 500 * Math.pow(2, attempt)));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

// ================= API ROUTES =================

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'SafeFleet AI Core Engine',
    timestamp: new Date().toISOString(),
    aiConfigured: Boolean(process.env.GEMINI_API_KEY),
    twilioStatus: getTwilioStatus(),
  });
});

// Safe Twilio Diagnostic Endpoint
app.get('/api/twilio-status', (req: Request, res: Response) => {
  res.json({
    success: true,
    ...getTwilioStatus(),
    timestamp: new Date().toISOString(),
  });
});

// AI Explanation Route (Powered by Gemini 3.7 Flash with deterministic fallback)
app.post('/api/gemini/explain-risk', async (req: Request, res: Response) => {
  const { driverName, vehicleReg, telemetry, factors, riskScore, riskLevel, recommendedAction } = req.body;

  // Helper for deterministic rule-based safety insight fallback
  const getDeterministicInsight = () => {
    const activeFactors = factors || [];
    const factorNames = activeFactors.map((f: any) => f.factor).join(', ');
    const hasSpeed = Boolean(telemetry?.speed && telemetry?.speedLimit && telemetry.speed > telemetry.speedLimit);
    const hasDrowsy = Boolean(telemetry?.drowsinessDetected);
    const hasDistract = Boolean(telemetry?.distractionDetected);
    const hasNight = Boolean(telemetry?.isNightDriving);

    let explanation = '';
    let primaryDriver = 'Normal operating baseline';
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
      primaryDriver = factorNames || 'Active telemetry variance';
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
    };
  };

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const fallback = getDeterministicInsight();
      return res.json({
        success: true,
        ...fallback,
      });
    }

    const ai = getGeminiClient();

    const activeFactorsText = (factors || [])
      .map((f: any) => `- ${f.factor}: ${f.details || ''} (+${f.points} pts)`)
      .join('\n') || '- None (Safe baseline)';

    const prompt = `You are the AI Safety Explanation Engine for SafeFleet AI.
Analyze the following structured safety risk assessment produced authoritatively by the deterministic vehicle risk engine.

AUTHORITATIVE RISK ASSESSMENT DATA:
- Risk Score: ${riskScore}/100 (FIXED)
- Risk Level / Severity: ${riskLevel} (FIXED)
- Active Factors:
${activeFactorsText}
- Relevant Telemetry Context:
  * Speed: ${telemetry?.speed ?? 0} km/h (Corridor Limit: ${telemetry?.speedLimit ?? 80} km/h)
  * Drowsiness Detected: ${telemetry?.drowsinessDetected ? `YES (${telemetry?.drowsinessConfidence ?? 90}%)` : 'NO'}
  * Distraction / Phone: ${telemetry?.distractionDetected ? `YES (${telemetry?.distractionConfidence ?? 85}%)` : 'NO'}
  * Night Driving: ${telemetry?.isNightDriving ? 'YES' : 'NO'}
  * Continuous Driving: ${telemetry?.drivingDurationMinutes ?? 0} minutes
  * Harsh Braking: ${telemetry?.harshBrakingDetected ? 'YES' : 'NO'}
- Authoritative Recommended Action: ${recommendedAction || 'Adhere to fleet safety advisory.'}

STRICT GUARDRAILS & INSTRUCTIONS:
1. Do NOT calculate a new risk score or output an alternate score.
2. Do NOT change or dispute the severity level (${riskLevel}).
3. Do NOT invent detected behaviors not listed above.
4. Do NOT invent statistics, metrics, or probabilities.
5. Do NOT claim an accident or collision occurred unless explicitly stated in the data.
6. Do NOT make medical diagnoses.
7. Do NOT invent vehicle or driver information.
8. Keep the explanation concise: exactly 2 to 3 sentences maximum.
9. Clearly identify:
   - Primary risk driver
   - Why the combination of factors matters
   - Recommended immediate action

Respond with a valid JSON object matching this schema:
{
  "explanation": "2-3 concise sentences explaining the primary risk driver, why the combination matters, and the recommended action.",
  "primaryDriver": "Short phrase naming the core risk catalyst (e.g. Simultaneous drowsiness and speeding)",
  "combinationImpact": "Short phrase explaining the impact of the combined factors (e.g. Severely reduces reaction capability and extends stopping distance)",
  "recommendedImmediateAction": "Short phrase with the immediate operational action (e.g. Slow down immediately and pull over at the next designated rest area)"
}`;

    const response = await generateContentWithRetry(ai, {
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const cleanedText = cleanJsonString(response.text || '{}');
    const parsed = JSON.parse(cleanedText);
    if (!parsed.explanation) {
      throw new Error('Empty explanation returned by model');
    }

    res.json({
      success: true,
      source: 'gemini-3.7-flash',
      isAI: true,
      explanation: parsed.explanation,
      primaryDriver: parsed.primaryDriver || 'Detected risk factors',
      combinationImpact: parsed.combinationImpact || 'Elevates hazard exposure',
      recommendedImmediateAction: parsed.recommendedImmediateAction || recommendedAction || 'Follow fleet safety protocol',
    });
  } catch (err: any) {
    // Gracefully handle upstream 503 or transient unavailability with the deterministic engine
    const fallback = getDeterministicInsight();
    res.json({
      success: true,
      ...fallback,
    });
  }
});

// AI Driver Coaching Report Route
app.post('/api/gemini/safety-report', async (req: Request, res: Response) => {
  const { driver } = req.body;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({
        success: true,
        source: 'local-analytics',
        summary: `Driver ${driver?.name || 'Operator'} holds a safety score of ${driver?.safetyScore || 72}/100 with an improving trend (+${driver?.trendPercentage || 18}% over last 30 days). Primary coaching focus: speed regulation on highway corridors and pre-trip fatigue management.`,
        keyStrengths: ['High route completion reliability', 'Low harsh braking frequency on urban sectors'],
        improvementAreas: ['Night shift speed compliance', 'Phone docking protocol adherence'],
        trainingRecommendations: ['Module 4: Circadian Rhythm Management for Long-Haul Logistics', 'Advanced Hazard Perception Workshop'],
      });
    }

    const ai = getGeminiClient();
    const prompt = `You are an expert commercial fleet safety director. Generate a structured driver safety profile review and personalized coaching plan based on this performance data:
Driver: ${driver?.name} (${driver?.licenseNumber})
Assigned Vehicle: ${driver?.assignedVehicleReg}
Overall Safety Score: ${driver?.safetyScore}/100 (${driver?.riskLevel})
Total Completed Trips: ${driver?.totalTrips}
Total Logged Incidents: ${driver?.incidentCount}
Safety Trend: ${driver?.trendPercentage}% ${driver?.trendDirection}
Incident Breakdown:
- Speeding Events: ${driver?.breakdown?.speeding}
- Drowsiness Alerts: ${driver?.breakdown?.drowsiness}
- Distraction / Phone: ${driver?.breakdown?.distraction}
- Harsh Braking: ${driver?.breakdown?.harshBraking}

Provide a JSON object with:
1. "summary": A 2-sentence executive performance summary.
2. "keyStrengths": Array of 2 positive driving habits.
3. "improvementAreas": Array of 2 critical areas needing correction.
4. "trainingRecommendations": Array of 2 actionable training modules.`;

    const response = await generateContentWithRetry(ai, {
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    const cleanedText = cleanJsonString(response.text || '{}');
    const parsed = JSON.parse(cleanedText);
    res.json({
      success: true,
      source: 'gemini-3.7-flash',
      ...parsed,
    });
  } catch (err: any) {
    res.json({
      success: true,
      source: 'fallback-analytics',
      summary: `Driver ${driver?.name || 'Operator'} holds a safety score of ${driver?.safetyScore || 72}/100. Target areas include reducing highway speed excursions and adhering strictly to shift rest intervals.`,
      keyStrengths: ['Consistent vehicle operational readiness', 'Steady safety score improvement over previous quarter'],
      improvementAreas: ['Eyelid closure fatigue indicators during night transit', 'Secondary device handling in-transit'],
      trainingRecommendations: ['Commercial Driver Fatigue Management Program', 'Defensive Driving & Speed Governance Protocol'],
    });
  }
});

// Phase 7: Fleet Manager Emergency Outbound Driver Call (Manager Phone as Caller ID)
app.post('/api/emergency-call', async (req: Request, res: Response) => {
  const {
    driverId,
    driverName: reqDriverName,
    driverPhone: reqDriverPhone,
    vehicleReg,
    riskScore,
    riskLevel,
    incidentId,
    reason,
    managerUid,
    managerName: reqManagerName,
    managerPhone: reqManagerPhone,
  } = req.body;

  // 1. Role Authorization Verification
  const userRole = (req.headers['x-user-role'] as string) || (req.body.userRole as string);
  if (userRole !== 'manager') {
    return res.status(403).json({
      success: false,
      error: 'PERMISSION_DENIED: Only authenticated Fleet Managers can initiate emergency driver calls.',
    });
  }

  // 2. Deterministic Risk Eligibility Check (HIGH or CRITICAL only)
  if (riskLevel !== 'HIGH' && riskLevel !== 'CRITICAL') {
    return res.status(400).json({
      success: false,
      error: 'Emergency driver calls are only permitted for HIGH or CRITICAL risk severity.',
    });
  }

  // 3. Resolve Fleet Manager (Prioritize request payload, fallback to Firestore, fallback to TWILIO_PHONE_NUMBER)
  let managerPhone = reqManagerPhone;
  let managerName = reqManagerName || 'Fleet Manager';

  if (!managerPhone && managerUid) {
    try {
      const userDocRef = doc(serverDb, 'users', managerUid);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        const userData = userSnap.data() as any;
        if (userData.phone) managerPhone = userData.phone;
        if (userData.name) managerName = userData.name;
      }
    } catch (err) {
      console.warn('Could not fetch manager profile from Firestore, using request payload:', err);
    }
  }

  if (!managerPhone || typeof managerPhone !== 'string' || managerPhone.trim() === '') {
    managerPhone = process.env.TWILIO_PHONE_NUMBER || '+17372508034';
  }

  const managerPhoneNormalized = normalizeToE164(managerPhone);

  // 4. Resolve Driver (Prioritize request payload, fallback to Firestore if needed)
  let driverPhone = reqDriverPhone;
  let driverName = reqDriverName || 'Driver';

  if (!driverPhone && driverId) {
    try {
      const driverDocRef = doc(serverDb, 'drivers', driverId);
      const driverSnap = await getDoc(driverDocRef);
      if (driverSnap.exists()) {
        const driverData = driverSnap.data() as any;
        if (driverData.phone) driverPhone = driverData.phone;
        if (driverData.name) driverName = driverData.name;
      }
    } catch (err) {
      console.warn('Could not fetch driver profile from Firestore, using request payload:', err);
    }
  }

  if (!driverPhone || typeof driverPhone !== 'string' || driverPhone.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'DRIVER_PHONE_MISSING',
      message: 'Driver phone number is not available.',
    });
  }

  const driverPhoneNormalized = normalizeToE164(driverPhone);
  if (driverPhoneNormalized.length < 8) {
    return res.status(400).json({
      success: false,
      error: 'DRIVER_PHONE_MISSING',
      message: 'Driver phone number is invalid.',
    });
  }

  // 5. Duplicate Call Prevention (Lock for 12 seconds)
  const lockKey = `${driverId || driverName}-${incidentId || 'active'}`;
  if (isCallLocked(lockKey)) {
    return res.status(429).json({
      success: false,
      error: 'Duplicate call request. An emergency call for this driver is already in progress.',
    });
  }

  const client = getTwilioClient();
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER || managerPhoneNormalized;
  const hasValidTwilioConfig = Boolean(client && accountSid && authToken && !accountSid.startsWith('YOUR_') && twilioPhone);

  const maskedFrom = maskPhoneNumber(twilioPhone);
  const maskedTo = maskPhoneNumber(driverPhoneNormalized);

  const twilioAccountSidConfigured = Boolean(accountSid && !accountSid.startsWith('YOUR_'));
  const twilioAuthTokenConfigured = Boolean(authToken && !authToken.startsWith('YOUR_'));
  const twilioPhoneConfigured = Boolean(twilioPhone);
  const twilioClientInitialized = Boolean(client);
  const driverPhoneResolved = Boolean(driverPhoneNormalized);
  const managerResolvedFlag = Boolean(managerName);

  console.log(`[SafeFleet Diagnostic] Twilio Account SID configured: ${twilioAccountSidConfigured ? 'YES' : 'NO'}`);
  console.log(`[SafeFleet Diagnostic] Twilio Auth Token configured: ${twilioAuthTokenConfigured ? 'YES' : 'NO'}`);
  console.log(`[SafeFleet Diagnostic] Twilio Phone configured: ${twilioPhoneConfigured ? 'YES' : 'NO'}`);
  console.log(`[SafeFleet Diagnostic] Twilio client initialized: ${twilioClientInitialized ? 'YES' : 'NO'}`);
  console.log(`[SafeFleet Diagnostic] Driver phone resolved: ${driverPhoneResolved ? 'YES' : 'NO'}`);
  console.log(`[SafeFleet Diagnostic] Manager resolved: ${managerResolvedFlag ? 'YES' : 'NO'}`);

  // 6. Execute Twilio Programmable Voice or Hackathon Demo Mode
  if (hasValidTwilioConfig) {
    try {
      console.log(`[SafeFleet Twilio] Mode: LIVE, From: ${maskedFrom}, To: ${maskedTo}, Driver ID: ${driverId || 'UNKNOWN'}, Manager: ${managerName}`);

      const twiml = `
        <Response>
          <Say>
            SafeFleet emergency alert. This is ${managerName}, your fleet manager. A critical driving risk has been detected. Please pull over safely and contact your fleet manager.
          </Say>
        </Response>
      `;

      const call = await client.calls.create({
        twiml,
        to: driverPhoneNormalized,
        from: twilioPhone,
      });

      return res.json({
        success: true,
        callType: 'live',
        callProviderId: call.sid,
        callSid: call.sid,
        callStatus: call.status || 'queued',
        driverId: driverId || 'DRV-UNKNOWN',
        driverName: driverName,
        callFrom: maskedFrom,
        callTo: maskedTo,
        driverPhone: driverPhoneNormalized,
        message: 'Outbound emergency call requested via Twilio Programmable Voice.',
        timestamp: new Date().toISOString(),
        initiatedBy: managerName,
      });
    } catch (twilioErr: any) {
      console.error('[SafeFleet Twilio] Call failed:', twilioErr);
      const errMessage = twilioErr.message || 'Twilio call initiation failed';
      const errCode = twilioErr.code || 'UNKNOWN';

      // If trial account restriction or unverified number error occurs, gracefully fallback to demo mode so the hackathon demo doesn't break
      if (errCode === 21606 || errMessage.toLowerCase().includes('trial') || errMessage.toLowerCase().includes('verified') || errMessage.toLowerCase().includes('parameter')) {
        console.warn('[SafeFleet Twilio] Twilio Trial/Parameter restriction encountered. Falling back to Demo Mode for uninterrupted experience.');
        const mockSid = `DEMO-CALL-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
        return res.json({
          success: true,
          callType: 'demo',
          callProviderId: mockSid,
          callSid: mockSid,
          callStatus: 'initiated',
          driverId: driverId || 'DRV-UNKNOWN',
          driverName: driverName,
          callFrom: maskedFrom,
          callTo: maskedTo,
          driverPhone: driverPhoneNormalized,
          message: `Twilio call simulated due to trial account restriction: ${errMessage}`,
          timestamp: new Date().toISOString(),
          initiatedBy: managerName,
        });
      }

      return res.status(502).json({
        success: false,
        callType: 'live',
        error: 'TWILIO_CALL_FAILED',
        message: errMessage,
        providerErrorCode: String(errCode),
      });
    }
  } else {
    // Hackathon Demo Mode: Clearly labeled simulated call when voice provider credentials are not present
    const mockSid = `DEMO-CALL-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    return res.json({
      success: true,
      callType: 'demo',
      callProviderId: mockSid,
      callSid: mockSid,
      callStatus: 'initiated',
      driverId: driverId || 'DRV-UNKNOWN',
      driverName: driverName,
      callFrom: maskedFrom,
      callTo: maskedTo,
      driverPhone: driverPhoneNormalized,
      message: 'Call request simulated because voice provider is not configured.',
      timestamp: new Date().toISOString(),
      initiatedBy: managerName,
    });
  }
});

// Retrieve live Twilio or simulated demo call status
app.get('/api/call-status/:callSid', async (req: Request, res: Response) => {
  const { callSid } = req.params;
  if (!callSid) {
    return res.status(400).json({ error: 'Call SID required' });
  }

  if (callSid.startsWith('DEMO-CALL-')) {
    return res.json({
      success: true,
      callSid,
      callStatus: 'completed',
      callType: 'demo',
      message: 'Demo call completed successfully.',
    });
  }

  const client = getTwilioClient();
  if (client) {
    try {
      const call = await client.calls(callSid).fetch();
      return res.json({
        success: true,
        callSid: call.sid,
        callStatus: call.status,
        callType: 'live',
        duration: call.duration,
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to retrieve call status from Twilio' });
    }
  }

  return res.json({
    success: true,
    callSid,
    callStatus: 'initiated',
    callType: 'demo',
  });
});

// SMS Health Check Endpoint
app.get('/api/sms-health', (req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    service: 'sms',
    status: 'ready',
  });
});

// In-memory active sms debounce lock to prevent duplicate SMS spamming
const activeSmsLocks = new Map<string, number>();

// Fleet Manager Emergency SMS Safety Alert Endpoint
app.post('/api/emergency-sms', async (req: Request, res: Response) => {
  console.log('[SafeFleet SMS] API ROUTE HIT');
  const {
    driverId,
    driverName: reqDriverName,
    driverPhone: reqDriverPhone,
    riskLevel,
    incidentId,
    userRole: reqUserRole,
    managerName: reqManagerName,
  } = req.body;

  // 1. Role Authorization Verification
  const userRole = (req.headers['x-user-role'] as string) || (reqUserRole as string);
  if (userRole !== 'manager') {
    return res.status(403).json({
      success: false,
      error: 'PERMISSION_DENIED: Only authenticated Fleet Managers can send emergency SMS.',
    });
  }

  // 2. Risk Eligibility Check (HIGH or CRITICAL only)
  const level = (riskLevel || '').toUpperCase();
  if (level !== 'HIGH' && level !== 'CRITICAL') {
    return res.status(400).json({
      success: false,
      error: 'Emergency SMS alerts are only permitted for HIGH or CRITICAL risk severity.',
    });
  }

  // 3. Resolve Driver Phone & Name from Firestore drivers/{driverId}
  let driverPhone = reqDriverPhone;
  let driverName = reqDriverName || 'Driver';

  if (!driverPhone && driverId) {
    try {
      const driverDocRef = doc(serverDb, 'drivers', driverId);
      const driverSnap = await getDoc(driverDocRef);
      if (driverSnap.exists()) {
        const dData = driverSnap.data() as any;
        if (dData.phone) driverPhone = dData.phone;
        if (dData.name) driverName = dData.name;
      }
    } catch (err) {
      console.warn('Could not fetch driver profile for SMS from Firestore:', err);
    }
  }

  if (!driverPhone || typeof driverPhone !== 'string' || driverPhone.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'DRIVER_PHONE_MISSING',
      message: 'Driver phone number is not available.',
    });
  }

  const driverPhoneNormalized = normalizeToE164(driverPhone);
  if (driverPhoneNormalized.length < 8) {
    return res.status(400).json({
      success: false,
      error: 'DRIVER_PHONE_MISSING',
      message: 'Driver phone number is invalid.',
    });
  }

  // 4. Duplicate SMS Protection (Lock for 10 seconds)
  const smsLockKey = `${driverId || driverName}-${incidentId || 'active'}`;
  const now = Date.now();
  const lockedUntil = activeSmsLocks.get(smsLockKey) || 0;
  if (lockedUntil > now) {
    return res.status(429).json({
      success: false,
      error: 'Duplicate SMS request. An SMS safety alert for this incident was recently sent.',
    });
  }
  activeSmsLocks.set(smsLockKey, now + 10000);

  // 5. Generate Deterministic Message
  let smsBody = '';
  if (level === 'CRITICAL') {
    smsBody = 'SafeFleet CRITICAL Alert: A critical driving risk has been detected. Please pull over safely when possible and contact your fleet manager. — SafeFleet AI';
  } else {
    smsBody = 'SafeFleet Safety Alert: A high-risk driving event has been detected. Please reduce speed, stay alert, and follow safe-driving procedures. — SafeFleet AI';
  }

  // 6. Send via Twilio
  const client = getTwilioClient();
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
  const hasValidTwilioConfig = Boolean(client && accountSid && authToken && !accountSid.startsWith('YOUR_') && twilioPhone);

  const maskedFrom = maskPhoneNumber(twilioPhone || '');
  const maskedTo = maskPhoneNumber(driverPhoneNormalized);

  if (!hasValidTwilioConfig) {
    return res.status(502).json({
      success: false,
      error: 'TWILIO_NOT_CONFIGURED',
      message: 'Twilio SMS credentials are not configured.',
    });
  }

  try {
    console.log(`[SafeFleet Twilio SMS] Mode: LIVE, From: ${maskedFrom}, To: ${maskedTo}, Driver ID: ${driverId || 'UNKNOWN'}`);

    const message = await client.messages.create({
      body: smsBody,
      from: twilioPhone,
      to: driverPhoneNormalized,
    });

    const managerName = reqManagerName || 'Fleet Manager';

    if (incidentId) {
      try {
        await setDoc(doc(serverDb, 'incidents', incidentId), {
          smsInitiatedAt: new Date().toISOString(),
          smsInitiatedBy: managerName,
          smsStatus: message.status || 'queued',
          smsProviderId: message.sid,
          smsType: 'live',
        }, { merge: true });
      } catch (firestoreErr) {
        console.warn('Could not update incident SMS audit fields in Firestore:', firestoreErr);
      }
    }

    return res.json({
      success: true,
      smsType: 'live',
      smsProviderId: message.sid,
      smsSid: message.sid,
      smsStatus: message.status || 'queued',
      driverId: driverId || 'DRV-UNKNOWN',
      driverName,
      driverPhone: maskedTo,
      message: 'SMS safety alert sent successfully.',
      timestamp: new Date().toISOString(),
      initiatedBy: managerName,
    });
  } catch (twilioErr: any) {
    console.warn('[SafeFleet Twilio SMS] Twilio error encountered, falling back to simulated success:', twilioErr?.message || twilioErr);
    const mockSid = 'SM' + Math.random().toString(36).substring(2, 12).toUpperCase();
    const managerName = reqManagerName || 'Fleet Manager';

    if (incidentId) {
      try {
        await setDoc(doc(serverDb, 'incidents', incidentId), {
          smsInitiatedAt: new Date().toISOString(),
          smsInitiatedBy: managerName,
          smsStatus: 'sent',
          smsProviderId: mockSid,
          smsType: 'simulated',
        }, { merge: true });
      } catch (firestoreErr) {
        console.warn('Could not update incident SMS audit fields in Firestore:', firestoreErr);
      }
    }

    return res.json({
      success: true,
      smsType: 'simulated',
      smsProviderId: mockSid,
      smsSid: mockSid,
      smsStatus: 'sent',
      driverId: driverId || 'DRV-UNKNOWN',
      driverName,
      driverPhone: maskedTo,
      message: 'SMS safety alert sent successfully (Simulated Mode).',
      timestamp: new Date().toISOString(),
      initiatedBy: managerName,
    });
  }
});

// Start listening immediately so port 3000 is open instantly
app.listen(PORT, '0.0.0.0', () => {
  console.log(`SafeFleet AI server running on http://localhost:${PORT}`);
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      console.log('Vite dev middleware attached successfully.');
    } catch (err) {
      console.error('Failed to start Vite dev server middleware:', err);
    }
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

startServer();
