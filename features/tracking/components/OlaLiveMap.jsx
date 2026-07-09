"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { OlaMaps } from "olamaps-web-sdk";

const OLA_API_KEY = process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY;
const STYLE_URL =
    "https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json";

// Suppress MapLibre's persistent 3D model error in Next.js dev overlay
if (typeof window !== "undefined") {
    const _ce = console.error;
    console.error = (...args) => {
        if (args.some(a => typeof a === "string" && a.includes('Source layer "3d_model" does not exist'))) return;
        _ce.apply(console, args);
    };
    const _cw = console.warn;
    console.warn = (...args) => {
        if (args.some(a => typeof a === "string" && a.includes('Source layer "3d_model" does not exist'))) return;
        _cw.apply(console, args);
    };
}

// ── Custom marker element builders ───────────────────────────────────────────

/**
 * Build an animated live-bus marker element.
 * @param {string} color   - hex colour for the bus chip
 * @param {string} label   - text shown below the chip (e.g. "Bus-1")
 * @param {number} speed   - km/h shown inside the chip
 * @param {boolean} isLive - whether to show the pulse ring
 */
function createBusElement(color = "#8b5cf6", label = "", speed = 0, isLive = true) {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "display:flex;flex-direction:column;align-items:center;cursor:pointer;";

    // Pulse ring (live indicator) — sits behind the chip
    const pulseRing = document.createElement("div");
    pulseRing.style.cssText = `
        position:absolute;
        width:54px;height:28px;
        border-radius:10px;
        background:${color};
        opacity:${isLive ? 0.35 : 0};
        animation:${isLive ? "busPulse 1.8s ease-in-out infinite" : "none"};
        pointer-events:none;
        top:0;left:50%;transform:translateX(-50%);
    `;

    // Bus chip
    const chip = document.createElement("div");
    chip.style.cssText = `
        position:relative;
        background:${color};
        border:2.5px solid white;
        border-radius:9px;
        width:48px;height:28px;
        box-shadow:0 4px 18px rgba(0,0,0,0.45);
        display:flex;align-items:center;justify-content:center;gap:3px;
        animation:busPop 0.45s cubic-bezier(0.34,1.56,0.64,1) both;
        z-index:1;
    `;
    chip.innerHTML = `
        <svg width="20" height="13" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="1" y="1" width="22" height="11" rx="3" fill="white" fill-opacity="0.22"/>
          <rect x="2" y="2" width="8" height="5" rx="1" fill="white" fill-opacity="0.65"/>
          <rect x="14" y="2" width="8" height="5" rx="1" fill="white" fill-opacity="0.65"/>
          <circle cx="5" cy="14" r="2" fill="white"/>
          <circle cx="19" cy="14" r="2" fill="white"/>
        </svg>
    `;

    // Connector stem
    const stem = document.createElement("div");
    stem.style.cssText = `
        width:2px;height:6px;
        background:${color};
        border-radius:0 0 2px 2px;
        opacity:0.8;
    `;

    // Label badge
    const badge = document.createElement("div");
    badge.setAttribute("data-bus-label", "true");
    badge.style.cssText = `
        background:${color};
        color:white;
        font-size:9px;font-weight:700;
        border-radius:5px;
        padding:2px 7px;
        white-space:nowrap;
        box-shadow:0 2px 8px rgba(0,0,0,0.35);
        border:1.5px solid rgba(255,255,255,0.6);
        letter-spacing:0.04em;
        margin-top:1px;
        min-width:48px;
        text-align:center;
    `;
    badge.textContent = speed > 0 ? `${label} · ${Math.round(speed)} km/h` : label;

    wrapper.appendChild(pulseRing);
    wrapper.appendChild(chip);
    wrapper.appendChild(stem);
    if (label) wrapper.appendChild(badge);

    return wrapper;
}

/**
 * Build a simple pin element (for stops and student location).
 */
