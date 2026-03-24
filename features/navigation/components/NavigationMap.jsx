"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default Leaflet marker icons
const iconUrl = "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png";
const iconRetinaUrl = "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png";
const shadowUrl = "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png";

const defaultIcon = L.icon({
    iconUrl,
    iconRetinaUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

// Green start marker
const startIcon = L.divIcon({
    className: "custom-marker",
    html: `<div style="background: #22c55e; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="12" r="8"/></svg>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
});

// Red end marker
const endIcon = L.divIcon({
    className: "custom-marker",
    html: `<div style="background: #ef4444; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
});

// Fit map to show full route
function MapFitter({ startPos, endPos, routeGeometry }) {
    const map = useMap();

    useEffect(() => {
        if (routeGeometry && routeGeometry.coordinates && routeGeometry.coordinates.length > 0) {
            const coords = routeGeometry.coordinates.map(([lng, lat]) => [lat, lng]);
            const bounds = L.latLngBounds(coords);
            map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16, animate: true, duration: 1 });
        } else if (startPos && endPos) {
            const bounds = L.latLngBounds([
                [startPos.lat, startPos.lng],
                [endPos.lat, endPos.lng],
            ]);
            map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16, animate: true });
        } else if (startPos) {
            map.flyTo([startPos.lat, startPos.lng], 14, { animate: true, duration: 1 });
        } else if (endPos) {
            map.flyTo([endPos.lat, endPos.lng], 14, { animate: true, duration: 1 });
        }
    }, [startPos, endPos, routeGeometry, map]);

    return null;
}

// User live position tracker
function UserPosition() {
    const [pos, setPos] = useState(null);
    const map = useMap();

    useEffect(() => {
        if (!navigator.geolocation) return;

        const watchId = navigator.geolocation.watchPosition(
            (p) => setPos([p.coords.latitude, p.coords.longitude]),
            () => {},
            { enableHighAccuracy: true, maximumAge: 5000 }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [map]);

    if (!pos) return null;

    return (
        <CircleMarker
            center={pos}
            radius={8}
            pathOptions={{
                color: "#3b82f6",
                fillColor: "#3b82f6",
                fillOpacity: 0.9,
                weight: 3,
            }}
        >
            <Popup>
                <span className="text-sm font-medium">📍 You are here</span>
            </Popup>
        </CircleMarker>
    );
}

export default function NavigationMap({ startPos, endPos, routeData }) {
    const defaultCenter = [23.0225, 72.5714]; // Ahmedabad
    const geoJsonRef = useRef(null);

    // Generate unique key to force GeoJSON re-render
    const geoJsonKey = routeData?.geometry
        ? JSON.stringify(routeData.geometry.coordinates.slice(0, 3))
        : "none";

    const routeStyle = {
        color: "#8b5cf6",
        weight: 5,
        opacity: 0.85,
        lineCap: "round",
        lineJoin: "round",
    };

    return (
        <div className="w-full h-full rounded-2xl overflow-hidden border border-border shadow-inner relative z-0">
            <MapContainer
                center={startPos ? [startPos.lat, startPos.lng] : defaultCenter}
                zoom={13}
                scrollWheelZoom={true}
                style={{ height: "100%", width: "100%" }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />

                <MapFitter startPos={startPos} endPos={endPos} routeGeometry={routeData?.geometry} />
                <UserPosition />

                {/* Route Polyline */}
                {routeData?.geometry && (
                    <GeoJSON
                        key={geoJsonKey}
                        ref={geoJsonRef}
                        data={routeData.geometry}
                        style={routeStyle}
                    />
                )}

                {/* Start Marker */}
                {startPos && (
                    <Marker position={[startPos.lat, startPos.lng]} icon={startIcon}>
                        <Popup>
                            <div className="text-sm">
                                <strong className="text-green-600">Start</strong>
                                <br />
                                {startPos.label || `${startPos.lat.toFixed(4)}, ${startPos.lng.toFixed(4)}`}
                            </div>
                        </Popup>
                    </Marker>
                )}

                {/* End Marker */}
                {endPos && (
                    <Marker position={[endPos.lat, endPos.lng]} icon={endIcon}>
                        <Popup>
                            <div className="text-sm">
                                <strong className="text-red-500">Destination</strong>
                                <br />
                                {endPos.label || `${endPos.lat.toFixed(4)}, ${endPos.lng.toFixed(4)}`}
                            </div>
                        </Popup>
                    </Marker>
                )}
            </MapContainer>
        </div>
    );
}
