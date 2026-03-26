"use client";

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const iconUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png';
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png';

const defaultIcon = L.icon({
    iconUrl,
    iconRetinaUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

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
    
    // Calculate active center or bounds
    const activeCenter = busesToDraw.length === 1 
        ? [busesToDraw[0].lat, busesToDraw[0].lng] 
        : (busesToDraw.length === 0 ? defaultCenter : null);
        
    const bounds = busesToDraw.length > 1 
        ? busesToDraw.map(b => [b.lat, b.lng]) 
        : null;

    return (
        <div className="w-full h-full rounded-2xl overflow-hidden border border-border shadow-inner relative z-0">
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
                    return (
                        <Marker key={bus.id || idx} position={[bus.lat, bus.lng]} icon={defaultIcon}>
                            <Popup className="bus-popup">
                                <div className={`text-sm font-bold ${isSelected ? 'text-cc-purple-600' : 'text-cc-purple-900'}`}>
                                    🚍 {bus.label || `Bus ${bus.id || ''}`}<br />
                                    <span className="text-xs font-normal text-gray-600">
                                        Speed: {bus.speed || 0} km/h
                                    </span>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

                {stops.map((stop, index) => (
                    <Marker
                        key={index}
                        position={[stop.lat, stop.lng]}
                        icon={defaultIcon}
                        opacity={0.7}
                    >
                        <Popup>{stop.name}</Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
