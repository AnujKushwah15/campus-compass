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
 * start/end markers, an animated route polyline, and POI markers.
 *
 * Props are identical to NavigationMap so the parent can swap seamlessly.
 *
 * @param {Object}   props
 * @param {Object}   props.startPos      – { lat, lng, label }
 * @param {Object}   props.endPos        – { lat, lng, label }
 * @param {Object}   props.routeData     – { geometry, … }
 * @param {Function} props.onPoiSelect   – callback when a POI is clicked
 * @param {string}   props.activeCategory– category filter key
 * @param {Function} props.onInitError   – called when Ola Maps SDK fails to init (triggers fallback)
 */
export default function OlaNavigationMap({
    startPos,
    endPos,
    routeData,
    onPoiSelect,
    activeCategory = "all",
    onInitError,
}) {
    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const markersRef = useRef([]);
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
                    pitch: 0, // Force 2D
                    bearing: 0,
                    transformRequest: (url, resourceType) => {
                        if (url.includes("api.olamaps.io")) {
                            const urlObj = new URL(url);
                            urlObj.searchParams.set("api_key", OLA_API_KEY);
                            return { url: urlObj.toString() };
                        }
                        return { url };
                    },
                });

                if (cancelled) return;

                // Wait for map to fully load before setting ready
                map.on("load", () => {
                    if (!cancelled) {
                        // Remove problematic 3D layers if they exist
                        if (map.getLayer("3d_model_data")) {
                            map.removeLayer("3d_model_data");
                        }
                        
                        mapRef.current = map;
                        setReady(true);
                    }
                });

                // Handle missing images (like "ola-mbo") to prevent console clutter
                map.on("styleimagemissing", (e) => {
                    const id = e.id;
                    const canvas = document.createElement("canvas");
                    canvas.width = 1;
                    canvas.height = 1;
                    const ctx = canvas.getContext("2d");
                    const imageData = ctx.getImageData(0, 0, 1, 1);
                    map.addImage(id, imageData);
                });

                // Also handle errors after init (e.g. tile loading quota errors)
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

    // ── Helper: clear all existing markers ───────────────────────────────────
    const clearMarkers = useCallback(() => {
        markersRef.current.forEach((m) => {
            try { m.remove(); } catch (_) {}
        });
        markersRef.current = [];
    }, []);

    // ── Helper: create a pin-shaped HTML element for markers ─────────────────
    const createPinEl = useCallback((color, letter) => {
        const el = document.createElement("div");
        el.innerHTML = `
            <div style="
                display:flex; flex-direction:column; align-items:center;
                animation: markerDrop 0.45s cubic-bezier(0.34,1.56,0.64,1) both;">
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
            </div>`;
        el.style.cursor = "pointer";
        return el;
    }, []);

    // ── Update markers when positions change ─────────────────────────────────
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !ready) return;

        clearMarkers();

        // MapLibre Marker via the underlying maplibregl that Ola Maps exposes
        const maplibregl = window.maplibregl || window.mapboxgl;
        if (!maplibregl) return;

        if (startPos) {
            const el = createPinEl("#22c55e", "A");
            const marker = new maplibregl.Marker({ element: el })
                .setLngLat([startPos.lng, startPos.lat])
                .setPopup(
                    new maplibregl.Popup({ offset: 25, className: "ola-popup" }).setHTML(
                        `<div style="font-size:12px;font-weight:700;color:#4ade80;margin-bottom:3px;text-transform:uppercase;letter-spacing:0.05em;">Start</div>
                         <div style="font-size:13px;color:#333;font-weight:500;">${startPos.label || `${startPos.lat.toFixed(4)}, ${startPos.lng.toFixed(4)}`}</div>`
                    )
                )
                .addTo(map);
            markersRef.current.push(marker);
        }

        if (endPos) {
            const el = createPinEl("#ef4444", "B");
            const marker = new maplibregl.Marker({ element: el })
                .setLngLat([endPos.lng, endPos.lat])
                .setPopup(
                    new maplibregl.Popup({ offset: 25, className: "ola-popup" }).setHTML(
                        `<div style="font-size:12px;font-weight:700;color:#f87171;margin-bottom:3px;text-transform:uppercase;letter-spacing:0.05em;">Destination</div>
                         <div style="font-size:13px;color:#333;font-weight:500;">${endPos.label || `${endPos.lat.toFixed(4)}, ${endPos.lng.toFixed(4)}`}</div>`
                    )
                )
                .addTo(map);
            markersRef.current.push(marker);
        }

        // Fit bounds
        if (startPos && endPos) {
            const bounds = new maplibregl.LngLatBounds();
            bounds.extend([startPos.lng, startPos.lat]);
            bounds.extend([endPos.lng, endPos.lat]);
            map.fitBounds(bounds, { padding: 60, maxZoom: 16 });
        } else if (startPos) {
            map.flyTo({ center: [startPos.lng, startPos.lat], zoom: 14 });
        } else if (endPos) {
            map.flyTo({ center: [endPos.lng, endPos.lat], zoom: 14 });
        }
    }, [startPos, endPos, ready, clearMarkers, createPinEl]);

    // ── Draw route when routeData changes ────────────────────────────────────
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !ready) return;

        // Remove previous route layer/source if any
        if (map.getLayer("ola-route-line")) {
            map.removeLayer("ola-route-line");
        }
        if (map.getSource("ola-route")) {
            map.removeSource("ola-route");
        }

        if (!routeData?.geometry) return;

        map.addSource("ola-route", {
            type: "geojson",
            data: {
                type: "Feature",
                geometry: routeData.geometry,
            },
        });

        map.addLayer({
            id: "ola-route-line",
            type: "line",
            source: "ola-route",
            layout: {
                "line-join": "round",
                "line-cap": "round",
            },
            paint: {
                "line-color": "#8b5cf6",
                "line-width": 5,
                "line-opacity": 0.9,
            },
        });

        // Fit bounds to route geometry
        const maplibregl = window.maplibregl || window.mapboxgl;
        if (maplibregl && routeData.geometry.coordinates?.length > 0) {
            const bounds = new maplibregl.LngLatBounds();
            routeData.geometry.coordinates.forEach((coord) => bounds.extend(coord));
            map.fitBounds(bounds, { padding: 48, maxZoom: 16 });
        }
    }, [routeData, ready]);

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="w-full h-full rounded-2xl overflow-hidden border border-border shadow-inner relative z-0">
            <style dangerouslySetInnerHTML={{
                __html: `
                    @keyframes markerDrop {
                        from { opacity:0; transform:translateY(-30px) scale(0.5); }
                        to   { opacity:1; transform:translateY(0) scale(1); }
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
