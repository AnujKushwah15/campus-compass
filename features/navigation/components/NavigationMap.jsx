"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
    MapContainer, TileLayer, Marker, Popup,
    useMap, CircleMarker, useMapEvents
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// ── Marker Icon Helpers ──────────────────────────────────────────────────────

function makePin(color, letter) {
    return L.divIcon({
        className: "",
        html: `<div style="
            animation: markerDrop 0.45s cubic-bezier(0.34,1.56,0.64,1) both;
            display:flex; flex-direction:column; align-items:center;">
          <div style="
            background:${color};width:32px;height:32px;border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);border:3px solid white;
            box-shadow:0 3px 10px rgba(0,0,0,0.35);
            display:flex;align-items:center;justify-content:center;">
            <span style="transform:rotate(45deg);color:white;font-size:13px;font-weight:800;line-height:1;">
              ${letter}
            </span>
          </div>
          <div style="width:2px;height:8px;background:${color};margin-top:-1px;border-radius:0 0 2px 2px;"></div>
        </div>`,
        iconSize: [32, 44],
        iconAnchor: [16, 44],
        popupAnchor: [0, -46],
    });
}

const startIcon = makePin("#22c55e", "A");
const endIcon   = makePin("#ef4444", "B");

// ── POI type config ──────────────────────────────────────────────────────────
const POI_CONFIG = {
    hospital:   { emoji: "🏥", color: "#ef4444", major: true },
    education:  { emoji: "🎓", color: "#3b82f6", major: true },
    bank:       { emoji: "🏦", color: "#f59e0b", major: true },
    restaurant: { emoji: "🍽️", color: "#f97316", major: false },
    bus_stop:   { emoji: "🚌", color: "#06b6d4", major: true },
    pharmacy:   { emoji: "💊", color: "#10b981", major: false },
    fuel:       { emoji: "⛽", color: "#6b7280", major: false },
    shop:       { emoji: "🛒", color: "#8b5cf6", major: false },
    attraction: { emoji: "📍", color: "#ec4899", major: false },
    library:    { emoji: "📚", color: "#7c3aed", major: false },
    police:     { emoji: "🚓", color: "#1d4ed8", major: true },
    parking:    { emoji: "🅿️", color: "#64748b", major: false },
    poi:        { emoji: "📌", color: "#94a3b8", major: false },
};

