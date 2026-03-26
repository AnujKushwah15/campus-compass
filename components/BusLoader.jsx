'use client';

/**
 * BusLoader — Branded Campus Compass loading animation.
 * Renders a bus icon bouncing along a dashed road track.
 *
 * Props:
 *   message  (string)  — Optional label below the animation.
 *   size     ('sm'|'md'|'lg') — Controls overall scale.
 *   fullScreen (bool) — Wraps in a full-screen centred overlay.
 */
export default function BusLoader({
    message = 'Loading...',
    size = 'md',
    fullScreen = false,
}) {
    const scale = size === 'sm' ? 'scale-75' : size === 'lg' ? 'scale-125' : 'scale-100';

    const inner = (
        <div className={`flex flex-col items-center gap-5 ${scale}`}>
            {/* Road + Bus */}
            <div className="relative w-48 h-20 flex items-end">

                {/* Dashed road */}
                <div className="absolute bottom-3 left-0 right-0 h-0.5 flex items-center gap-1.5 px-2">
                    {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="flex-1 h-full bg-cc-purple-400/40 rounded-full" />
                    ))}
                </div>

                {/* Wheel dust particles */}
                <div className="absolute bottom-3 left-3 animate-[busParticle_0.8s_ease-out_infinite]">
                    <div className="w-1.5 h-1.5 rounded-full bg-cc-purple-400/50" />
                </div>
                <div className="absolute bottom-5 left-1 animate-[busParticle_0.8s_0.2s_ease-out_infinite]">
                    <div className="w-1 h-1 rounded-full bg-cc-sky-400/50" />
                </div>

                {/* Bus icon — slides across */}
                <div className="absolute bottom-3 animate-[busDrive_1.6s_ease-in-out_infinite]">
                    <BusIcon />
                </div>
            </div>

            {/* Label */}
            {message && (
                <p className="text-sm font-semibold text-muted-foreground animate-pulse tracking-wide">
                    {message}
                </p>
            )}
        </div>
    );

    if (fullScreen) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                {inner}
            </div>
        );
    }

    return inner;
}

/* Inline SVG bus for zero dependency */
function BusIcon() {
    return (
        <svg
            width="52"
            height="32"
            viewBox="0 0 52 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="Campus Compass Bus"
        >
            {/* Body */}
            <rect x="2" y="4" width="44" height="22" rx="5" fill="url(#busGrad)" />

            {/* Roof highlight */}
            <rect x="4" y="4" width="40" height="6" rx="3" fill="white" fillOpacity="0.15" />

            {/* Front windshield */}
            <rect x="38" y="7" width="7" height="10" rx="2" fill="white" fillOpacity="0.7" />

            {/* Windows row */}
            <rect x="6"  y="8" width="8" height="7" rx="1.5" fill="white" fillOpacity="0.6" />
            <rect x="17" y="8" width="8" height="7" rx="1.5" fill="white" fillOpacity="0.6" />
            <rect x="28" y="8" width="8" height="7" rx="1.5" fill="white" fillOpacity="0.6" />

            {/* Door */}
            <rect x="6" y="17" width="6" height="9" rx="1" fill="white" fillOpacity="0.25" />

            {/* CC text badge */}
            <rect x="16" y="18" width="18" height="7" rx="2" fill="white" fillOpacity="0.12" />
            <text x="25" y="24" textAnchor="middle" fontSize="5" fontWeight="bold" fill="white" fillOpacity="0.9" fontFamily="sans-serif">CC</text>

            {/* Wheels */}
            <circle cx="12" cy="28" r="4" fill="#1e1b4b" />
            <circle cx="12" cy="28" r="2" fill="#a78bfa" />
            <circle cx="12" cy="28" r="0.8" fill="white" />

            <circle cx="36" cy="28" r="4" fill="#1e1b4b" />
            <circle cx="36" cy="28" r="2" fill="#a78bfa" />
            <circle cx="36" cy="28" r="0.8" fill="white" />

            {/* Headlight */}
            <circle cx="47" cy="16" r="2" fill="#fde68a" />

            {/* Gradient def */}
            <defs>
                <linearGradient id="busGrad" x1="0" y1="0" x2="46" y2="0" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#7c3aed" />
                    <stop offset="1" stopColor="#5B9BD5" />
                </linearGradient>
            </defs>
        </svg>
    );
}
