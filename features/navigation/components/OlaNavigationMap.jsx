"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { OlaMaps } from "olamaps-web-sdk";

const OLA_API_KEY = process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY;
const STYLE_URL =
    "https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json";

// Suppress MapLibre's persistent 3D model error that triggers Next.js dev overlays
if (typeof window !== 'undefined') {
    const originalConsoleError = console.error;
    console.error = (...args) => {
        const has3dError = args.some(arg =>
            (typeof arg === 'string' && arg.includes('Source layer "3d_model" does not exist')) ||
            (arg instanceof Error && arg.message.includes('Source layer "3d_model" does not exist')) ||
            (arg && typeof arg === 'object' && arg.message && typeof arg.message === 'string' && arg.message.includes('Source layer "3d_model" does not exist'))
        );
        if (has3dError) return;
        originalConsoleError.apply(console, args);
    };

    const originalConsoleWarn = console.warn;
    console.warn = (...args) => {
        const has3dError = args.some(arg =>
            (typeof arg === 'string' && arg.includes('Source layer "3d_model" does not exist')) ||
            (arg instanceof Error && arg.message.includes('Source layer "3d_model" does not exist')) ||
            (arg && typeof arg === 'object' && arg.message && typeof arg.message === 'string' && arg.message.includes('Source layer "3d_model" does not exist'))
        );
        if (has3dError) return;
        originalConsoleWarn.apply(console, args);
    };
}

/**
 * OlaNavigationMap – renders an Ola Maps (MapLibre GL) map with
 * start/end markers, animated route polyline, POI markers,
 * numbered waypoint stop markers, and live bus icons from RTDB.
 *
 * @param {Object}   props.startPos        – { lat, lng, label }
 * @param {Object}   props.endPos          – { lat, lng, label }
 * @param {Object}   props.routeData       – { geometry, … }
 * @param {Function} props.onPoiSelect     – callback when a POI is clicked
 * @param {string}   props.activeCategory  – category filter key
 * @param {Array}    props.waypoints       – [{ lat, lng, label }, …] intermediate stops
 * @param {Array}    props.busLocations    – [{ id, lat, lng, speed, label }, …] live buses
 * @param {Array}    props.previewCoordinates – [{ lat, lng }, …] straight-line preview path
 * @param {Function} props.onInitError     – called when Ola Maps SDK fails to init
 */
