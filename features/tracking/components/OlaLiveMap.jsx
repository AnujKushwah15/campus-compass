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

export default function OlaLiveMap({ busLocation, busLocations = [], stops = [], onInitError }) {
    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const busMarkersRef = useRef({});
    const stopMarkersRef = useRef([]);
    const [ready, setReady] = useState(false);
    const [initFailed, setInitFailed] = useState(false);

    // Initialize Map
    useEffect(() => {
        if (!containerRef.current || initFailed) return;
        let cancelled = false;

        (async () => {
            try {
                const olaMaps = new OlaMaps({ apiKey: OLA_API_KEY });
                
                // Determine initial center
                let startCenter = [72.5714, 23.0225];
                if (busLocation) {
                    startCenter = [busLocation.lng, busLocation.lat];
                } else if (busLocations?.length > 0) {
                    startCenter = [busLocations[0].lng, busLocations[0].lat];
                }

                const map = await olaMaps.init({
                    style: STYLE_URL,
                    container: containerRef.current,
                    center: startCenter,
                    zoom: 14,
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

                map.on("error", (e) => {
                    const status = e?.error?.status || e?.status;
                    if (status === 429 || status === 403) {
                        onInitError?.();
                    }
                });
            } catch (err) {
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

    // Create Pin Helper
    const createPinEl = useCallback((color, iconEmoji) => {
        const el = document.createElement("div");
        el.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center;">
              <div style="
                background:${color};width:32px;height:32px;border-radius:50%;
                border:3px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.35);
                display:flex;align-items:center;justify-content:center;font-size:16px;">
                ${iconEmoji}
              </div>
            </div>`;
        return el;
    }, []);

    // Update markers and center on bus location
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !ready) return;

        const maplibregl = window.maplibregl || window.mapboxgl;
        if (!maplibregl) return;

        // Draw stops (once)
        if (stopMarkersRef.current.length === 0 && stops && stops.length > 0) {
            stops.forEach(stop => {
                const el = createPinEl("#ef4444", "📍");
                const marker = new maplibregl.Marker({ element: el })
                    .setLngLat([stop.lng, stop.lat])
                    .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(`<b>${stop.name}</b>`))
                    .addTo(map);
                stopMarkersRef.current.push(marker);
            });
        }

        // Draw or update bus markers
        const busesToDraw = busLocations?.length > 0 ? busLocations : (busLocation ? [busLocation] : []);
        const newIds = new Set(busesToDraw.map((b, i) => b.id || `bus-${i}`));
        
        // Remove old markers that are no longer in the list
        Object.keys(busMarkersRef.current).forEach(id => {
            if (!newIds.has(id)) {
                busMarkersRef.current[id].marker.remove();
                delete busMarkersRef.current[id];
            }
        });

        // Add or update markers
        busesToDraw.forEach((bus, i) => {
            const id = bus.id || `bus-${i}`;
            const isSelected = busLocation && busLocation.lat === bus.lat && busLocation.lng === bus.lng;
            const color = isSelected ? "#8b5cf6" : "#4ade80"; // Purple for selected, green for others
            const label = bus.label || `Bus ${id}`;
            
            // If marker exists but needs a color change (selection changed), we recreate it
            if (busMarkersRef.current[id] && busMarkersRef.current[id].isSelected !== isSelected) {
                busMarkersRef.current[id].marker.remove();
                delete busMarkersRef.current[id];
            }
            
            if (!busMarkersRef.current[id]) {
                const el = createPinEl(color, "🚍");
                const marker = new maplibregl.Marker({ element: el })
                    .setLngLat([bus.lng, bus.lat])
                    .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(
                        `<b style="color:${color}">${label}</b><br>Speed: ${bus.speed || 0} km/h`
                    ))
                    .addTo(map);
                busMarkersRef.current[id] = { marker, isSelected };
            } else {
                busMarkersRef.current[id].marker.setLngLat([bus.lng, bus.lat]);
                const popup = busMarkersRef.current[id].marker.getPopup();
                if (popup) {
                    popup.setHTML(`<b style="color:${color}">${label}</b><br>Speed: ${bus.speed || 0} km/h`);
                }
            }
        });

        // Fly to single bus or fit bounds to all
        if (busesToDraw.length > 1) {
            const lats = busesToDraw.map(b => b.lat);
            const lngs = busesToDraw.map(b => b.lng);
            const bounds = [
                [Math.min(...lngs), Math.min(...lats)], // sw
                [Math.max(...lngs), Math.max(...lats)]  // ne
            ];
            map.fitBounds(bounds, { padding: 50, duration: 1500 });
        } else if (busesToDraw.length === 1 && busLocation) {
            // Only fly if there's a specific selected bus
            map.flyTo({ center: [busLocation.lng, busLocation.lat], zoom: 15, speed: 0.8 });
        }
    }, [busLocation, busLocations, stops, ready, createPinEl]);

    return (
        <div className="w-full h-full rounded-2xl overflow-hidden border border-border bg-muted relative">
            <div ref={containerRef} className="w-full h-full" />
            {!ready && !initFailed && (
                <div className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-sm">
                    <div className="w-8 h-8 border-3 border-cc-purple-500/30 border-t-cc-purple-500 rounded-full animate-spin" />
                </div>
            )}
        </div>
    );
}
