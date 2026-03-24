"use client";

import { useState, useCallback } from "react";
import PlaceSearch from "./PlaceSearch";
import dynamic from "next/dynamic";
import { Navigation, Clock, Route, ArrowRight, RotateCcw, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";
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

export default function RouteNavigator() {
    const [startPos, setStartPos] = useState(null);
    const [endPos, setEndPos] = useState(null);
    const [routeData, setRouteData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showSteps, setShowSteps] = useState(false);

    const findRoute = useCallback(async () => {
        if (!startPos || !endPos) return;

        setLoading(true);
        setError(null);
        setRouteData(null);

        try {
            const params = new URLSearchParams({
                start_lat: startPos.lat,
                start_lng: startPos.lng,
                end_lat: endPos.lat,
                end_lng: endPos.lng,
            });
            const res = await fetch(`/api/route?${params}`);
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Failed to find route");
                return;
            }

            setRouteData(data);
        } catch {
            setError("Network error — could not reach routing service");
        } finally {
            setLoading(false);
        }
    }, [startPos, endPos]);

    const handleReset = () => {
        setStartPos(null);
        setEndPos(null);
        setRouteData(null);
        setError(null);
        setShowSteps(false);
    };

    const handleSwap = () => {
        setStartPos(endPos);
        setEndPos(startPos);
        setRouteData(null);
    };

    return (
        <div className="font-sans text-foreground bg-background px-4 sm:px-8 lg:px-12 xl:px-16 py-6">

            {/* Page header — matches admin dashboard style */}
            <header className="flex items-center justify-between gap-4 mb-6 pb-6 border-b border-border">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/admin" className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors mr-2" title="Back to Admin Dashboard">
                        <ArrowLeft size={24} />
                    </Link>
                    <div className="w-12 h-12 bg-gradient-to-br from-cc-purple-600 to-cc-red-600 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0">
                        <Navigation size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground tracking-tight">
                            Route <span className="text-cc-purple-500">Navigator</span>
                        </h1>
                        <p className="text-muted-foreground font-medium text-sm">Find the shortest road path between any two places</p>
                    </div>
                </div>
            </header>

            {/* Main content grid */}
            <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 h-[calc(100vh-220px)] min-h-[500px]">

                {/* Left Panel — Controls */}
                <div className="flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-1">

                    {/* Search Inputs */}
                    <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                        <div className="flex flex-col gap-3">
                            <PlaceSearch
                                label="Starting Point"
                                value={startPos}
                                onChange={setStartPos}
                                placeholder="Search place or enter lat, lng"
                            />

                            {/* Swap button */}
                            <div className="flex justify-center">
                                <button
                                    type="button"
                                    onClick={handleSwap}
                                    disabled={!startPos && !endPos}
                                    className="p-2 rounded-full border border-border hover:bg-muted hover:border-primary/30 text-muted-foreground hover:text-primary transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="Swap start and end"
                                >
                                    <ArrowRight className="w-4 h-4 rotate-90" />
                                </button>
                            </div>

                            <PlaceSearch
                                label="Destination"
                                value={endPos}
                                onChange={setEndPos}
                                placeholder="Search place or enter lat, lng"
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-5">
                            <button
                                type="button"
                                onClick={findRoute}
                                disabled={!startPos || !endPos || loading}
                                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm bg-cc-purple-500/10 text-cc-purple-600 border border-cc-purple-500/20 hover:bg-cc-purple-500 hover:text-white hover:border-cc-purple-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <span className="inline-block w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                                ) : (
                                    <Route className="w-4 h-4" />
                                )}
                                {loading ? "Finding Route..." : "Find Route"}
                            </button>
                            <button
                                type="button"
                                onClick={handleReset}
                                className="p-3 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
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
                        <div className="bg-card rounded-2xl border border-cc-purple-500/20 p-5 shadow-sm animate-pop-in">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2.5 rounded-xl bg-cc-purple-500/10 border border-cc-purple-500/20">
                                    <Route className="w-4 h-4 text-cc-purple-500" />
                                </div>
                                <h3 className="font-bold text-foreground">Route Found</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-muted/50 rounded-xl p-3 text-center border border-border">
                                    <Clock className="w-4 h-4 mx-auto mb-1 text-cc-purple-500" />
                                    <div className="text-lg font-bold text-foreground">
                                        {formatDuration(routeData.duration_s)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">Estimated Time</div>
                                </div>
                                <div className="bg-muted/50 rounded-xl p-3 text-center border border-border">
                                    <Navigation className="w-4 h-4 mx-auto mb-1 text-cc-purple-500" />
                                    <div className="text-lg font-bold text-foreground">
                                        {formatDistance(routeData.distance_m)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">Total Distance</div>
                                </div>
                            </div>

                            {/* Turn-by-turn steps */}
                            {routeData.steps && routeData.steps.length > 0 && (
                                <div className="mt-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowSteps(!showSteps)}
                                        className="w-full flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 text-sm text-muted-foreground transition-colors"
                                    >
                                        <span>{routeData.steps.length} turn-by-turn steps</span>
                                        {showSteps ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </button>
                                    {showSteps && (
                                        <div className="mt-2 space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                                            {routeData.steps.map((step, i) => (
                                                <div
                                                    key={i}
                                                    className="flex gap-3 py-2 px-3 rounded-lg text-sm hover:bg-muted/30 transition-colors"
                                                >
                                                    <span className="text-muted-foreground font-mono text-xs mt-0.5 shrink-0 w-5 text-right">
                                                        {i + 1}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-foreground capitalize truncate">
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

                {/* Right Panel — Map */}
                <div className="min-h-[400px] lg:min-h-0 rounded-2xl overflow-hidden shadow-lg border border-cc-purple-500/20">
                    <NavigationMap
                        startPos={startPos}
                        endPos={endPos}
                        routeData={routeData}
                    />
                </div>
            </div>
        </div>
    );
}