function makePOIIcon(type) {
    const cfg = POI_CONFIG[type] || POI_CONFIG.poi;
    return L.divIcon({
        className: "",
        html: `<div style="
            font-size:18px;line-height:1;
            filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));
            transition:transform 0.15s ease;
            cursor:pointer;">
          ${cfg.emoji}
        </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -16],
    });
}

// ── Animated GeoJSON Polyline ────────────────────────────────────────────────
function AnimatedRoute({ routeData }) {
    const map = useMap();
    const layerRef = useRef(null);

    useEffect(() => {
        if (!routeData?.geometry) return;

        // Remove previous route
        if (layerRef.current) {
            map.removeLayer(layerRef.current);
            layerRef.current = null;
        }

        const coords = routeData.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        const total = coords.length;

        // Draw route progressively
        const polyline = L.polyline([], {
            color: "#8b5cf6",
            weight: 5,
            opacity: 0.9,
            lineCap: "round",
            lineJoin: "round",
        }).addTo(map);
        layerRef.current = polyline;

        const batchSize = Math.max(1, Math.ceil(total / 40));
        let idx = 0;

        const timer = setInterval(() => {
            const chunk = coords.slice(idx, idx + batchSize);
            chunk.forEach(pt => polyline.addLatLng(pt));
            idx += batchSize;
            if (idx >= total) clearInterval(timer);
        }, 30);

        return () => {
            clearInterval(timer);
            if (layerRef.current && map) {
                try { map.removeLayer(layerRef.current); } catch (_) {}
            }
        };
    }, [routeData, map]);

    return null;
}

// ── Map bounds fitter ────────────────────────────────────────────────────────
function MapFitter({ startPos, endPos, routeGeometry }) {
    const map = useMap();

    useEffect(() => {
        if (routeGeometry?.coordinates?.length > 0) {
            const coords = routeGeometry.coordinates.map(([lng, lat]) => [lat, lng]);
            map.fitBounds(L.latLngBounds(coords), { padding: [48, 48], maxZoom: 16, animate: true, duration: 1.2 });
        } else if (startPos && endPos) {
            map.fitBounds(
                L.latLngBounds([[startPos.lat, startPos.lng], [endPos.lat, endPos.lng]]),
                { padding: [60, 60], maxZoom: 16, animate: true }
            );
        } else if (startPos) {
            map.flyTo([startPos.lat, startPos.lng], 14, { animate: true, duration: 1 });
        } else if (endPos) {
            map.flyTo([endPos.lat, endPos.lng], 14, { animate: true, duration: 1 });
        }
    }, [startPos, endPos, routeGeometry, map]);

    return null;
}

// ── Live user dot ────────────────────────────────────────────────────────────
function UserPosition() {
    const [pos, setPos] = useState(null);

    useEffect(() => {
        if (!navigator.geolocation) return;
        const id = navigator.geolocation.watchPosition(
            (p) => setPos([p.coords.latitude, p.coords.longitude]),
            () => {},
            { enableHighAccuracy: true, maximumAge: 5000 }
        );
        return () => navigator.geolocation.clearWatch(id);
    }, []);

    if (!pos) return null;
    return (
        <CircleMarker center={pos} radius={8} pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.9, weight: 3 }}>
            <Popup><span className="text-sm font-medium">📍 You are here</span></Popup>
        </CircleMarker>
    );
}

// ── POI Layer (zoom-aware, debounced fetch, simple manual clustering) ─────────
const poiBboxCache = new Map();

function POILayer({ onPoiSelect }) {
    const map = useMap();
    const [pois, setPois] = useState([]);
    const [zoom, setZoom] = useState(null);
    const fetchTimerRef = useRef(null);

    const fetchPOIs = useCallback(async () => {
        const currentZoom = map.getZoom();
        if (currentZoom < 14) {
            setPois([]);
            return;
        }

        const bounds = map.getBounds();
        const south = bounds.getSouth().toFixed(4);
        const west  = bounds.getWest().toFixed(4);
        const north = bounds.getNorth().toFixed(4);
        const east  = bounds.getEast().toFixed(4);
        const bbox  = `${south},${west},${north},${east}`;

        // Client-side cache
        const cacheKey = `${bbox}|${currentZoom}`;
        if (poiBboxCache.has(cacheKey)) {
            const cached = poiBboxCache.get(cacheKey);
            setPois(currentZoom >= 14 ? filterByZoom(cached, currentZoom) : []);
            return;
        }

        try {
            const res = await fetch(`/api/places?bbox=${bbox}`);
            if (!res.ok) return;
            const data = await res.json();
            poiBboxCache.set(cacheKey, data);
            // Evict old entries
            if (poiBboxCache.size > 30) {
                const firstKey = poiBboxCache.keys().next().value;
                poiBboxCache.delete(firstKey);
            }
            setPois(filterByZoom(data, currentZoom));
        } catch (_) {
            // fail silently — POIs are optional
        }
    }, [map]);

    // Zoom-based filtering: zoom 14-15 → major only, 16+ → all
    function filterByZoom(data, z) {
        if (z >= 16) return data;
        return data.filter(p => (POI_CONFIG[p.type] || POI_CONFIG.poi).major);
    }

    // Debounce map move events
    useMapEvents({
        moveend: () => {
            clearTimeout(fetchTimerRef.current);
            fetchTimerRef.current = setTimeout(fetchPOIs, 500);
        },
        zoomend: () => {
            setZoom(map.getZoom());
            clearTimeout(fetchTimerRef.current);
            fetchTimerRef.current = setTimeout(fetchPOIs, 400);
        },
    });

    // Initial fetch
    useEffect(() => {
        fetchTimerRef.current = setTimeout(fetchPOIs, 800);
        return () => clearTimeout(fetchTimerRef.current);
    }, [fetchPOIs]);

    if (!pois.length) return null;

    return (
        <>
            {pois.map((poi) => (
                <Marker
                    key={poi.id}
                    position={[poi.lat, poi.lng]}
                    icon={makePOIIcon(poi.type)}
                    eventHandlers={{
                        click: () => onPoiSelect?.(poi),
                    }}
                >
                    <Popup>
                        <div className="text-sm min-w-[120px]">
                            <div className="font-semibold text-foreground">{poi.name}</div>
                            <div className="text-xs text-muted-foreground capitalize mt-0.5">{poi.type?.replace("_", " ")}</div>
                            <button
                                onClick={() => onPoiSelect?.(poi)}
                                className="mt-2 text-xs text-cc-purple-600 hover:text-cc-purple-500 font-medium flex items-center gap-1"
                            >
                                Set as destination →
                            </button>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </>
    );
}

// ── Main Map Component ───────────────────────────────────────────────────────
export default function NavigationMap({ startPos, endPos, routeData, onPoiSelect }) {
    const defaultCenter = [23.0225, 72.5714]; // Ahmedabad

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

                {/* Animated route polyline */}
                <AnimatedRoute routeData={routeData} />

                {/* POI Layer */}
                <POILayer onPoiSelect={onPoiSelect} />

                {/* Start Marker */}
                {startPos && (
                    <Marker position={[startPos.lat, startPos.lng]} icon={startIcon}>
                        <Popup>
                            <div className="text-sm">
                                <strong className="text-green-600">Start</strong><br />
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
                                <strong className="text-red-500">Destination</strong><br />
                                {endPos.label || `${endPos.lat.toFixed(4)}, ${endPos.lng.toFixed(4)}`}
                            </div>
                        </Popup>
                    </Marker>
                )}
            </MapContainer>
        </div>
    );
}