export default function OlaNavigationMap({
    startPos,
    endPos,
    routeData,
    onPoiSelect,
    activeCategory = "all",
    onInitError,
    waypoints = [],
    busLocations = [],
    previewCoordinates = null,
}) {
    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const markersRef = useRef([]);          // start/end/waypoint markers
    const busMarkersRef = useRef({});        // busId → { marker, isOnline }
    const [ready, setReady] = useState(false);
    const [initFailed, setInitFailed] = useState(false);

    // ── Initialize ───────────────────────────────────────────────────────────
    useEffect(() => {
        if (!containerRef.current || initFailed) return;

        let cancelled = false;

        (async () => {
            try {
                const olaMaps = new OlaMaps({ apiKey: OLA_API_KEY });
                const map = await olaMaps.init({
                    style: STYLE_URL,
                    container: containerRef.current,
                    center: startPos
                        ? [startPos.lng, startPos.lat]
                        : [72.5714, 23.0225], // Ahmedabad default
                    zoom: 13,
                    pitch: 0,
                    bearing: 0,
                    transformRequest: (url) => {
                        if (url.includes("api.olamaps.io")) {
                            const urlObj = new URL(url);
                            urlObj.searchParams.set("api_key", OLA_API_KEY);
                            return { url: urlObj.toString() };
                        }
                        return { url };
                    },
                });

                if (cancelled) return;

                map.on("load", () => {
                    if (!cancelled) {
                        if (map.getLayer("3d_model_data")) {
                            map.removeLayer("3d_model_data");
                        }
                        mapRef.current = map;
                        setReady(true);
                    }
                });

                map.on("styleimagemissing", (e) => {
                    const id = e.id;
                    const canvas = document.createElement("canvas");
                    canvas.width = 1;
                    canvas.height = 1;
                    const ctx = canvas.getContext("2d");
                    const imageData = ctx.getImageData(0, 0, 1, 1);
                    map.addImage(id, imageData);
                });

                map.on("error", (e) => {
                    const status = e?.error?.status || e?.status;
                    if (status === 429 || status === 403) {
                        console.warn("[OlaMaps] Quota/auth error, falling back to OSM", e);
                        onInitError?.();
                    }
                });
            } catch (err) {
                console.warn("[OlaMaps] Init failed, falling back to OSM:", err);
                if (!cancelled) {
                    setInitFailed(true);
                    onInitError?.();
                }
            }
        })();

        return () => {
            cancelled = true;
            if (mapRef.current) {
                try { mapRef.current.remove(); } catch (_) {}
                mapRef.current = null;
            }
            setReady(false);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Helper: clear route markers (start/end/waypoints) ────────────────────
    const clearMarkers = useCallback(() => {
        markersRef.current.forEach((m) => {
            try { m.remove(); } catch (_) {}
        });
        markersRef.current = [];
    }, []);

    // ── Helper: pin-shaped HTML element ──────────────────────────────────────
    const createPinEl = useCallback((color, letter) => {
        const el = document.createElement("div");
        el.innerHTML = `
            <div style="
                display:flex; flex-direction:column; align-items:center;
                animation: markerDrop 0.45s cubic-bezier(0.34,1.56,0.64,1) both;">
              <div style="
                background:${color};width:30px;height:30px;border-radius:50% 50% 50% 0;
                transform:rotate(-45deg);border:3px solid white;
                box-shadow:0 3px 10px rgba(0,0,0,0.35);
                display:flex;align-items:center;justify-content:center;">
                <span style="transform:rotate(45deg);color:white;font-size:12px;font-weight:800;line-height:1;">
                  ${letter}
                </span>
              </div>
              <div style="width:2px;height:8px;background:${color};margin-top:-1px;border-radius:0 0 2px 2px;"></div>
            </div>`;
        el.style.cursor = "pointer";
        return el;
    }, []);

    // ── Helper: bus icon HTML element (SVG bus shape) ────────────────────────
    const createBusEl = useCallback((color = "#8b5cf6", label = "") => {
        const el = document.createElement("div");
        el.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;">
              <div style="
                position:relative;
                background:${color};
                border:2.5px solid white;
                border-radius:8px;
                width:38px;height:24px;
                box-shadow:0 4px 12px rgba(0,0,0,0.4);
                display:flex;align-items:center;justify-content:center;
                animation: markerDrop 0.4s cubic-bezier(0.34,1.56,0.64,1) both;">
                <svg width="20" height="14" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="1" y="1" width="22" height="12" rx="3" fill="white" fill-opacity="0.25"/>
                  <rect x="2" y="2" width="8" height="5" rx="1" fill="white" fill-opacity="0.6"/>
                  <rect x="14" y="2" width="8" height="5" rx="1" fill="white" fill-opacity="0.6"/>
                  <circle cx="5" cy="14" r="2" fill="white"/>
                  <circle cx="19" cy="14" r="2" fill="white"/>
                </svg>
              </div>
              ${label ? `<div style="
                margin-top:2px;
                background:${color};
                color:white;
                font-size:9px;
                font-weight:700;
                border-radius:4px;
                padding:1px 5px;
                white-space:nowrap;
                box-shadow:0 2px 6px rgba(0,0,0,0.3);
                border:1.5px solid white;
                ">${label}</div>` : ""}
            </div>`;
        return el;
    }, []);

    // ── Update route/waypoint/start/end markers ──────────────────────────────
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !ready) return;

        clearMarkers();

        const maplibregl = window.maplibregl || window.mapboxgl;
        if (!maplibregl) return;

        const addMarker = (el, lng, lat, popupHtml) => {
            const marker = new maplibregl.Marker({ element: el })
                .setLngLat([lng, lat])
                .setPopup(
                    new maplibregl.Popup({ offset: 30, className: "ola-popup" }).setHTML(popupHtml)
                )
                .addTo(map);
            markersRef.current.push(marker);
            return marker;
        };

        // Start marker
        if (startPos) {
            const el = createPinEl("#22c55e", "A");
            addMarker(el, startPos.lng, startPos.lat,
                `<div style="font-size:12px;font-weight:700;color:#4ade80;margin-bottom:3px;text-transform:uppercase;letter-spacing:0.05em;">Start</div>
                 <div style="font-size:13px;color:#333;font-weight:500;">${startPos.label || `${startPos.lat.toFixed(4)}, ${startPos.lng.toFixed(4)}`}</div>`
            );
        }

        // Numbered waypoint stop markers
        waypoints.forEach((wp, idx) => {
            if (!wp) return;
            const stopNum = idx + 1;
            const el = createPinEl("#8b5cf6", String(stopNum));
            addMarker(el, wp.lng, wp.lat,
                `<div style="font-size:12px;font-weight:700;color:#8b5cf6;margin-bottom:3px;text-transform:uppercase;letter-spacing:0.05em;">Stop ${stopNum}</div>
                 <div style="font-size:13px;color:#333;font-weight:500;">${wp.label || `${wp.lat.toFixed(4)}, ${wp.lng.toFixed(4)}`}</div>`
            );
        });

        // End marker
        if (endPos) {
            const el = createPinEl("#ef4444", "B");
            addMarker(el, endPos.lng, endPos.lat,
                `<div style="font-size:12px;font-weight:700;color:#f87171;margin-bottom:3px;text-transform:uppercase;letter-spacing:0.05em;">Destination</div>
                 <div style="font-size:13px;color:#333;font-weight:500;">${endPos.label || `${endPos.lat.toFixed(4)}, ${endPos.lng.toFixed(4)}`}</div>`
            );
        }

        // Fit bounds to ALL known points (start + waypoints even without end)
        const allKnown = [
            startPos,
            ...waypoints.filter(Boolean),
            endPos,
        ].filter(Boolean);

        if (allKnown.length >= 2) {
            const bounds = new maplibregl.LngLatBounds();
            allKnown.forEach(p => bounds.extend([p.lng, p.lat]));
            map.fitBounds(bounds, { padding: 60, maxZoom: 16 });
        } else if (allKnown.length === 1) {
            map.flyTo({ center: [allKnown[0].lng, allKnown[0].lat], zoom: 14 });
        }
    }, [startPos, endPos, waypoints, ready, clearMarkers, createPinEl]);

    // ── Draw route polyline ──────────────────────────────────────────────────
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !ready) return;

        if (map.getLayer("ola-route-line")) map.removeLayer("ola-route-line");
        if (map.getLayer("ola-route-outline")) map.removeLayer("ola-route-outline");
        if (map.getSource("ola-route")) map.removeSource("ola-route");

        if (!routeData?.geometry) return;

        map.addSource("ola-route", {
            type: "geojson",
            data: { type: "Feature", geometry: routeData.geometry },
        });

        // White outline underneath for legibility
        map.addLayer({
            id: "ola-route-outline",
            type: "line",
            source: "ola-route",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": "#ffffff", "line-width": 8, "line-opacity": 0.5 },
        });

        map.addLayer({
            id: "ola-route-line",
            type: "line",
            source: "ola-route",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": "#8b5cf6", "line-width": 5, "line-opacity": 0.95 },
        });

        // Fit to route geometry
        const maplibregl = window.maplibregl || window.mapboxgl;
        if (maplibregl && routeData.geometry.coordinates?.length > 0) {
            const bounds = new maplibregl.LngLatBounds();
            routeData.geometry.coordinates.forEach((coord) => bounds.extend(coord));
            map.fitBounds(bounds, { padding: 60, maxZoom: 16 });
        }
    }, [routeData, ready]);

    // ── Dashed preview line (straight-line connector before full route) ───────
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !ready) return;

        // Clean up old preview
        if (map.getLayer("ola-preview-line")) map.removeLayer("ola-preview-line");
        if (map.getSource("ola-preview")) map.removeSource("ola-preview");

        if (!previewCoordinates || previewCoordinates.length < 2) return;

        const geojson = {
            type: "Feature",
            geometry: {
                type: "LineString",
                coordinates: previewCoordinates.map(p => [p.lng, p.lat]),
            },
        };

        map.addSource("ola-preview", { type: "geojson", data: geojson });
        map.addLayer({
            id: "ola-preview-line",
            type: "line",
            source: "ola-preview",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: {
                "line-color": "#8b5cf6",
                "line-width": 3,
                "line-dasharray": [2, 3],
                "line-opacity": 0.65,
            },
        });
    }, [previewCoordinates, ready]);

    // ── Live bus icons from RTDB ─────────────────────────────────────────────
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !ready) return;

        const maplibregl = window.maplibregl || window.mapboxgl;
        if (!maplibregl) return;

        const incomingIds = new Set(busLocations.map(b => b.id));

        // Remove stale bus markers
        Object.keys(busMarkersRef.current).forEach(id => {
            if (!incomingIds.has(id)) {
                try { busMarkersRef.current[id].remove(); } catch (_) {}
                delete busMarkersRef.current[id];
            }
        });

        // Add/update bus markers
        busLocations.forEach(bus => {
            const { id, lat, lng, speed = 0, label } = bus;
            const displayLabel = label || `Bus ${id}`;
            const color = "#8b5cf6";

            if (busMarkersRef.current[id]) {
                busMarkersRef.current[id].setLngLat([lng, lat]);
                const popup = busMarkersRef.current[id].getPopup();
                if (popup) {
                    popup.setHTML(buildBusPopup(displayLabel, speed));
                }
            } else {
                const el = createBusEl(color, displayLabel);
                const marker = new maplibregl.Marker({ element: el })
                    .setLngLat([lng, lat])
                    .setPopup(
                        new maplibregl.Popup({ offset: 30, className: "ola-popup" })
                            .setHTML(buildBusPopup(displayLabel, speed))
                    )
                    .addTo(map);
                busMarkersRef.current[id] = marker;
            }
        });
    }, [busLocations, ready, createBusEl]);

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="w-full h-full rounded-2xl overflow-hidden border border-border shadow-inner relative z-0">
            <style dangerouslySetInnerHTML={{
                __html: `
                    @keyframes markerDrop {
                        from { opacity:0; transform:translateY(-30px) scale(0.5); }
                        to   { opacity:1; transform:translateY(0) scale(1); }
                    }
                    .ola-popup .maplibregl-popup-content {
                        background: #1e1b2e !important;
                        color: #f1f0f7 !important;
                        border: 1px solid rgba(139,92,246,0.3) !important;
                        border-radius: 10px !important;
                        padding: 10px 13px !important;
                        box-shadow: 0 8px 24px rgba(0,0,0,0.5) !important;
                    }
                    .ola-popup .maplibregl-popup-tip {
                        border-top-color: #1e1b2e !important;
                    }
                `,
            }} />
            <div
                ref={containerRef}
                style={{ width: "100%", height: "100%" }}
            />
            {!ready && !initFailed && (
                <div className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-sm rounded-2xl">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-3 border-cc-purple-500/30 border-t-cc-purple-500 rounded-full animate-spin" />
                        <span className="text-sm text-muted-foreground font-medium">
                            Loading Ola Maps…
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

function buildBusPopup(label, speed) {
    return `
        <div style="min-width:120px;">
            <div style="font-size:13px;font-weight:700;color:#a78bfa;margin-bottom:4px;">🚍 ${label}</div>
            <div style="font-size:11px;color:#a1a0b0;">Speed: <span style="color:#f1f0f7;font-weight:600;">${speed} km/h</span></div>
        </div>
    `;
}
