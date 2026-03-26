import { useState, useCallback } from "react";
import dynamic from "next/dynamic";

const OlaLiveMap = dynamic(() => import("./OlaLiveMap"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-card rounded-2xl text-muted-foreground animate-pulse">
            Loading Map…
        </div>
    ),
});

const LiveMapOSM = dynamic(() => import("./LiveMapOSM"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-card rounded-2xl text-muted-foreground animate-pulse">
            Loading Map…
        </div>
    ),
});

const OLA_KEY_EXISTS = !!process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY;

export default function LiveMap({ busLocation, busLocations = [], stops = [] }) {
    const [provider, setProvider] = useState(OLA_KEY_EXISTS ? "ola" : "osm");

    const handleOlaError = useCallback(() => {
        console.warn("[LiveMap] Switching to OpenStreetMap fallback");
        setProvider("osm");
    }, []);

    const sharedProps = { busLocation, busLocations, stops };

    if (provider === "ola") {
        return (
            <OlaLiveMap
                {...sharedProps}
                onInitError={handleOlaError}
            />
        );
    }

    return <LiveMapOSM {...sharedProps} />;
}
