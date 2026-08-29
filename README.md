# SafeFleet AI

**AI-Powered Predictive Driver Safety & Fleet Risk Intelligence**

SafeFleet AI is a real-time driver and fleet safety platform designed to detect unsafe driving conditions, combine multiple risk factors, calculate an explainable risk score, and trigger proactive interventions.

Instead of treating events such as speeding, drowsiness, distraction, night driving, extended driving duration, and harsh braking as isolated alerts, SafeFleet AI evaluates their combined effect to identify **compound-risk situations**.

---

## What Problem Does SafeFleet AI Solve?

Commercial fleet drivers can experience several safety risks at the same time:

- Driver drowsiness and fatigue
- Visual distraction
- Speeding
- Extended driving shifts
- Night driving
- Harsh braking
- Multiple risks occurring simultaneously

Traditional fleet monitoring systems often detect these conditions independently. This can make it difficult for fleet managers to understand the driver's **overall risk state** in real time.

### The SafeFleet AI approach

SafeFleet AI combines:

1. **Computer vision** for driver-state monitoring
2. **Vehicle telemetry** for driving conditions
3. **Contextual safety factors**
4. **Deterministic risk scoring**
5. **Compound-risk fusion**
6. **AI-generated safety explanations**
7. **Real-time intervention and fleet monitoring**

The objective is to move from simply **detecting an event** to **understanding the severity of the overall situation and responding proactively**.

---

## Who Benefits?

- **Drivers** — receive early warnings when unsafe conditions develop.
- **Fleet managers** — get real-time visibility into driver and vehicle risk.
- **Logistics companies** — can reduce safety incidents, downtime, and operational disruption.
- **Fleet owners** — gain historical safety intelligence and driver-performance insights.
- **Other road users** — benefit from safer fleet operations.

---

## Key Features

### Driver Monitoring
- Real-time facial landmark analysis
- Eye-closure based drowsiness detection
- PERCLOS-style eye-closure monitoring
- Head orientation / visual distraction detection

### Vehicle & Context Monitoring
- Vehicle speed
- Speed-limit comparison
- Driving duration
- Location
- Time of day
- Night-driving context
- Harsh braking

### Risk Intelligence
- Explainable 0–100 risk score
- SAFE / MODERATE / HIGH / CRITICAL classification
- Individual risk-factor scoring
- Compound-risk detection
- Risk-factor explanations
- Safety recommendations

### Intervention
- Driver warnings
- Audio alerts
- Critical-risk escalation
- Fleet-manager notifications
- Incident logging
- Emergency workflow support

### Fleet Analytics
- Driver safety trends
- Incident history
- Risk-factor analysis
- Fleet overview
- Real-time monitoring dashboard

---

## Risk Classification

SafeFleet AI converts detected conditions into a standardized risk score:

| Score | Risk Level |
|---:|---|
| 0–39 | SAFE |
| 40–69 | MODERATE |
| 70–84 | HIGH |
| 85–100 | CRITICAL |

The score is designed to be **deterministic and explainable**, so the system can identify which safety factors contributed to the result.

---

## Compound-Risk Intelligence

One of the core concepts of SafeFleet AI is that multiple simultaneous hazards can represent a significantly more dangerous situation than a single isolated event.

For example:

```text
Speeding
   +
Drowsiness
   +
Distraction
   +
Night Driving
   +
Extended Shift
   +
Harsh Braking
        |
        v
Compound Risk Fusion
        |
        v
   CRITICAL RISK
        |
        v
Driver Warning + Fleet Escalation
```

This allows SafeFleet AI to move beyond basic event detection toward **situational risk intelligence**.

---

## Technology Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- Lucide React
- Leaflet

### Backend / Infrastructure
- Node.js
- Express
- Firebase
- Firestore
- Firebase Authentication

### AI / Computer Vision
- MediaPipe Face Landmarker
- Google Gemini API

### Communication
- Twilio

---

# Local Setup

## Prerequisites

Install the following before starting:

- **Node.js** — preferably an LTS release
- **npm**
- **Git** (recommended)
- A modern browser such as Chrome or Edge

Check your installations:

```bash
node -v
npm -v
```

---

## 1. Clone or Download the Project

If using Git:

```bash
git clone <YOUR_REPOSITORY_URL>
cd <YOUR_PROJECT_FOLDER>
```

Or download the project ZIP and extract it.

Open the extracted project folder in VS Code.

---

## 2. Install Dependencies

Open the VS Code terminal in the project root and run:

```bash
npm install
```

Wait for the installation to complete.

---

## 3. Configure Environment Variables

Create a `.env` file in the project root if one does not already exist.

The project uses environment variables for services such as:

