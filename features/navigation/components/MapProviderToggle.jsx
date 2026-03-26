"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";

// Dynamically import both map components (no SSR – they use browser APIs)
const OlaNavigationMap = dynamic(() => import("./OlaNavigationMap"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-card rounded-2xl text-muted-foreground animate-pulse">
            Loading Map…
        </div>
    ),
});

const NavigationMap = dynamic(() => import("./NavigationMap"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-card rounded-2xl text-muted-foreground animate-pulse">
            Loading Map…
        </div>
    ),
});

const OLA_KEY_EXISTS = !!process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY;

/**
 * MapProviderToggle – renders OlaNavigationMap by default.
 * Falls back to OpenStreetMap (NavigationMap) if:
 *   - No Ola Maps API key is configured
 *   - The Ola Maps SDK fails to initialize (quota / auth error)
 *
 * Props are passed through transparently to whichever map is active.
 */
export default function MapProviderToggle({
    startPos,
    endPos,
    routeData,
    onPoiSelect,
    activeCategory,
}) {
    // Start with "ola" only if an API key is configured
    const [provider, setProvider] = useState(OLA_KEY_EXISTS ? "ola" : "osm");

    const handleOlaError = useCallback(() => {
        console.warn("[MapProviderToggle] Switching to OpenStreetMap fallback");
        setProvider("osm");
    }, []);

    const sharedProps = { startPos, endPos, routeData, onPoiSelect, activeCategory };

    if (provider === "ola") {
        return (
            <OlaNavigationMap
                {...sharedProps}
                onInitError={handleOlaError}
            />
        );
    }

    // OSM fallback
    return <NavigationMap {...sharedProps} />;
}
