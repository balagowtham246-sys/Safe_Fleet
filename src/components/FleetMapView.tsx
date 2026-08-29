import React, { useEffect, useRef } from 'react';
import { Vehicle } from '../types';
import L from 'leaflet';

interface FleetMapViewProps {
  vehicles: Vehicle[];
  selectedVehicleId: string;
  onSelectVehicle: (vehicle: Vehicle) => void;
}

export const FleetMapView: React.FC<FleetMapViewProps> = ({
  vehicles,
  selectedVehicleId,
  onSelectVehicle,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize Map if not yet created
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [13.0827, 78.5], // Center over South/Central India freight corridor
        zoom: 6,
        zoomControl: false,
        attributionControl: false,
      });

      // Add Zoom Control in top right
      L.control.zoom({ position: 'topright' }).addTo(map);

      // Dark High-Contrast OpenStreetMap CartoDB Tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    // Clear old markers
    markersLayer.clearLayers();

    // Render Vehicle Markers
    vehicles.forEach((vehicle) => {
      // Safely resolve and validate latitude and longitude
      const rawLat = vehicle.latitude ?? (vehicle as any).lat;
      const rawLng = vehicle.longitude ?? (vehicle as any).lng;

      const lat = typeof rawLat === 'number' && !isNaN(rawLat) ? rawLat : null;
      const lng = typeof rawLng === 'number' && !isNaN(rawLng) ? rawLng : null;

      // Skip vehicle if valid coordinates are not available
      if (lat === null || lng === null) {
        return;
      }

      const isSelected = vehicle.id === selectedVehicleId;
      const isCritical = vehicle.riskLevel === 'CRITICAL';
      const isHigh = vehicle.riskLevel === 'HIGH';
      const isModerate = vehicle.riskLevel === 'MODERATE';

      const color = isCritical
        ? '#ef4444'
        : isHigh
        ? '#f97316'
        : isModerate
        ? '#eab308'
        : '#10b981';

      // Custom HTML Marker with pulsing aura for critical/high
      const markerHtml = `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          ${
            isCritical
              ? `<div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: rgba(239,68,68,0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
              : ''
          }
          <div style="
            width: ${isSelected ? '24px' : '18px'};
            height: ${isSelected ? '24px' : '18px'};
            border-radius: 50%;
            background: ${color};
            border: 2px solid #ffffff;
            box-shadow: 0 0 10px ${color};
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: 800;
            color: #000000;
          ">
            ${(vehicle.speed ?? 0) > 0 ? '▲' : '■'}
          </div>
          ${
            isCritical || isHigh
              ? `<div style="position: absolute; top: -18px; white-space: nowrap; background: rgba(15,23,42,0.95); border: 1px solid ${color}; color: ${color}; font-size: 10px; font-weight: 700; padding: 1px 4px; border-radius: 4px;">
                  ${vehicle.riskScore ?? 0}/100
                </div>`
              : ''
          }
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-fleet-marker',
        html: markerHtml,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      // Popup content
      const popupHtml = `
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; min-width: 180px; padding: 4px; color: #f8fafc; background: #0f172a; border-radius: 8px;">
          <div style="font-weight: 800; font-size: 13px; color: #ffffff; margin-bottom: 2px;">
            ${vehicle.registrationNumber}
          </div>
          <div style="font-size: 11px; color: #94a3b8; margin-bottom: 6px;">
            Driver: <strong>${vehicle.driverName}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
            <span>Speed: <strong>${vehicle.speed} km/h</strong></span>
            <span style="color: ${color}; font-weight: 800;">Risk: ${vehicle.riskScore}/100 (${vehicle.riskLevel})</span>
          </div>
          <div style="font-size: 10px; color: #cbd5e1; margin-bottom: 6px;">
            ${vehicle.locationName}
          </div>
          <button id="popup-btn-${vehicle.id}" style="
            width: 100%;
            background: #2563eb;
            color: #ffffff;
            font-size: 11px;
            font-weight: 700;
            padding: 6px 10px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
          ">
            Inspect in Live Monitoring →
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        className: 'dark-fleet-popup',
      });

      marker.on('popupopen', () => {
        setTimeout(() => {
          const btn = document.getElementById(`popup-btn-${vehicle.id}`);
          if (btn) {
            btn.onclick = () => onSelectVehicle(vehicle);
          }
        }, 50);
      });

      marker.on('click', () => {
        onSelectVehicle(vehicle);
      });

      markersLayer.addLayer(marker);
    });
  }, [vehicles, selectedVehicleId, onSelectVehicle]);

  // Clean up map instance on component unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative h-full min-h-[380px] w-full overflow-hidden rounded-xl border border-slate-800 bg-[#1E293B] shadow-lg">
      <div ref={mapContainerRef} className="h-full w-full min-h-[380px]" />

      {/* Map Legend Overlay */}
      <div className="absolute bottom-3 left-3 z-[400] flex flex-wrap items-center gap-2 rounded-lg bg-slate-900/90 p-2 text-xs font-semibold backdrop-blur-md border border-slate-800 shadow-md">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fleet Risk:</span>
        <div className="flex items-center gap-1 text-emerald-400">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span>Safe (15)</span>
        </div>
        <div className="flex items-center gap-1 text-yellow-400">
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
          <span>Moderate (6)</span>
        </div>
        <div className="flex items-center gap-1 text-orange-400">
          <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
          <span>High (2)</span>
        </div>
        <div className="flex items-center gap-1 text-red-400">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
          <span>Critical (1)</span>
        </div>
      </div>
    </div>
  );
};