function createPinElement(color, emoji) {
    const el = document.createElement("div");
    el.style.cssText = "display:flex;flex-direction:column;align-items:center;";
    el.innerHTML = `
        <div style="
            background:${color};width:32px;height:32px;border-radius:50%;
            border:3px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.35);
            display:flex;align-items:center;justify-content:center;font-size:15px;">
            ${emoji}
        </div>
        <div style="width:2px;height:5px;background:${color};opacity:0.6;border-radius:0 0 2px 2px;"></div>
    `;
    return el;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function OlaLiveMap({ busLocation, busLocations = [], stops = [], studentLocation, busLabel = "", onInitError }) {
    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const olaMapsRef = useRef(null);          // OlaMaps instance (for addMarker API)
    const busMarkersRef = useRef({});          // { id: { marker, el } }
    const stopMarkersRef = useRef([]);
    const studentMarkerRef = useRef(null);
    const initialFlyDoneRef = useRef(false);   // fly to bus only on first location fix
    const [ready, setReady] = useState(false);
    const [initFailed, setInitFailed] = useState(false);

    // ── 1. Initialize map ────────────────────────────────────────────────────
    useEffect(() => {
        if (!containerRef.current || initFailed) return;
        let cancelled = false;

        (async () => {
            try {
                const olaMaps = new OlaMaps({ apiKey: OLA_API_KEY });
                olaMapsRef.current = olaMaps;

                const startCenter = busLocation
                    ? [busLocation.lng, busLocation.lat]
                    : (busLocations?.length > 0 ? [busLocations[0].lng, busLocations[0].lat] : [72.5714, 23.0225]);

                const map = await olaMaps.init({
                    style: STYLE_URL,
                    container: containerRef.current,
                    center: startCenter,
                    zoom: 14,
                    pitch: 0,
                    bearing: 0,
                    transformRequest: (url) => {
                        if (url.includes("api.olamaps.io")) {
                            const u = new URL(url);
                            u.searchParams.set("api_key", OLA_API_KEY);
                            return { url: u.toString() };
                        }
                        return { url };
                    },
                });

                if (cancelled) return;

                map.on("load", () => {
                    if (cancelled) return;
                    // Remove problematic 3D layer if present
                    if (map.getLayer("3d_model_data")) map.removeLayer("3d_model_data");
                    mapRef.current = map;
                    setReady(true);
                });

                // Suppress missing image errors (ola-mbo icon etc.)
                map.on("styleimagemissing", (e) => {
                    const canvas = document.createElement("canvas");
                    canvas.width = 1; canvas.height = 1;
                    map.addImage(e.id, canvas.getContext("2d").getImageData(0, 0, 1, 1));
                });

                map.on("error", (e) => {
                    const status = e?.error?.status || e?.status;
                    if (status === 429 || status === 403) onInitError?.();
                });
            } catch (err) {
                if (!cancelled) { setInitFailed(true); onInitError?.(); }
            }
        })();

        return () => {
            cancelled = true;
            if (mapRef.current) {
                try { mapRef.current.remove(); } catch (_) {}
                mapRef.current = null;
            }
            busMarkersRef.current = {};
            stopMarkersRef.current = [];
            studentMarkerRef.current = null;
            initialFlyDoneRef.current = false;
            setReady(false);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── 2. Real-time bus marker update ───────────────────────────────────────
    // Runs whenever busLocation or busLocations changes (i.e. every RTDB push).
    // Uses olaMaps.addMarker() — the official Ola Maps JS API for web.
    useEffect(() => {
        const map = mapRef.current;
        const olaMaps = olaMapsRef.current;
        if (!map || !ready || !olaMaps) return;

        // Build the list of buses to render
        const busesToDraw = busLocations?.length > 0
            ? busLocations
            : (busLocation ? [{ ...busLocation, id: "primary" }] : []);

        const activeIds = new Set(busesToDraw.map((b, i) => b.id || `bus-${i}`));

        // Remove markers for buses that are no longer in the list
        Object.keys(busMarkersRef.current).forEach(id => {
            if (!activeIds.has(id)) {
                busMarkersRef.current[id].marker.remove();
                delete busMarkersRef.current[id];
            }
        });

        busesToDraw.forEach((bus, i) => {
            const id = bus.id || `bus-${i}`;
            // Primary tracked bus is always purple; others green
            const isTracked = busLocation && (id === "primary" || (busLocation.lat === bus.lat && busLocation.lng === bus.lng));
            const color = isTracked ? "#8b5cf6" : "#22c55e";
            // Use explicit busLabel for single-bus mode (driver/parent/student),
            // fall back to the per-entry label in multi-bus mode (admin fleet map)
            const labelText = busLabel || bus.label || (id === "primary" ? "Bus" : `Bus ${id}`);
            const speed = bus.speed ?? 0;

            if (busMarkersRef.current[id]) {
                // ── Already exists: just move it (smooth RTDB update) ──────
                const { marker, el } = busMarkersRef.current[id];
                marker.setLngLat([bus.lng, bus.lat]);

                // Update speed badge text without rebuilding the whole element
                const badge = el.querySelector("[data-bus-label]");
                if (badge) {
                    badge.textContent = speed > 0 ? `${labelText} · ${Math.round(speed)} km/h` : labelText;
                }
            } else {
                // ── New marker: create via olaMaps.addMarker() ─────────────
                const el = createBusElement(color, labelText, speed, isTracked);

                // olaMaps.addMarker({ element }) — official Ola Maps web API
                // equivalent to new maplibregl.Marker({ element })
                const marker = olaMaps.addMarker({ element: el })
                    .setLngLat([bus.lng, bus.lat])
                    .setPopup(
                        olaMaps.addPopup({ offset: [0, -38], closeButton: false }).setHTML(`
                            <div style="font-size:12px;font-weight:700;color:${color};margin-bottom:3px;">🚍 ${labelText}</div>
                            <div style="font-size:11px;color:#555;">Speed: <b>${Math.round(speed)} km/h</b></div>
                            ${bus.accuracy ? `<div style="font-size:10px;color:#999;">Accuracy: ±${Math.round(bus.accuracy)}m</div>` : ""}
                        `)
                    )
                    .addTo(map);

                busMarkersRef.current[id] = { marker, el };
            }
        });

        // ── Camera: fly to primary bus on first location fix, then just follow ──
        if (busLocation) {
            if (!initialFlyDoneRef.current) {
                map.flyTo({ center: [busLocation.lng, busLocation.lat], zoom: 15, speed: 1.2, curve: 1.4 });
                initialFlyDoneRef.current = true;
            } else if (busesToDraw.length === 1) {
                // Gentle pan (no zoom change) on subsequent real-time ticks
                map.easeTo({ center: [busLocation.lng, busLocation.lat], duration: 800, easing: t => t });
            }
        }

        // Multi-bus fleet view: fit all buses in frame
        if (busesToDraw.length > 1) {
            const lats = busesToDraw.map(b => b.lat);
            const lngs = busesToDraw.map(b => b.lng);
            map.fitBounds(
                [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
                { padding: 60, duration: 1200 }
            );
        }
    }, [busLocation, busLocations, ready]);

    // ── 3. Stop markers (rendered once) ──────────────────────────────────────
    useEffect(() => {
        const map = mapRef.current;
        const olaMaps = olaMapsRef.current;
        if (!map || !ready || !olaMaps || stopMarkersRef.current.length > 0) return;

        stops?.forEach((stop, idx) => {
            if (!stop.lat || !stop.lng) return;
            const el = createPinElement("#ef4444", "📍");
            olaMaps.addMarker({ element: el })
                .setLngLat([stop.lng, stop.lat])
                .setPopup(olaMaps.addPopup({ offset: [0, -30] }).setHTML(`<b>${stop.name || `Stop ${idx + 1}`}</b>`))
                .addTo(map);
            stopMarkersRef.current.push(true); // just track that we've drawn them
        });
    }, [stops, ready]);

    // ── 4. Student location marker ────────────────────────────────────────────
    useEffect(() => {
        const map = mapRef.current;
        const olaMaps = olaMapsRef.current;
        if (!map || !ready || !olaMaps) return;
        if (!studentLocation?.lat || !studentLocation?.lng) return;

        if (!studentMarkerRef.current) {
            const el = createPinElement("#3b82f6", "👨‍🎓");
            studentMarkerRef.current = olaMaps.addMarker({ element: el })
                .setLngLat([studentLocation.lng, studentLocation.lat])
                .setPopup(olaMaps.addPopup({ offset: [0, -30] }).setHTML("<b>Your Location</b>"))
                .addTo(map);
        } else {
            studentMarkerRef.current.setLngLat([studentLocation.lng, studentLocation.lat]);
        }
    }, [studentLocation, ready]);

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="w-full h-full rounded-2xl overflow-hidden border border-border bg-muted relative">
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes busPop {
                    from { opacity:0; transform:scale(0.3) translateY(-8px); }
                    to   { opacity:1; transform:scale(1)   translateY(0);    }
                }
                @keyframes busPulse {
                    0%,100% { transform:translateX(-50%) scale(1);   opacity:0.35; }
                    50%     { transform:translateX(-50%) scale(1.55); opacity:0;    }
                }
            `}} />
            <div ref={containerRef} className="w-full h-full" />
            {!ready && !initFailed && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/80 backdrop-blur-sm gap-3">
                    <div className="w-9 h-9 border-[3px] border-cc-purple-500/30 border-t-cc-purple-500 rounded-full animate-spin" />
                    <p className="text-xs text-muted-foreground font-medium">Loading Map…</p>
                </div>
            )}
        </div>
    );
}
