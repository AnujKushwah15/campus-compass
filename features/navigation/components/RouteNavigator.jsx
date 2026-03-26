"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import PlaceSearch from "./PlaceSearch";
import dynamic from "next/dynamic";
import { POI_CONFIG } from "./NavigationMap";
import {
    Navigation, Clock, Route, ArrowRight, RotateCcw,
    ChevronDown, ChevronUp, ArrowLeft, CornerUpLeft, CornerUpRight,
    ArrowUp, Car, Layers
} from "lucide-react";
import Link from "next/link";

// Dynamic import for Leaflet (no SSR)
const NavigationMap = dynamic(() => import("./NavigationMap"), {
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

// Route cache keyed by rounded coordinates
const routeCache = new Map();

function makeRouteCacheKey(s, e) {
    return `${s.lat.toFixed(4)},${s.lng.toFixed(4)}→${e.lat.toFixed(4)},${e.lng.toFixed(4)}`;
}

export default function RouteNavigator() {
    const [startPos, setStartPos] = useState(null);
    const [endPos, setEndPos] = useState(null);
    const [routeData, setRouteData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showSteps, setShowSteps] = useState(false);
    const [geoLoading, setGeoLoading] = useState(false);
    const [swapRotate, setSwapRotate] = useState(false);
    const [activeCategory, setActiveCategory] = useState("all");

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
                // Focus destination after geo resolves
                setTimeout(() => destinationRef.current?.focus(), 300);
            },
            () => setGeoLoading(false),
            { timeout: 5000, maximumAge: 30000 }
        );
    }, []);

    // ── Auto-trigger route when both positions are set ───────────────────────
    const findRoute = useCallback(async (start, end) => {
        if (!start || !end) return;

        const cacheKey = makeRouteCacheKey(start, end);
        if (autoTriggeredKey.current === cacheKey) return;   // already fetched
        autoTriggeredKey.current = cacheKey;

        // Check cache
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

    // Trigger whenever both positions are filled
    useEffect(() => {
        if (startPos && endPos) {
            findRoute(startPos, endPos);
        }
    }, [startPos, endPos, findRoute]);

    // Auto-focus destination when start is selected
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

    const handleReset = () => {
        setStartPos(null);
        setEndPos(null);
        setRouteData(null);
        setError(null);
        setShowSteps(false);
        autoTriggeredKey.current = null;
    };

    const handleSwap = () => {
        setSwapRotate(true);
        setTimeout(() => setSwapRotate(false), 400);
        setStartPos(endPos);
        setEndPos(startPos);
        setRouteData(null);
        autoTriggeredKey.current = null;
    };

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
                            Find the shortest road path between any two places
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
            <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 h-[calc(100vh-210px)] min-h-[520px]">

                {/* Left Panel */}
                <div className="flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-1">

                    {/* Search Inputs */}
                    <div className="bg-card rounded-2xl border border-border p-5 shadow-md">
                        {/* Section heading */}
                        <div className="flex items-center gap-2 mb-4">
                            <Route className="w-4 h-4 text-cc-purple-500" />
                            <span className="text-sm font-bold text-foreground tracking-tight">Plan Your Route</span>
                        </div>

                        <div className="flex flex-col gap-3">
                            <PlaceSearch
                                label="Starting Point"
                                value={startPos}
                                onChange={handleStartChange}
                                placeholder="Search or use my location"
                                isLoading={geoLoading}
                            />

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

                            <PlaceSearch
                                label="Destination"
                                value={endPos}
                                onChange={handleEndChange}
                                placeholder="Where to?"
                                inputRef={destinationRef}
                            />
                        </div>

                        {/* Divider */}
                        <div className="border-t border-border my-4" />

                        {/* Action row: Find Route (fallback) + Reset */}
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    autoTriggeredKey.current = null;
                                    findRoute(startPos, endPos);
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

                    {/* Route Summary — hero ETA card */}
                    {routeData && (
                        <div className="bg-card rounded-2xl border border-cc-purple-500/30 p-5 shadow-md animate-pop-in">

                            {/* Card heading */}
                            <div className="flex items-center gap-2 mb-4">
                                <Clock className="w-4 h-4 text-cc-purple-500" />
                                <span className="text-sm font-bold text-foreground tracking-tight">Route Summary</span>
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
                        <NavigationMap
                            startPos={startPos}
                            endPos={endPos}
                            routeData={routeData}
                            activeCategory={activeCategory}
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
