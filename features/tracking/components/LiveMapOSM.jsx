"use client";

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// ── Custom SVG Bus Icon ───────────────────────────────────────────────────────
function makeBusIcon(color = "#4ade80", label = "") {
    return L.divIcon({
        className: "",
        html: `<div style="display:flex;flex-direction:column;align-items:center;animation:busPop 0.4s cubic-bezier(0.34,1.56,0.64,1) both;">
          <div style="
            background:${color};border:2.5px solid white;border-radius:8px;
            width:40px;height:25px;box-shadow:0 4px 14px rgba(0,0,0,0.45);
            display:flex;align-items:center;justify-content:center;">
            <svg width="22" height="15" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="22" height="11" rx="3" fill="white" fill-opacity="0.22"/>
              <rect x="2" y="2" width="8" height="5" rx="1" fill="white" fill-opacity="0.6"/>
              <rect x="14" y="2" width="8" height="5" rx="1" fill="white" fill-opacity="0.6"/>
              <circle cx="5" cy="14" r="2" fill="white"/>
              <circle cx="19" cy="14" r="2" fill="white"/>
            </svg>
          </div>
          ${label ? `<div style="margin-top:2px;background:${color};color:white;font-size:9px;font-weight:700;border-radius:4px;padding:1px 5px;white-space:nowrap;border:1.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${label}</div>` : ""}
        </div>`,
        iconSize: [42, label ? 50 : 30],
        iconAnchor: [21, label ? 50 : 30],
        popupAnchor: [0, -54],
    });
}

// ── Stop Icon ────────────────────────────────────────────────────────────────
function makeStopIcon() {
    return L.divIcon({
        className: "",
        html: `<div style="display:flex;flex-direction:column;align-items:center;">
          <div style="background:#ef4444;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);" />
        </div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        popupAnchor: [0, -14],
    });
}

function MapController({ center, bounds }) {
    const map = useMap();
    useEffect(() => {
        if (bounds && bounds.length > 1) {
            map.fitBounds(bounds, { padding: [50, 50], animate: true, duration: 1.5 });
        } else if (center) {
            map.flyTo(center, 15, {
                animate: true,
                duration: 1.5
            });
        }
    }, [center, bounds, map]);
    return null;
}

export default function LiveMapOSM({ busLocation, busLocations = [], stops = [] }) {
    const defaultCenter = [23.0225, 72.5714];
    
    // Determine buses to draw
    const busesToDraw = busLocations?.length > 0 ? busLocations : (busLocation ? [busLocation] : []);
    
    const activeCenter = busesToDraw.length === 1 
        ? [busesToDraw[0].lat, busesToDraw[0].lng] 
        : (busesToDraw.length === 0 ? defaultCenter : null);
        
    const bounds = busesToDraw.length > 1 
        ? busesToDraw.map(b => [b.lat, b.lng]) 
        : null;

    return (
        <div className="w-full h-full rounded-2xl overflow-hidden border border-border shadow-inner relative z-0">
            <style dangerouslySetInnerHTML={{
                __html: `
                    @keyframes busPop {
                        from { opacity:0; transform:scale(0.4) translateY(-10px); }
                        to   { opacity:1; transform:scale(1) translateY(0); }
                    }
                `
            }} />
            <MapContainer
                center={activeCenter}
                zoom={14}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />

                <MapController center={activeCenter} bounds={bounds} />

                {busesToDraw.map((bus, idx) => {
                    const isSelected = busLocation && busLocation.lat === bus.lat && busLocation.lng === bus.lng;
                    const color = isSelected ? "#8b5cf6" : "#4ade80";
                    const label = bus.label || `Bus ${bus.id || ''}`;
                    return (
                        <Marker
                            key={bus.id || idx}
                            position={[bus.lat, bus.lng]}
                            icon={makeBusIcon(color, label)}
                        >
                            <Popup>
                                <div style={{ minWidth: "120px" }}>
                                    <div style={{ fontSize: "13px", fontWeight: 700, color, marginBottom: "4px" }}>
                                        🚍 {label}
                                    </div>
                                    <div style={{ fontSize: "11px", color: "#a1a0b0" }}>
                                        Speed: <span style={{ color: "#333", fontWeight: 600 }}>{bus.speed || 0} km/h</span>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

                {stops.map((stop, index) => (
                    <Marker
                        key={index}
                        position={[stop.lat, stop.lng]}
                        icon={makeStopIcon()}
                        opacity={0.85}
                    >
                        <Popup>
                            <div style={{ fontSize: "13px", fontWeight: 600, color: "#333" }}>
                                📍 {stop.name}
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
