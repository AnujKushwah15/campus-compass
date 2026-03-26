"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
    MapContainer, TileLayer, Marker, Popup,
    useMap, CircleMarker, useMapEvents
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Inject override styles for Leaflet popups so they look good in dark theme
const POPUP_STYLES = `
  .leaflet-popup-content-wrapper {
    background: #1e1b2e !important;
    color: #f1f0f7 !important;
    border: 1px solid rgba(139,92,246,0.3) !important;
    border-radius: 12px !important;
    box-shadow: 0 8px 24px rgba(0,0,0,0.5) !important;
    padding: 0 !important;
  }
  .leaflet-popup-content {
    margin: 0 !important;
    padding: 12px 14px !important;
    line-height: 1.5 !important;
  }
  .leaflet-popup-tip {
    background: #1e1b2e !important;
  }
  .leaflet-popup-close-button {
    color: #a1a0b0 !important;
    font-size: 18px !important;
    padding: 6px 8px !important;
  }
  .leaflet-popup-close-button:hover {
    color: #f1f0f7 !important;
  }
`;

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
export const POI_CONFIG = {
    hospital:   { emoji: "🏥", label: "Hospital",   color: "#ef4444", major: true },
    education:  { emoji: "🎓", label: "College",    color: "#3b82f6", major: true },
    bank:       { emoji: "🏦", label: "Bank",       color: "#f59e0b", major: true },
    restaurant: { emoji: "🍽️", label: "Food",       color: "#f97316", major: false },
    bus_stop:   { emoji: "🚌", label: "Bus Stop",   color: "#06b6d4", major: true },
    pharmacy:   { emoji: "💊", label: "Pharmacy",   color: "#10b981", major: false },
    fuel:       { emoji: "⛽", label: "Fuel",       color: "#6b7280", major: false },
    shop:       { emoji: "🛒", label: "Shop",       color: "#8b5cf6", major: false },
    attraction: { emoji: "📍", label: "Attraction", color: "#ec4899", major: false },
    library:    { emoji: "📚", label: "Library",    color: "#7c3aed", major: false },
    police:     { emoji: "🚓", label: "Police",     color: "#1d4ed8", major: true },
    parking:    { emoji: "🅿️", label: "Parking",   color: "#64748b", major: false },
    poi:        { emoji: "📌", label: "POI",        color: "#94a3b8", major: false },
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

        if (layerRef.current) {
            map.removeLayer(layerRef.current);
            layerRef.current = null;
        }

        const coords = routeData.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        const total = coords.length;

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
            <Popup>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#f1f0f7" }}>📍 You are here</span>
            </Popup>
        </CircleMarker>
    );
}

// ── localStorage POI cache helpers ────────────────────────────────────────────
const LS_PREFIX = "cc_poi_";
const LS_TTL    = 30 * 60 * 1000; // 30 minutes
const LS_MAX_KEYS = 60;

function lsGet(key) {
    try {
        const raw = localStorage.getItem(LS_PREFIX + key);
        if (!raw) return null;
        const { data, expiresAt } = JSON.parse(raw);
        if (Date.now() > expiresAt) { localStorage.removeItem(LS_PREFIX + key); return null; }
        return data;
    } catch { return null; }
}

function lsSet(key, data) {
    try {
        localStorage.setItem(LS_PREFIX + key, JSON.stringify({ data, expiresAt: Date.now() + LS_TTL }));
        // Prune oldest entries when we exceed the cap
        const allKeys = Object.keys(localStorage).filter(k => k.startsWith(LS_PREFIX));
        if (allKeys.length > LS_MAX_KEYS) {
            // Remove the oldest half of stale entries, or just the first ones
            allKeys.slice(0, allKeys.length - LS_MAX_KEYS).forEach(k => localStorage.removeItem(k));
        }
    } catch { /* quota exceeded — fail silently */ }
}

// Module-level in-memory layer (still useful within single session for speed)
const memCache = new Map();

function cacheGet(key) {
    const mem = memCache.get(key);
    if (mem && mem.expiresAt > Date.now()) return mem.data;
    return lsGet(key);
}

function cacheSet(key, data) {
    memCache.set(key, { data, expiresAt: Date.now() + LS_TTL });
    if (memCache.size > 60) {
        const firstKey = memCache.keys().next().value;
        memCache.delete(firstKey);
    }
    lsSet(key, data);
}

