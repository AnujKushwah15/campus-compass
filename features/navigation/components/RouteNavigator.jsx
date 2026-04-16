"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import PlaceSearch from "./PlaceSearch";
import dynamic from "next/dynamic";
import { POI_CONFIG } from "./NavigationMap";
import {
    Navigation, Clock, Route, ArrowRight, RotateCcw,
    ChevronDown, ChevronUp, ArrowLeft, CornerUpLeft, CornerUpRight,
    ArrowUp, Car, Layers, Plus, X, Bus, Check, MapPin, GripVertical
} from "lucide-react";
import Link from "next/link";
import { db, rtdb } from "@/lib/firebase";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { ref, onValue } from "firebase/database";

// Dynamic import for the map provider toggle (Ola Maps → OSM fallback)
const MapProviderToggle = dynamic(() => import("./MapProviderToggle"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-card rounded-2xl text-muted-foreground animate-pulse">
            Loading Map...
        </div>
    ),
});

function formatDuration(seconds) {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${remMins}m`;
}

function formatDistance(meters) {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
}

// Step icon by maneuver type
function StepIcon({ instruction }) {
    const i = instruction?.toLowerCase() || "";
    if (i.includes("left")) return <CornerUpLeft className="w-3.5 h-3.5 shrink-0 text-cc-purple-500" />;
    if (i.includes("right")) return <CornerUpRight className="w-3.5 h-3.5 shrink-0 text-cc-purple-500" />;
    return <ArrowUp className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />;
}

// Route cache keyed by rounded coordinates + waypoints
const routeCache = new Map();

function makeRouteCacheKey(s, e, waypoints) {
    const wpKey = waypoints.map(w => `${w.lat.toFixed(4)},${w.lng.toFixed(4)}`).join("|");
    return `${s.lat.toFixed(4)},${s.lng.toFixed(4)}→${wpKey ? wpKey + "→" : ""}${e.lat.toFixed(4)},${e.lng.toFixed(4)}`;
}

export default function RouteNavigator() {
    const [startPos, setStartPos] = useState(null);
    const [endPos, setEndPos] = useState(null);
    const [waypoints, setWaypoints] = useState([]); // intermediate stops [{lat,lng,label}]
    const [routeData, setRouteData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showSteps, setShowSteps] = useState(false);
    const [geoLoading, setGeoLoading] = useState(false);
    const [swapRotate, setSwapRotate] = useState(false);
    const [activeCategory, setActiveCategory] = useState("all");

    // Bus assignment state
    const [buses, setBuses] = useState([]);
    const [selectedBusId, setSelectedBusId] = useState("");
    const [assigning, setAssigning] = useState(false);
    const [assignSuccess, setAssignSuccess] = useState(false);

    // Real-time bus locations from RTDB
    const [busLocations, setBusLocations] = useState([]);

    // ── Category filter config ───────────────────────────────────────────────
    const CATEGORIES = [
        { key: "all",       emoji: "🗺️",  label: "All" },
        { key: "hospital",  emoji: POI_CONFIG.hospital.emoji,   label: POI_CONFIG.hospital.label },
        { key: "education", emoji: POI_CONFIG.education.emoji,  label: POI_CONFIG.education.label },
        { key: "bus_stop",  emoji: POI_CONFIG.bus_stop.emoji,   label: POI_CONFIG.bus_stop.label },
        { key: "bank",      emoji: POI_CONFIG.bank.emoji,       label: POI_CONFIG.bank.label },
        { key: "restaurant",emoji: POI_CONFIG.restaurant.emoji, label: POI_CONFIG.restaurant.label },
        { key: "pharmacy",  emoji: POI_CONFIG.pharmacy.emoji,   label: POI_CONFIG.pharmacy.label },
        { key: "fuel",      emoji: POI_CONFIG.fuel.emoji,       label: POI_CONFIG.fuel.label },
        { key: "shop",      emoji: POI_CONFIG.shop.emoji,       label: POI_CONFIG.shop.label },
        { key: "attraction",emoji: POI_CONFIG.attraction.emoji, label: POI_CONFIG.attraction.label },
        { key: "police",    emoji: POI_CONFIG.police.emoji,     label: POI_CONFIG.police.label },
    ];

    const destinationRef = useRef(null);
    const autoTriggeredKey = useRef(null);

    // ── Load buses from Firestore ────────────────────────────────────────────
    useEffect(() => {
        const unsub = onSnapshot(collection(db, "buses"), (snap) => {
            setBuses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, []);

    // ── Real-time bus locations from RTDB ────────────────────────────────────
    useEffect(() => {
        const busesRef = ref(rtdb, "buses");
        const unsub = onValue(busesRef, (snapshot) => {
            const data = snapshot.val();
            if (!data) { setBusLocations([]); return; }
            const locs = Object.entries(data)
                .filter(([, bd]) => bd?.location?.lat && bd?.location?.lng)
                .map(([busId, bd]) => ({
                    id: busId,
                    lat: bd.location.lat,
                    lng: bd.location.lng,
                    speed: bd.location.speed || 0,
                    label: `Bus ${busId}`,
                }));
            setBusLocations(locs);
        });
        return () => unsub();
    }, []);

    // ── Auto-fill start from geolocation on mount ────────────────────────────
    useEffect(() => {
        if (!navigator.geolocation) return;
        setGeoLoading(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setStartPos({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    label: "My Location",
                });
                setGeoLoading(false);
                setTimeout(() => destinationRef.current?.focus(), 300);
            },
            () => setGeoLoading(false),
            { timeout: 5000, maximumAge: 30000 }
        );
    }, []);

    // ── Find route (supports waypoints) ─────────────────────────────────────
    const findRoute = useCallback(async (start, end, wps = []) => {
        if (!start || !end) return;

        const cacheKey = makeRouteCacheKey(start, end, wps);
        if (autoTriggeredKey.current === cacheKey) return;
        autoTriggeredKey.current = cacheKey;

        if (routeCache.has(cacheKey)) {
            setRouteData(routeCache.get(cacheKey));
            setError(null);
            return;
        }

        setLoading(true);
        setError(null);
        setRouteData(null);
        setShowSteps(false);

        try {
            const params = new URLSearchParams({
                start_lat: start.lat,
                start_lng: start.lng,
                end_lat: end.lat,
                end_lng: end.lng,
            });
            if (wps.length > 0) {
                params.set("waypoints", JSON.stringify(wps.map(w => ({ lat: w.lat, lng: w.lng }))));
            }
            const res = await fetch(`/api/route?${params}`);
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Failed to find route");
                return;
            }

            routeCache.set(cacheKey, data);
            setRouteData(data);
        } catch {
            setError("Network error — could not reach routing service");
        } finally {
            setLoading(false);
        }
    }, []);

    // Trigger whenever positions or waypoints change
    useEffect(() => {
        if (startPos && endPos) {
            findRoute(startPos, endPos, waypoints);
        }
    }, [startPos, endPos, waypoints, findRoute]);

    const handleStartChange = useCallback((pos) => {
        setStartPos(pos);
        setRouteData(null);
        autoTriggeredKey.current = null;
        if (pos) setTimeout(() => destinationRef.current?.focus(), 150);
    }, []);

    const handleEndChange = useCallback((pos) => {
        setEndPos(pos);
        setRouteData(null);
        autoTriggeredKey.current = null;
    }, []);

    // Waypoint management
    const addWaypoint = () => {
        setWaypoints(prev => [...prev, null]);
    };

    const updateWaypoint = (idx, pos) => {
        setWaypoints(prev => {
            const next = [...prev];
            next[idx] = pos;
            return next;
        });
        setRouteData(null);
        autoTriggeredKey.current = null;
    };

    const removeWaypoint = (idx) => {
        setWaypoints(prev => prev.filter((_, i) => i !== idx));
        setRouteData(null);
        autoTriggeredKey.current = null;
    };

    const handleReset = () => {
        setStartPos(null);
        setEndPos(null);
        setWaypoints([]);
        setRouteData(null);
        setError(null);
        setShowSteps(false);
        autoTriggeredKey.current = null;
        setAssignSuccess(false);
        setSelectedBusId("");
    };

    const handleSwap = () => {
        setSwapRotate(true);
        setTimeout(() => setSwapRotate(false), 400);
        setStartPos(endPos);
        setEndPos(startPos);
        setRouteData(null);
        autoTriggeredKey.current = null;
    };

    // ── Assign route to bus ──────────────────────────────────────────────────
    const handleAssignRoute = async () => {
        if (!selectedBusId || !routeData) return;
        setAssigning(true);
        setAssignSuccess(false);
        try {
            // Build a route config object to save to Firestore
            const routeConfig = {
                assignedRouteData: {
                    start: startPos ? { lat: startPos.lat, lng: startPos.lng, label: startPos.label || "" } : null,
                    end: endPos ? { lat: endPos.lat, lng: endPos.lng, label: endPos.label || "" } : null,
                    waypoints: waypoints.filter(Boolean).map(w => ({ lat: w.lat, lng: w.lng, label: w.label || "" })),
                    distance_m: routeData.distance_m,
                    duration_s: routeData.duration_s,
                    assignedAt: new Date().toISOString(),
                }
            };
            await updateDoc(doc(db, "buses", selectedBusId), routeConfig);
            setAssignSuccess(true);
            setTimeout(() => setAssignSuccess(false), 3000);
        } catch (err) {
            console.error("Route assignment error:", err);
            setError("Failed to assign route. Check permissions.");
        } finally {
            setAssigning(false);
        }
    };

    // Active (non-null) waypoints for map display
    const activeWaypoints = waypoints.filter(Boolean);

    // ── Preview coordinates ──────────────────────────────────────────────────
    // Straight-line preview path between set points before a full route exists.
    // Cleared as soon as routeData is available (the real route replaces it).
    const previewCoordinates = useMemo(() => {
        if (routeData) return null; // full route is shown instead
        const pts = [];
        if (startPos) pts.push({ lat: startPos.lat, lng: startPos.lng });
        activeWaypoints.forEach(w => pts.push({ lat: w.lat, lng: w.lng }));
        if (endPos) pts.push({ lat: endPos.lat, lng: endPos.lng });
        return pts.length >= 2 ? pts : null;
    }, [startPos, endPos, activeWaypoints, routeData]);

    return (
        <div className="font-sans text-foreground bg-background min-h-screen px-4 sm:px-8 lg:px-12 xl:px-16 py-6">

            {/* Page header */}
            <header className="flex items-center justify-between gap-4 mb-6 pb-5 border-b border-border">
                <div className="flex items-center gap-3">
                    <Link
                        href="/dashboard/admin"
                        className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Back to Admin Dashboard"
                    >
                        <ArrowLeft size={22} />
                    </Link>
                    <div className="w-11 h-11 bg-gradient-to-br from-cc-purple-600 to-cc-red-600 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0">
                        <Navigation size={22} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground tracking-tight leading-tight">
                            Route <span className="text-cc-purple-500">Navigator</span>
                        </h1>
                        <p className="text-sm text-muted-foreground font-medium">
                            Plan multi-stop routes and assign them to buses
                        </p>
                    </div>
                </div>
            </header>

            {/* Loading progress bar */}
            {loading && (
                <div className="h-0.5 bg-muted rounded-full overflow-hidden mb-4 -mt-2">
                    <div className="h-full w-1/2 bg-gradient-to-r from-cc-purple-500 to-cc-purple-400 rounded-full nav-progress-sweep" />
                </div>
            )}

            {/* Main content grid */}
            <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 h-[calc(100vh-210px)] min-h-[520px]">

                {/* Left Panel */}
                <div className="flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-1">

                    {/* Search Inputs */}
                    <div className="bg-card rounded-2xl border border-border p-5 shadow-md">
                        <div className="flex items-center gap-2 mb-4">
                            <Route className="w-4 h-4 text-cc-purple-500" />
                            <span className="text-sm font-bold text-foreground tracking-tight">Plan Your Route</span>
                        </div>

                        <div className="flex flex-col gap-3">
                            {/* Start */}
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-green-500 border-2 border-white shadow shrink-0 flex items-center justify-center">
                                    <span className="text-[9px] font-black text-white">A</span>
                                </div>
                                <div className="flex-1">
                                    <PlaceSearch
                                        label="Starting Point"
                                        value={startPos}
                                        onChange={handleStartChange}
                                        placeholder="Search or use my location"
                                        isLoading={geoLoading}
                                    />
                                </div>
                            </div>

                            {/* Intermediate Stops */}
                            {waypoints.map((wp, idx) => (
                                <div key={idx} className="flex items-center gap-2 group">
                                    <div className="w-5 h-5 rounded-full bg-cc-purple-500 border-2 border-white shadow shrink-0 flex items-center justify-center">
                                        <span className="text-[9px] font-black text-white">{idx + 1}</span>
                                    </div>
                                    <div className="flex-1">
                                        <PlaceSearch
                                            label={`Stop ${idx + 1}`}
                                            value={wp}
                                            onChange={(pos) => updateWaypoint(idx, pos)}
                                            placeholder={`Intermediate stop ${idx + 1}`}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeWaypoint(idx)}
                                        className="p-1.5 rounded-lg hover:bg-cc-red-500/10 text-muted-foreground hover:text-cc-red-500 transition-all opacity-0 group-hover:opacity-100"
                                        title="Remove stop"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}

                            {/* Add Stop button */}
                            <button
                                type="button"
                                onClick={addWaypoint}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-cc-purple-500 border border-dashed border-cc-purple-500/40 hover:bg-cc-purple-500/8 hover:border-cc-purple-500 transition-all"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Add Intermediate Stop
                            </button>

                            {/* Swap button */}
                            <div className="flex justify-center">
                                <button
                                    type="button"
                                    onClick={handleSwap}
                                    disabled={!startPos && !endPos}
                                    className="p-2 rounded-full border border-cc-purple-500/30 bg-cc-purple-500/8 hover:bg-cc-purple-500/20 text-cc-purple-500 hover:text-cc-purple-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
                                    title="Swap start and end"
                                >
                                    <ArrowRight
                                        className={`w-4 h-4 rotate-90 transition-transform duration-300 ${swapRotate ? "rotate-[270deg]" : "rotate-90"}`}
                                    />
                                </button>
                            </div>

                            {/* End */}
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-red-500 border-2 border-white shadow shrink-0 flex items-center justify-center">
                                    <span className="text-[9px] font-black text-white">B</span>
                                </div>
                                <div className="flex-1">
                                    <PlaceSearch
                                        label="Destination"
                                        value={endPos}
                                        onChange={handleEndChange}
                                        placeholder="Where to?"
                                        inputRef={destinationRef}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-border my-4" />

                        {/* Action row */}
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    autoTriggeredKey.current = null;
                                    findRoute(startPos, endPos, waypoints);
                                }}
                                disabled={!startPos || !endPos || loading}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm bg-cc-purple-500/10 text-cc-purple-600 dark:text-cc-purple-400 border border-cc-purple-500/25 hover:bg-cc-purple-500 hover:text-white hover:border-cc-purple-500 active:scale-[0.98] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <span className="inline-block w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                                ) : (
                                    <Route className="w-4 h-4" />
                                )}
                                {loading ? "Finding Route…" : routeData ? "Recalculate" : "Find Route"}
                            </button>
                            <button
                                type="button"
                                onClick={handleReset}
                                className="p-2.5 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground active:scale-[0.96] transition-all"
                                title="Reset"
                            >
                                <RotateCcw className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-cc-red-50 dark:bg-cc-red-900/20 border border-cc-red-200 dark:border-cc-red-800 rounded-xl p-4 text-cc-red-600 dark:text-cc-red-200 text-sm">
                            ⚠️ {error}
                        </div>
                    )}

                    {/* Route Summary */}
                    {routeData && (
                        <div className="bg-card rounded-2xl border border-cc-purple-500/30 p-5 shadow-md animate-pop-in">

                            <div className="flex items-center gap-2 mb-4">
                                <Clock className="w-4 h-4 text-cc-purple-500" />
                                <span className="text-sm font-bold text-foreground tracking-tight">Route Summary</span>
                                {activeWaypoints.length > 0 && (
                                    <span className="ml-auto text-xs bg-cc-purple-500/10 text-cc-purple-500 px-2 py-0.5 rounded-full font-semibold border border-cc-purple-500/20">
                                        {activeWaypoints.length} stop{activeWaypoints.length > 1 ? "s" : ""}
                                    </span>
                                )}
                            </div>

                            {/* ETA hero row */}
                            <div className="flex items-center justify-between gap-3 mb-4 bg-cc-purple-500/8 dark:bg-cc-purple-500/10 rounded-xl px-4 py-3 border border-cc-purple-500/15">
                                <div>
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                                        <Car className="w-3 h-3" />
                                        <span>Driving</span>
                                    </div>
                                    <div className="text-3xl font-extrabold text-foreground leading-none tracking-tight">
                                        {formatDuration(routeData.duration_s)}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-muted-foreground mb-0.5">Distance</div>
                                    <div className="text-lg font-bold text-cc-purple-500">
                                        {formatDistance(routeData.distance_m)}
                                    </div>
                                    {routeData.steps?.length > 0 && (
                                        <div className="text-xs text-muted-foreground mt-0.5">
                                            {routeData.steps.length} steps
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* First instruction preview */}
                            {routeData.steps?.[0] && (
                                <div className="bg-muted rounded-xl px-3 py-2.5 text-xs text-foreground flex items-center gap-2.5 mb-3 border border-border">
                                    <StepIcon instruction={routeData.steps[0].instruction} />
                                    <span className="capitalize truncate font-medium">
                                        {routeData.steps[0].instruction}
                                        {routeData.steps[0].name
                                            ? <span className="text-muted-foreground font-normal"> on {routeData.steps[0].name}</span>
                                            : null
                                        }
                                    </span>
                                </div>
                            )}

                            {/* Divider */}
                            <div className="border-t border-border mb-1" />

                            {/* Turn-by-turn steps */}
                            {routeData.steps?.length > 0 && (
                                <div>
                                    <button
                                        type="button"
                                        onClick={() => setShowSteps(!showSteps)}
                                        className="w-full flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/60 text-sm transition-colors group"
                                    >
                                        <span className="font-semibold text-foreground group-hover:text-cc-purple-500 transition-colors">
                                            Turn-by-turn directions
                                        </span>
                                        {showSteps
                                            ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                            : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                        }
                                    </button>

                                    {showSteps && (
                                        <div className="mt-2 space-y-0.5 max-h-64 overflow-y-auto custom-scrollbar">
                                            {routeData.steps.map((step, i) => (
                                                <div
                                                    key={i}
                                                    className="flex gap-3 py-2 px-3 rounded-lg text-sm hover:bg-muted/50 transition-colors border-b border-border/40 last:border-0"
                                                >
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span className="text-muted-foreground font-mono text-[11px] w-5 text-right">
                                                            {i + 1}
                                                        </span>
                                                        <StepIcon instruction={step.instruction} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-foreground capitalize truncate font-medium">
                                                            {step.instruction}
                                                            {step.name && (
                                                                <span className="text-muted-foreground font-normal">
                                                                    {" "}on {step.name}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {formatDistance(step.distance_m)} · {formatDuration(step.duration_s)}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Assign Route to Bus ─────────────────────────────────────────────── */}
                    {routeData && (
                        <div className="bg-card rounded-2xl border border-border p-5 shadow-md">
                            <div className="flex items-center gap-2 mb-4">
                                <Bus className="w-4 h-4 text-cc-purple-500" />
                                <span className="text-sm font-bold text-foreground tracking-tight">Assign Route to Bus</span>
                            </div>

                            <p className="text-xs text-muted-foreground mb-3">
                                Save this planned route to a bus so the driver can follow it.
                            </p>

                            {buses.length === 0 ? (
                                <div className="text-sm text-muted-foreground bg-muted rounded-xl p-3 text-center">
                                    No buses found in the system.
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    <select
                                        value={selectedBusId}
                                        onChange={e => { setSelectedBusId(e.target.value); setAssignSuccess(false); }}
                                        className="w-full px-3 py-2.5 rounded-xl border border-border bg-muted/30 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-cc-purple-500/40 focus:border-cc-purple-500 transition-all"
                                    >
                                        <option value="">Select a bus…</option>
                                        {buses.map(bus => (
                                            <option key={bus.id} value={bus.id}>
                                                {bus.number || bus.plateNumber || bus.id}
                                                {bus.driverName ? ` — ${bus.driverName}` : ""}
                                            </option>
                                        ))}
                                    </select>

                                    <button
                                        type="button"
                                        onClick={handleAssignRoute}
                                        disabled={!selectedBusId || assigning}
                                        className={`
                                            flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl
                                            font-semibold text-sm transition-all duration-200 active:scale-[0.98]
                                            ${assignSuccess
                                                ? "bg-green-500 text-white border border-green-500"
                                                : "bg-cc-purple-500/10 text-cc-purple-600 dark:text-cc-purple-400 border border-cc-purple-500/25 hover:bg-cc-purple-500 hover:text-white hover:border-cc-purple-500 disabled:opacity-40 disabled:cursor-not-allowed"
                                            }
                                        `}
                                    >
                                        {assigning ? (
                                            <span className="inline-block w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                                        ) : assignSuccess ? (
                                            <Check className="w-4 h-4" />
                                        ) : (
                                            <Bus className="w-4 h-4" />
                                        )}
                                        {assigning ? "Assigning…" : assignSuccess ? "Route Assigned!" : "Assign Route"}
                                    </button>

                                    {assignSuccess && (
                                        <div className="text-xs text-green-600 dark:text-green-400 bg-green-500/10 rounded-lg px-3 py-2 border border-green-500/20">
                                            ✓ Route saved to bus successfully.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Panel — Map + category filter */}
                <div className="min-h-[400px] lg:min-h-0 rounded-2xl overflow-hidden shadow-lg border border-cc-purple-500/20 flex flex-col">

                    {/* ── Category Filter Pill Bar ── */}
                    <div className="bg-card/95 backdrop-blur-sm border-b border-border px-3 py-2 flex items-center gap-2 shrink-0">
                        <Layers className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat.key}
                                    type="button"
                                    onClick={() => setActiveCategory(cat.key)}
                                    className={`
                                        flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
                                        whitespace-nowrap shrink-0 transition-all duration-150 border
                                        ${
                                            activeCategory === cat.key
                                                ? "bg-cc-purple-500 text-white border-cc-purple-500 shadow-sm shadow-cc-purple-500/30"
                                                : "bg-muted/60 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground"
                                        }
                                    `}
                                >
                                    <span>{cat.emoji}</span>
                                    <span>{cat.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Map fills remaining space */}
                    <div className="flex-1 min-h-0">
                        <MapProviderToggle
                            startPos={startPos}
                            endPos={endPos}
                            routeData={routeData}
                            activeCategory={activeCategory}
                            waypoints={activeWaypoints}
                            busLocations={busLocations}
                            previewCoordinates={previewCoordinates}
                            onPoiSelect={(poi) => {
                                const pos = { lat: poi.lat, lng: poi.lng, label: poi.name };
                                if (!startPos) {
                                    handleStartChange(pos);
                                } else {
                                    handleEndChange(pos);
                                }
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
