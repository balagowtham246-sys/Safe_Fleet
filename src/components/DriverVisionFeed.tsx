import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, Video, AlertTriangle, ShieldCheck, Eye, Smartphone, Zap, Sparkles, Activity, CheckCircle2, RefreshCw } from 'lucide-react';
import { TelemetryState } from '../types';
import { driverVisionEngine, VisionDetectionState } from '../utils/driverVisionDetector';
import { audioAlerts } from '../utils/audioAlerts';

interface DriverVisionFeedProps {
  telemetry: TelemetryState;
  onUpdateTelemetry: (updated: Partial<TelemetryState>) => void;
  driverName: string;
  vehicleReg: string;
  onLogIncident?: (description: string, arg2?: string, arg3?: string) => void;
}

export const DriverVisionFeed: React.FC<DriverVisionFeedProps> = ({
  telemetry,
  onUpdateTelemetry,
  driverName,
  vehicleReg,
  onLogIncident,
}) => {
  const [feedMode, setFeedMode] = useState<'simulated' | 'webcam'>('simulated');
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelReady, setModelReady] = useState(false);

  // Live vision metrics state for UI gauges
  const [visionMetrics, setVisionMetrics] = useState<{
    ear: number;
    headYaw: number;
    headPitch: number;
    perclos: number;
    fps: number;
    faceDetected: boolean;
    eyeClosedDurationMs: number;
    headAwayDurationMs: number;
  }>({
    ear: 0.32,
    headYaw: 0,
    headPitch: 0,
    perclos: 4.2,
    fps: 30,
    faceDetected: false,
    eyeClosedDurationMs: 0,
    headAwayDurationMs: 0,
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Ref to track last incident log timestamps to prevent log spamming
  const lastDrowsinessLogTimeRef = useRef<number>(0);
  const lastDistractionLogTimeRef = useRef<number>(0);
  const prevDrowsinessActiveRef = useRef<boolean>(false);
  const prevDistractionActiveRef = useRef<boolean>(false);

  // Start Webcam & Initialize Vision Model
  const startWebcam = async () => {
    setWebcamError(null);
    setIsModelLoading(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API unavailable in this browser environment');
      }

      // 1. Request camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraActive(true);
        setFeedMode('webcam');
      }

      // 2. Initialize MediaPipe Face Landmarker
      const loaded = await driverVisionEngine.initialize();
      setModelReady(loaded);
      setIsModelLoading(false);
    } catch (err: any) {
      console.warn('Webcam start error:', err);
      setWebcamError(err.message || 'Camera permission denied or camera not found');
      setIsModelLoading(false);
      stopWebcam();
    }
  };

  const stopWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setFeedMode('simulated');
  };

  // Main Canvas Render & Vision Inference Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameCount = 0;

    const render = () => {
      frameCount++;
      const width = canvas.width;
      const height = canvas.height;

      // Clear Canvas
      ctx.clearRect(0, 0, width, height);

      let currentVisionState: VisionDetectionState | null = null;

      if (feedMode === 'webcam' && videoRef.current && videoRef.current.readyState >= 2) {
        const video = videoRef.current;

        // 1. Draw live webcam frame (mirrored horizontally for natural driver ergonomics)
        ctx.save();
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, width, height);
        ctx.restore();

        // 2. Run Computer Vision Pipeline on current frame
        currentVisionState = driverVisionEngine.processVideoFrame(video, width, height);

        // Update React State throttled every ~10 frames for smooth UI gauges
        if (frameCount % 6 === 0) {
          setVisionMetrics({
            ear: currentVisionState.ear,
            headYaw: currentVisionState.headYawDeg,
            headPitch: currentVisionState.headPitchDeg,
            perclos: currentVisionState.perclos,
            fps: currentVisionState.fps,
            faceDetected: currentVisionState.faceDetected,
            eyeClosedDurationMs: currentVisionState.eyeClosedDurationMs,
            headAwayDurationMs: currentVisionState.headAwayDurationMs,
          });
        }

        // 3. Draw Real AI Vision Overlays (Facial Mesh, Eye Contours, Gaze Vectors)
        if (currentVisionState.faceDetected && currentVisionState.landmarks) {
          const landmarks = currentVisionState.landmarks;

          // Compute Face Bounding Box from actual 478 landmarks
          let minX = width;
          let maxX = 0;
          let minY = height;
          let maxY = 0;

          for (const pt of landmarks) {
            // Account for horizontal mirror on canvas
            const canvasX = (1 - pt.x) * width;
            const canvasY = pt.y * height;
            if (canvasX < minX) minX = canvasX;
            if (canvasX > maxX) maxX = canvasX;
            if (canvasY < minY) minY = canvasY;
            if (canvasY > maxY) maxY = canvasY;
          }

          // Add margin
          const padX = (maxX - minX) * 0.15;
          const padY = (maxY - minY) * 0.15;
          const boxX = Math.max(8, minX - padX);
          const boxY = Math.max(8, minY - padY);
          const boxW = Math.min(width - boxX - 8, maxX - minX + padX * 2);
          const boxH = Math.min(height - boxY - 8, maxY - minY + padY * 2);

          const isCritical = currentVisionState.drowsinessActive && currentVisionState.distractionActive;
          const isWarn = currentVisionState.drowsinessActive || currentVisionState.distractionActive;
          const strokeColor = isCritical ? '#f43f5e' : isWarn ? '#f59e0b' : '#10b981';

          // Bounding Box
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 3]);
          ctx.strokeRect(boxX, boxY, boxW, boxH);
          ctx.setLineDash([]);

          // Corner Accents
          const cLen = 14;
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 3;
          // TL
          ctx.beginPath();
          ctx.moveTo(boxX, boxY + cLen);
          ctx.lineTo(boxX, boxY);
          ctx.lineTo(boxX + cLen, boxY);
          ctx.stroke();
          // TR
          ctx.beginPath();
          ctx.moveTo(boxX + boxW - cLen, boxY);
          ctx.lineTo(boxX + boxW, boxY);
          ctx.lineTo(boxX + boxW, boxY + cLen);
          ctx.stroke();
          // BL
          ctx.beginPath();
          ctx.moveTo(boxX, boxY + boxH - cLen);
          ctx.lineTo(boxX, boxY + boxH);
          ctx.lineTo(boxX + cLen, boxY + boxH);
          ctx.stroke();
          // BR
          ctx.beginPath();
          ctx.moveTo(boxX + boxW - cLen, boxY + boxH);
          ctx.lineTo(boxX + boxW, boxY + boxH);
          ctx.lineTo(boxX + boxW, boxY + boxH - cLen);
          ctx.stroke();

          // Face Landmarks Points (Key Eye & Nose features)
          // Draw subtle eye landmark points
          const eyeLandmarkIndices = [33, 160, 158, 133, 153, 144, 263, 387, 385, 362, 380, 373, 1, 10, 152];
          ctx.fillStyle = currentVisionState.drowsinessActive ? '#f43f5e' : '#38bdf8';
          for (const idx of eyeLandmarkIndices) {
            const pt = landmarks[idx];
            if (pt) {
              const lx = (1 - pt.x) * width;
              const ly = pt.y * height;
              ctx.beginPath();
              ctx.arc(lx, ly, 2, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          // Top Tag on Box
          const tagText = currentVisionState.drowsinessActive
            ? `MICROSLEEP ALERT (${(currentVisionState.eyeClosedDurationMs / 1000).toFixed(1)}s)`
            : currentVisionState.distractionActive
            ? `INATTENTION / HEAD AWAY (${(currentVisionState.headAwayDurationMs / 1000).toFixed(1)}s)`
            : 'FOCUSED • FORWARD GAZE';

          ctx.fillStyle = strokeColor;
          ctx.fillRect(boxX, Math.max(0, boxY - 22), 220, 22);
          ctx.fillStyle = '#020617';
          ctx.font = 'bold 10px monospace';
          ctx.fillText(`AI-VISION • ${tagText}`, boxX + 6, Math.max(14, boxY - 7));
        } else if (!currentVisionState.faceDetected) {
          // No face detected overlay
          ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
          ctx.fillRect(0, 0, width, height);

          ctx.fillStyle = '#f87171';
          ctx.font = 'bold 13px monospace';
          ctx.fillText('NO DRIVER FACE DETECTED (HEAD TURNED / OBSCURED)', 24, height / 2);
        }

        // 4. Propagate Real Computer Vision Detections to Telemetry & Risk Engine
        const now = performance.now();

        // Drowsiness State Transition
        if (currentVisionState.drowsinessActive !== prevDrowsinessActiveRef.current) {
          prevDrowsinessActiveRef.current = currentVisionState.drowsinessActive;
          onUpdateTelemetry({
            drowsinessDetected: currentVisionState.drowsinessActive,
            drowsinessConfidence: currentVisionState.drowsinessConfidence,
          });

          if (currentVisionState.drowsinessActive && now - lastDrowsinessLogTimeRef.current >= 8000) {
            lastDrowsinessLogTimeRef.current = now;
            audioAlerts.playCautionChime();
            if (onLogIncident) {
              onLogIncident(
                `Prolonged Eyelid Closure (Microsleep: ${(currentVisionState.eyeClosedDurationMs / 1000).toFixed(1)}s) Detected via Live Vision Feed`,
                'In-cab fatigue warning chime dispatched to driver'
              );
            }
          }
        }

        // Inattention / Distraction State Transition
        if (currentVisionState.distractionActive !== prevDistractionActiveRef.current) {
          prevDistractionActiveRef.current = currentVisionState.distractionActive;
          onUpdateTelemetry({
            distractionDetected: currentVisionState.distractionActive,
            distractionConfidence: currentVisionState.distractionConfidence,
          });

          if (currentVisionState.distractionActive && now - lastDistractionLogTimeRef.current >= 8000) {
            lastDistractionLogTimeRef.current = now;
            audioAlerts.playCautionChime();
            if (onLogIncident) {
              onLogIncident(
                `Driver Inattention (Head Turned Away from Road: ${(currentVisionState.headAwayDurationMs / 1000).toFixed(1)}s) Detected via Live Vision`,
                'Visual inattention chime dispatched to cabin'
              );
            }
          }
        }
      } else {
        // High-Fidelity Synthesized In-Cab Dashcam Feed for DEMO SIMULATION MODE
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        if (telemetry.isNightDriving) {
          gradient.addColorStop(0, '#090d16');
          gradient.addColorStop(1, '#020617');
        } else {
          gradient.addColorStop(0, '#1e293b');
          gradient.addColorStop(1, '#0f172a');
        }
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Ambient Vehicle Windshield & Dashboard lines
        ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, height * 0.75);
        ctx.lineTo(width, height * 0.75);
        ctx.stroke();

        // Highway perspective lights passing by outside windshield
        const lightOffset = (frameCount * (telemetry.speed > 0 ? telemetry.speed / 20 : 1)) % 180;
        ctx.fillStyle = telemetry.isNightDriving ? 'rgba(234, 179, 8, 0.15)' : 'rgba(255, 255, 255, 0.08)';
        ctx.beginPath();
        ctx.arc(width * 0.25 - (lightOffset % 120), height * 0.35 + lightOffset * 0.2, 12, 0, Math.PI * 2);
        ctx.fill();

        // Synthesized Driver Silhouette in Cabin
        const centerX = width * 0.52;
        const centerY = height * 0.52;
        const swayY = telemetry.drowsinessDetected ? Math.sin(frameCount * 0.03) * 6 + 4 : Math.sin(frameCount * 0.05) * 1.5;
        const swayX = Math.cos(frameCount * 0.04) * 2;

        // Torso
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.ellipse(centerX + swayX, centerY + 80 + swayY, 70, 45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.stroke();

        // Head Base
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(centerX + swayX, centerY + swayY, 42, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.stroke();

        // Eyes
        const eyeY = centerY + swayY - 4;
        const leftEyeX = centerX + swayX - 16;
        const rightEyeX = centerX + swayX + 16;

        ctx.fillStyle = '#0f172a';
        if (telemetry.drowsinessDetected) {
          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(leftEyeX, eyeY + 2, 7, 0.1 * Math.PI, 0.9 * Math.PI, false);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(rightEyeX, eyeY + 2, 7, 0.1 * Math.PI, 0.9 * Math.PI, false);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.ellipse(leftEyeX, eyeY, 7, 4, 0, 0, Math.PI * 2);
          ctx.ellipse(rightEyeX, eyeY, 7, 4, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(leftEyeX + (telemetry.distractionDetected ? 3 : 0), eyeY, 2.5, 0, Math.PI * 2);
          ctx.arc(rightEyeX + (telemetry.distractionDetected ? 3 : 0), eyeY, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Phone In Hand Visualization if Distraction active in Demo mode
        if (telemetry.distractionDetected) {
          const phoneX = centerX + swayX + 44;
          const phoneY = centerY + swayY + 20;
          ctx.fillStyle = '#0284c7';
          ctx.fillRect(phoneX - 10, phoneY - 18, 20, 36);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.strokeRect(phoneX - 10, phoneY - 18, 20, 36);
        }

        // Simulated Tracking Box Overlay
        const boxX = width * 0.32;
        const boxY = height * 0.22;
        const boxW = width * 0.4;
        const boxH = height * 0.6;
        const strokeColor = telemetry.drowsinessDetected
          ? '#f43f5e'
          : telemetry.distractionDetected
          ? '#f59e0b'
          : '#10b981';

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 3]);
        ctx.strokeRect(boxX, boxY, boxW, boxH);
        ctx.setLineDash([]);

        ctx.fillStyle = strokeColor;
        ctx.fillRect(boxX, boxY - 20, 180, 20);
        ctx.fillStyle = '#020617';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(
          `SYNTH-VISION • ${
            telemetry.drowsinessDetected
              ? 'DROWSINESS FLAGGED'
              : telemetry.distractionDetected
              ? 'DISTRACTION FLAGGED'
              : 'ATTENTIVE'
          }`,
          boxX + 6,
          boxY - 6
        );
      }

      // Universal Canvas HUD Gauges (EAR & PERCLOS overlay at bottom)
      const earVal = feedMode === 'webcam' ? visionMetrics.ear : telemetry.drowsinessDetected ? 0.14 : 0.32;
      const isEarAlert = earVal < 0.2;

      ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
      ctx.fillRect(12, height - 62, 195, 50);
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.7)';
      ctx.strokeRect(12, height - 62, 195, 50);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px sans-serif';
      ctx.fillText('EYE ASPECT RATIO (EAR)', 20, height - 46);

      ctx.fillStyle = isEarAlert ? '#f43f5e' : '#10b981';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(
        `EAR: ${earVal.toFixed(2)} ${isEarAlert ? '(ALERT < 0.20)' : '(NOMINAL)'}`,
        20,
        height - 28
      );

      // Scanline Effect
      const scanY = (frameCount * 2) % height;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, scanY);
      ctx.lineTo(width, scanY);
      ctx.stroke();

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [feedMode, telemetry, visionMetrics, onUpdateTelemetry, onLogIncident]);

  return (
    <div className="flex flex-col rounded-xl border border-slate-800 bg-[#1E293B] p-4 shadow-lg">
      {/* Header with Distinct Mode Status */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <Camera className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Driver Vision Monitoring
              </h3>
              {/* Distinct Real Mode Badge */}
              {feedMode === 'webcam' ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/40 shadow-sm animate-pulse">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  LIVE AI MONITORING
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/40">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  DEMO SIMULATION MODE
                </span>
              )}
            </div>
            <p className="text-xs font-medium text-white">
              {driverName || 'Active Driver'} <span className="text-slate-400 font-mono">({vehicleReg || 'Fleet Unit'})</span>
            </p>
          </div>
        </div>

        {/* Mode Toggle Controls */}
        <div className="flex items-center gap-1 rounded-md bg-slate-900 p-1 border border-slate-800">
          <button
            id="btn-mode-simulated"
            onClick={stopWebcam}
            className={`flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-semibold transition-all ${
              feedMode === 'simulated'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Video className="h-3.5 w-3.5" />
            <span>Simulated Mode</span>
          </button>
          <button
            id="btn-mode-webcam"
            onClick={startWebcam}
            disabled={isModelLoading}
            className={`flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-semibold transition-all ${
              feedMode === 'webcam'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {isModelLoading ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-400" />
            ) : (
              <Camera className="h-3.5 w-3.5" />
            )}
            <span>Live Webcam AI</span>
          </button>
        </div>
      </div>

      {/* Hidden Video element for webcam capture */}
      <video ref={videoRef} className="hidden" playsInline muted autoPlay />

      {/* Video & AI Canvas Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-slate-800 bg-[#020617] shadow-inner">
        <canvas
          ref={canvasRef}
          width={560}
          height={420}
          className="h-full w-full object-cover"
        />

        {/* Live HUD Mode Badge Overlay */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          {feedMode === 'webcam' ? (
            <span className="bg-emerald-600/90 backdrop-blur-md text-white text-[10px] px-2.5 py-1 rounded font-bold flex items-center gap-1.5 shadow-md border border-emerald-400/30">
              <span className="w-2 h-2 bg-white rounded-full animate-ping"></span> LIVE WEBCAM • 30 FPS
            </span>
          ) : (
            <span className="bg-amber-600/90 backdrop-blur-md text-white text-[10px] px-2.5 py-1 rounded font-bold flex items-center gap-1.5 shadow-md border border-amber-400/30">
              <span className="w-1.5 h-1.5 bg-white rounded-full"></span> DEMO SYNTH DASHCAM
            </span>
          )}
          <span className="bg-black/70 backdrop-blur-md text-slate-200 text-[10px] px-2 py-1 rounded border border-white/10 font-mono">
            {driverName?.toUpperCase() || 'DRIVER'}
          </span>
        </div>

        {/* Live Detection Flags Status Pills */}
        <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
          {telemetry.drowsinessDetected && (
            <div className="flex items-center gap-1.5 rounded-md bg-red-950/95 border border-red-500 px-2.5 py-1 text-xs font-bold text-red-200 shadow-lg animate-pulse">
              <Eye className="h-3.5 w-3.5 text-red-400" />
              <span>Drowsiness Detected</span>
              <span className="rounded bg-red-900 px-1.5 py-0.2 text-[10px] text-white">
                {telemetry.drowsinessConfidence || 91}%
              </span>
            </div>
          )}

          {telemetry.distractionDetected && (
            <div className="flex items-center gap-1.5 rounded-md bg-orange-950/95 border border-orange-500 px-2.5 py-1 text-xs font-bold text-orange-200 shadow-lg">
              <Smartphone className="h-3.5 w-3.5 text-orange-400" />
              <span>Inattention / Head Away</span>
              <span className="rounded bg-orange-900 px-1.5 py-0.2 text-[10px] text-white">
                {telemetry.distractionConfidence || 88}%
              </span>
            </div>
          )}

          {!telemetry.drowsinessDetected && !telemetry.distractionDetected && (
            <div className="flex items-center gap-1.5 rounded-md bg-slate-900/85 border border-emerald-500/50 px-2.5 py-1 text-xs font-semibold text-emerald-400 backdrop-blur-md">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>Attentive • Road Gaze Active</span>
            </div>
          )}
        </div>

        {/* Bottom Right Live Vision Metrics */}
        <div className="absolute bottom-3 right-3 flex flex-col items-end gap-1">
          <span className="rounded bg-slate-950/90 px-2.5 py-1 text-[10px] font-mono text-slate-300 border border-slate-700">
            PERCLOS: {feedMode === 'webcam' ? `${visionMetrics.perclos}%` : telemetry.drowsinessDetected ? '28.4% (FATIGUE)' : '4.1% (NOMINAL)'}
          </span>
          {feedMode === 'webcam' && (
            <span className="rounded bg-slate-950/90 px-2 py-0.5 text-[9px] font-mono text-slate-400 border border-slate-800">
              YAW: {visionMetrics.headYaw}° | PITCH: {visionMetrics.headPitch}°
            </span>
          )}
        </div>
      </div>

      {/* Fallback notification if webcam was denied or unavailable */}
      {webcamError && (
        <div className="mt-2 flex items-center gap-2 rounded-md bg-amber-950/60 border border-amber-700/50 p-2.5 text-xs text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
          <span>
            {webcamError} — Seamlessly switched to <strong>Demo Simulation Mode</strong>.
          </span>
        </div>
      )}

      {/* Live AI Metric Dashboard vs Interactive Simulation Triggers */}
      {feedMode === 'webcam' ? (
        <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900/80 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs font-bold text-slate-200">Real-Time Computer Vision Telemetry</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              478 Face Mesh Landmarks
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            <div className="rounded bg-slate-950 p-2 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Eye Aspect Ratio</span>
              <span className={`font-mono font-bold text-sm ${visionMetrics.ear < 0.2 ? 'text-red-400' : 'text-emerald-400'}`}>
                {visionMetrics.ear.toFixed(3)}
              </span>
            </div>

            <div className="rounded bg-slate-950 p-2 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Closed Eye Time</span>
              <span className={`font-mono font-bold text-sm ${visionMetrics.eyeClosedDurationMs >= 1400 ? 'text-red-400 animate-pulse' : 'text-slate-200'}`}>
                {(visionMetrics.eyeClosedDurationMs / 1000).toFixed(1)}s
              </span>
            </div>

            <div className="rounded bg-slate-950 p-2 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Head Orientation</span>
              <span className={`font-mono font-bold text-sm ${Math.abs(visionMetrics.headYaw) > 25 ? 'text-orange-400' : 'text-slate-200'}`}>
                {visionMetrics.headYaw > 0 ? `+${visionMetrics.headYaw}°` : `${visionMetrics.headYaw}°`}
              </span>
            </div>

            <div className="rounded bg-slate-950 p-2 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Inattention Duration</span>
              <span className={`font-mono font-bold text-sm ${visionMetrics.headAwayDurationMs >= 1800 ? 'text-orange-400 animate-pulse' : 'text-slate-200'}`}>
                {(visionMetrics.headAwayDurationMs / 1000).toFixed(1)}s
              </span>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 bg-slate-950/60 px-2.5 py-1.5 rounded border border-slate-800/80">
            <span>💡 <strong>Live Test:</strong> Close eyes for &gt;1.5s to trigger real microsleep alert. Turn head away for &gt;2.0s to trigger inattention.</span>
          </div>
        </div>
      ) : (
        /* Manual Scenario Simulation Toggles (Available when in Demo Mode) */
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            id="btn-toggle-drowsiness"
            onClick={() =>
              onUpdateTelemetry({
                drowsinessDetected: !telemetry.drowsinessDetected,
                drowsinessConfidence: telemetry.drowsinessDetected ? 0 : 91,
              })
            }
            className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-semibold transition-all border ${
              telemetry.drowsinessDetected
                ? 'bg-red-500/10 text-red-300 border-red-500/50 shadow-sm border-l-4 border-l-red-500'
                : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Eye className={`h-4 w-4 ${telemetry.drowsinessDetected ? 'text-red-400' : 'text-slate-500'}`} />
              <span>Simulate Drowsiness</span>
            </div>
            <span
              className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                telemetry.drowsinessDetected ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {telemetry.drowsinessDetected ? 'ON (91%)' : 'OFF'}
            </span>
          </button>

          <button
            id="btn-toggle-distraction"
            onClick={() =>
              onUpdateTelemetry({
                distractionDetected: !telemetry.distractionDetected,
                distractionConfidence: telemetry.distractionDetected ? 0 : 88,
              })
            }
            className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-semibold transition-all border ${
              telemetry.distractionDetected
                ? 'bg-orange-500/10 text-orange-300 border-orange-500/50 shadow-sm border-l-4 border-l-orange-500'
                : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Smartphone className={`h-4 w-4 ${telemetry.distractionDetected ? 'text-orange-400' : 'text-slate-500'}`} />
              <span>Simulate Inattention</span>
            </div>
            <span
              className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                telemetry.distractionDetected ? 'bg-orange-500 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {telemetry.distractionDetected ? 'ON (88%)' : 'OFF'}
            </span>
          </button>
        </div>
      )}

      {/* Privacy note */}
      <p className="mt-2 text-[10px] text-slate-500 italic">
        All camera video frames are analyzed locally in-browser on the client device. No video or biometric image streams are uploaded to servers.
      </p>
    </div>
  );
};