// ── POI Layer ─────────────────────────────────────────────────────────────────
function POILayer({ onPoiSelect, activeCategory }) {
    const map = useMap();
    const [allPois, setAllPois] = useState([]);   // raw fetched list
    const [pois, setPois] = useState([]);          // filtered for display
    const fetchTimerRef = useRef(null);

    // Re-filter whenever active category or raw data changes
    useEffect(() => {
        setPois(filterPois(allPois, activeCategory, map.getZoom()));
    }, [allPois, activeCategory]); // eslint-disable-line react-hooks/exhaustive-deps

    function filterPois(data, category, zoom) {
        let filtered = data;
        if (category && category !== "all") {
            filtered = data.filter(p => p.type === category);
        } else {
            // zoom-based fallback when showing all
            if (zoom < 16) {
                filtered = data.filter(p => (POI_CONFIG[p.type] || POI_CONFIG.poi).major);
            }
        }
        return filtered;
    }

    const fetchPOIs = useCallback(async () => {
        const currentZoom = map.getZoom();
        if (currentZoom < 14) {
            setAllPois([]);
            return;
        }

        const bounds = map.getBounds();
        const south = bounds.getSouth().toFixed(4);
        const west  = bounds.getWest().toFixed(4);
        const north = bounds.getNorth().toFixed(4);
        const east  = bounds.getEast().toFixed(4);
        const bbox  = `${south},${west},${north},${east}`;

        // Use "all" when fetching so we cache the full dataset once per bbox;
        // filtering is done client-side in filterPois().
        const cacheKey = `${bbox}|all`;
        const cached = cacheGet(cacheKey);
        if (cached) {
            setAllPois(cached);
            return;
        }

        try {
            const res = await fetch(`/api/places?bbox=${bbox}`);
            if (!res.ok) return;
            const data = await res.json();
            cacheSet(cacheKey, data);
            setAllPois(data);
        } catch (_) {
            // fail silently — POIs are optional
        }
    }, [map]);

    // Debounce map move / zoom events
    useMapEvents({
        moveend: () => {
            clearTimeout(fetchTimerRef.current);
            fetchTimerRef.current = setTimeout(fetchPOIs, 500);
        },
        zoomend: () => {
            clearTimeout(fetchTimerRef.current);
            fetchTimerRef.current = setTimeout(fetchPOIs, 400);
            // Re-filter immediately on zoom (no network needed)
            setPois(filterPois(allPois, activeCategory, map.getZoom()));
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
                        <div style={{ minWidth: "160px" }}>
                            <div style={{ fontSize: "14px", fontWeight: 700, color: "#f1f0f7", marginBottom: "2px", lineHeight: 1.3 }}>
                                {poi.name}
                            </div>
                            <div style={{ fontSize: "11px", color: "#a1a0b0", textTransform: "capitalize", marginBottom: "8px" }}>
                                {poi.type?.replace("_", " ")}
                            </div>
                            <button
                                onClick={() => onPoiSelect?.(poi)}
                                style={{
                                    fontSize: "12px",
                                    fontWeight: 600,
                                    color: "#a78bfa",
                                    background: "none",
                                    border: "none",
                                    padding: 0,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                }}
                                onMouseEnter={e => e.currentTarget.style.color = "#c4b5fd"}
                                onMouseLeave={e => e.currentTarget.style.color = "#a78bfa"}
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
export default function NavigationMap({ startPos, endPos, routeData, onPoiSelect, activeCategory = "all" }) {
    const defaultCenter = [23.0225, 72.5714]; // Ahmedabad

    return (
        <div className="w-full h-full rounded-2xl overflow-hidden border border-border shadow-inner relative z-0">
            {/* Inject dark-theme popup styles */}
            <style dangerouslySetInnerHTML={{ __html: POPUP_STYLES }} />
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
                <POILayer onPoiSelect={onPoiSelect} activeCategory={activeCategory} />

                {/* Start Marker */}
                {startPos && (
                    <Marker position={[startPos.lat, startPos.lng]} icon={startIcon}>
                        <Popup>
                            <div>
                                <div style={{ fontSize: "12px", fontWeight: 700, color: "#4ade80", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                    Start
                                </div>
                                <div style={{ fontSize: "13px", color: "#f1f0f7", fontWeight: 500 }}>
                                    {startPos.label || `${startPos.lat.toFixed(4)}, ${startPos.lng.toFixed(4)}`}
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                )}

                {/* End Marker */}
                {endPos && (
                    <Marker position={[endPos.lat, endPos.lng]} icon={endIcon}>
                        <Popup>
                            <div>
                                <div style={{ fontSize: "12px", fontWeight: 700, color: "#f87171", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                    Destination
                                </div>
                                <div style={{ fontSize: "13px", color: "#f1f0f7", fontWeight: 500 }}>
                                    {endPos.label || `${endPos.lat.toFixed(4)}, ${endPos.lng.toFixed(4)}`}
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                )}
            </MapContainer>
        </div>
    );
}
