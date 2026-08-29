import React from 'react';
import { DriverVisionFeed } from './DriverVisionFeed';
import { TelemetryControlPanel } from './TelemetryControlPanel';
import { RiskGaugeCard } from './RiskGaugeCard';
import { AISafetyInsightCard } from './AISafetyInsightCard';
import { InterventionPanel } from './InterventionPanel';
import { RiskEngineResult, TelemetryState, Vehicle } from '../types';

interface LiveMonitoringViewProps {
  telemetry: TelemetryState;
  onUpdateTelemetry: (updated: Partial<TelemetryState>) => void;
  risk: RiskEngineResult;
  currentVehicle: Vehicle;
  driverPhone?: string;
  onTriggerHarshBraking: () => void;
  onLogIncident: (description: string, arg2?: string, arg3?: string) => void;
  onViewEvents: () => void;
  onInitiateEmergencyCall?: (callTarget: {
    driverId: string;
    driverName: string;
    driverPhone?: string;
    vehicleReg: string;
    riskScore: number;
    riskLevel: any;
    reason?: string;
  }) => void;
}

export const LiveMonitoringView: React.FC<LiveMonitoringViewProps> = ({
  telemetry,
  onUpdateTelemetry,
  risk,
  currentVehicle,
  driverPhone,
  onTriggerHarshBraking,
  onLogIncident,
  onViewEvents,
  onInitiateEmergencyCall,
}) => {
  return (
    <div className="space-y-5">
      {/* Top Split: Left Side (Driver Camera & AI Vision) + Right Side (Vehicle Telemetry) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left Side: Driver Camera (6 Cols) */}
        <div className="lg:col-span-6">
          <DriverVisionFeed
            telemetry={telemetry}
            onUpdateTelemetry={onUpdateTelemetry}
            driverName={currentVehicle.driverName}
            vehicleReg={currentVehicle.registrationNumber}
            onLogIncident={onLogIncident}
          />
        </div>

        {/* Right Side: Vehicle Telemetry Ingestion & Interactive Controls (6 Cols) */}
        <div className="lg:col-span-6">
          <TelemetryControlPanel
            telemetry={telemetry}
            onUpdateTelemetry={onUpdateTelemetry}
            onTriggerHarshBraking={onTriggerHarshBraking}
          />
        </div>
      </div>

      {/* Dynamic Compound Risk Engine & Transparent Explainability */}
      <div>
        <RiskGaugeCard
          risk={risk}
          telemetry={telemetry}
          driverName={currentVehicle.driverName}
          vehicleReg={currentVehicle.registrationNumber}
        />
      </div>

      {/* AI Safety Explanation & Contextual Reasoning */}
      <div>
        <AISafetyInsightCard
          risk={risk}
          telemetry={telemetry}
          driverName={currentVehicle.driverName}
          vehicleReg={currentVehicle.registrationNumber}
        />
      </div>

      {/* Proactive Safety Intervention Panel (Act: Driver Warning + Manager Alert + Incident Log) */}
      <div>
        <InterventionPanel
          risk={risk}
          telemetry={telemetry}
          driverId={currentVehicle.driverId}
          driverName={currentVehicle.driverName}
          driverPhone={driverPhone}
          vehicleReg={currentVehicle.registrationNumber}
          onLogIncident={onLogIncident}
          onViewEvents={onViewEvents}
          onInitiateEmergencyCall={onInitiateEmergencyCall}
        />
      </div>
    </div>
  );
};
