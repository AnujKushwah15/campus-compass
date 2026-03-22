"use client";

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default Leaflet marker icons in Next.js
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

// Custom Bus Icon (using a simple divIcon or custom image if available, falling back to default for now with a color filter if possible, but standard marker is fine for MVP)
// For "Premium" feel, we might want a custom SVG later.

function MapController({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, 15, {
                animate: true,
                duration: 1.5
            });
        }
    }, [center, map]);
    return null;
}

export default function LiveMap({ busLocation, stops = [] }) {
    // Default to a central location if no busLocation provided (e.g., Campus)
    const defaultCenter = [23.0225, 72.5714]; // Ahmedabad example coords
    const activeCenter = busLocation ? [busLocation.lat, busLocation.lng] : defaultCenter;

    return (
        <div className="w-full h-full rounded-2xl overflow-hidden border border-border shadow-inner relative z-0">
            <MapContainer
                center={activeCenter}
                zoom={14}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%' }}
            >
                {/* CartoDB Dark Matter Tiles for Premium Dark Theme */}
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />

                <MapController center={activeCenter} />

                {/* Bus Marker */}
                {busLocation && (
                    <Marker position={[busLocation.lat, busLocation.lng]} icon={defaultIcon}>
                        <Popup className="bus-popup">
                            <div className="text-sm font-bold text-cc-purple-900">
                                🚍 School Bus 1<br />
                                <span className="text-xs font-normal text-gray-600">
                                    Speed: {busLocation.speed || 0} km/h
                                </span>
                            </div>
                        </Popup>
                    </Marker>
                )}

                {/* Optional Stops */}
                {stops.map((stop, index) => (
                    <Marker
                        key={index}
                        position={[stop.lat, stop.lng]}
                        icon={defaultIcon} // Ideally different icon for stops
                        opacity={0.7}
                    >
                        <Popup>{stop.name}</Popup>
                    </Marker>
                ))}

            </MapContainer>
        </div>
    );
}
