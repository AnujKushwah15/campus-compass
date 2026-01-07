"use client";

import dynamic from 'next/dynamic';

const LiveMap = dynamic(() => import('@/components/ui/LiveMap'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-500 animate-pulse">
            Loading Route Map...
        </div>
    )
});

export default function RouteMap() {
    return (
        <div className="w-full h-64 bg-card rounded-xl shadow-lg border border-border relative overflow-hidden group z-0">
            <LiveMap />
        </div>
    );
}