```env
GEMINI_API_KEY=your_gemini_api_key
VITE_APPROVED_MANAGER_EMAILS=your_manager_email
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

### Important

**Never commit real API keys, authentication tokens, or other secrets to GitHub.**

Add `.env` to `.gitignore`:

```gitignore
.env
.env.local
.env.*.local
```

If a `.env` file was supplied separately with the project, keep it local and do not publish its credentials.

---

## 4. Start the Development Server

Run:

```bash
npm run dev
```

The application should start in development mode.

Open the local URL displayed in the terminal. Depending on the project's Vite/server configuration, this will normally be a localhost address such as:

```text
http://localhost:3000
```

If the terminal displays a different port, use the port shown there.

---

## 5. Build for Production

To create a production build:

```bash
npm run build
```

To preview the production build, if the project provides the preview script:

```bash
npm run preview
```

---

# Typical Development Workflow

```text
1. Open project in VS Code
        |
        v
2. npm install
        |
        v
3. Configure .env
        |
        v
4. npm run dev
        |
        v
5. Open localhost URL
        |
        v
6. Test driver monitoring
        |
        v
7. Test telemetry / risk scenarios
        |
        v
8. Verify alerts and incident logging
```

---

# Testing the Core Safety Flow

A useful demonstration sequence is:

### Scenario 1 — Safe

- Speed within limit
- No detected drowsiness
- No detected distraction

Expected result:

**SAFE**

### Scenario 2 — Speeding

Increase vehicle speed above the configured speed limit.

Expected result:

**Speeding risk detected**

### Scenario 3 — Drowsiness

Keep the driver's eyes closed long enough to satisfy the drowsiness threshold.

Expected result:

**Drowsiness detected**

### Scenario 4 — Distraction

Turn the driver's head away from the forward direction for a sustained period.

Expected result:

**Distraction detected**

### Scenario 5 — Compound Risk

Combine multiple factors such as:

```text
Speeding
+ Drowsiness
+ Distraction
+ Night driving
+ Extended driving
+ Harsh braking
```

Expected result:

**HIGH / CRITICAL compound risk**, followed by the configured intervention workflow.

---

# Project Architecture

```text
                    ┌───────────────────┐
                    │ Driver + Vehicle  │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │ Data Acquisition   │
                    │ Camera + Telemetry │
                    └─────────┬─────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
        ┌───────▼────────┐         ┌────────▼────────┐
        │ Computer Vision│         │ Telemetry       │
        │ Drowsiness     │         │ Speed           │
        │ Distraction    │         │ Braking         │
        │ Head Pose      │         │ Duration        │
        └───────┬────────┘         └────────┬────────┘
                │                           │
                └─────────────┬─────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   Risk Engine     │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │ Compound Risk     │
                    │ Fusion             │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │ Risk Score 0–100  │
                    └─────────┬─────────┘
                              │
             ┌────────────────┼────────────────┐
             │                │                │
       ┌─────▼─────┐    ┌─────▼─────┐    ┌────▼─────┐
       │ Driver    │    │ Fleet     │    │ AI Safety│
       │ Warning   │    │ Dashboard │    │ Analysis │
       └───────────┘    └───────────┘    └──────────┘
```

---

# Troubleshooting

### `npm run dev` does not work

Check that dependencies are installed:

```bash
npm install
```

Then try:

```bash
npm run dev
```

### Check available npm scripts

```bash
npm run
```

This displays the scripts defined in `package.json`.

### Port already in use

If the configured port is already being used, stop the existing process or configure the development server to use another available port.

### Environment variable errors

Check that:

- `.env` exists in the project root
- Variable names are spelled correctly
- API keys are valid
- The development server was restarted after changing `.env`

### Camera / computer-vision problems

Check that:

- The browser has camera permission
- No other application is exclusively using the camera
- You are using a supported modern browser
- The page is running from the expected localhost origin

---

# Security

Never publish:

- Gemini API keys
- Twilio authentication tokens
- Firebase private credentials
- `.env` files containing secrets
- Service-account private keys

For a public GitHub repository, use environment variables and keep secret configuration outside source control.

---

# Project Objective

SafeFleet AI aims to transform fleet safety from **reactive monitoring to proactive risk intelligence**.

> **Detect → Assess → Explain → Intervene → Learn**

The system combines real-time driver monitoring, vehicle telemetry, deterministic risk analysis, compound-risk intelligence, AI explanations, and fleet analytics into one safety platform.

---

## Future Scope

Potential extensions include:

- Edge-device deployment inside vehicles
- CAN-bus / OBD-II integration
- Advanced object and road-scene detection
- Predictive accident-risk modeling
- Personalized driver coaching
- ML-based long-term risk forecasting
- Multi-fleet cloud deployment
- Advanced predictive maintenance
- Integration with enterprise fleet-management systems

---

## License

Add the appropriate license for your project before publishing the repository.

---

## Team

**SafeFleet AI**  
AI-Powered Predictive Driver Safety & Fleet Risk Intelligence

Built as an academic/project prototype focused on proactive fleet safety.
