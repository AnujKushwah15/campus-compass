"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, MapPin, X, Crosshair, Loader2 } from "lucide-react";

// Regex to detect coordinate input: "23.0225, 72.5714"
const COORD_REGEX = /^\s*(-?\d+\.?\d*)\s*[,\s]\s*(-?\d+\.?\d*)\s*$/;

// Module-level search cache
const searchCache = new Map();

export default function PlaceSearch({
    label,
    value,
    onChange,
    placeholder,
    inputRef: externalRef,
    isLoading: externalLoading = false,
    onSelect,
}) {
    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const debounceRef = useRef(null);
    const containerRef = useRef(null);
    const localRef = useRef(null);
    const inputRef = externalRef || localRef;

    // Sync display text when value is set externally (e.g. geolocation fill)
    useEffect(() => {
        if (!value) {
            setQuery("");
        } else if (value.label && query !== value.label) {
            setQuery(value.label);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const searchPlaces = useCallback(async (q) => {
        if (!q || q.trim().length < 2) {
            setSuggestions([]);
            return;
        }

        // Coordinate shortcut
        const coordMatch = q.match(COORD_REGEX);
        if (coordMatch) {
            const lat = parseFloat(coordMatch[1]);
            const lng = parseFloat(coordMatch[2]);
            if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                setSuggestions([{
                    name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                    lat, lng,
                    type: "coordinates",
                    context: "Custom coordinates",
                }]);
                setIsOpen(true);
                return;
            }
        }

        // Check cache first
        const cacheKey = q.trim().toLowerCase();
        if (searchCache.has(cacheKey)) {
            setSuggestions(searchCache.get(cacheKey));
            setIsOpen(true);
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`/api/search-place?q=${encodeURIComponent(q)}`);
            const data = await res.json();
            const results = Array.isArray(data) ? data : [];
            searchCache.set(cacheKey, results);
            // Evict oldest if cache grows too large
            if (searchCache.size > 50) {
                const firstKey = searchCache.keys().next().value;
                searchCache.delete(firstKey);
            }
            setSuggestions(results);
            setIsOpen(true);
        } catch {
            setSuggestions([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleInput = (e) => {
        const val = e.target.value;
        setQuery(val);
        if (!val) {
            onChange?.(null);
            setSuggestions([]);
            setIsOpen(false);
        }
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => searchPlaces(val), 350);
    };

    const handleSelect = (place) => {
        const label = `${place.name}${place.context ? ` — ${place.context}` : ""}`;
        setQuery(label);
        setSuggestions([]);
        setIsOpen(false);
        onChange?.({ lat: place.lat, lng: place.lng, label: place.name });
        onSelect?.({ lat: place.lat, lng: place.lng, label: place.name });
    };

    const handleClear = () => {
        setQuery("");
        setSuggestions([]);
        setIsOpen(false);
        onChange?.(null);
        inputRef.current?.focus();
    };

    const handleUseMyLocation = () => {
        if (!navigator.geolocation) return;
        setLoading(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                const label = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                setQuery("My Location");
                setIsOpen(false);
                onChange?.({ lat, lng, label: "My Location" });
                setLoading(false);
            },
            () => {
                setLoading(false);
                alert("Unable to get your location");
            }
        );
    };

    const isSpinning = loading || externalLoading;

    return (
        <div ref={containerRef} className="relative">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                {label}
            </label>
            <div className="relative flex items-center">
                {isSpinning ? (
                    <Loader2 className="absolute left-3 w-4 h-4 text-cc-purple-500 animate-spin pointer-events-none" />
                ) : (
                    <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
                )}
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={handleInput}
                    onFocus={() => suggestions.length > 0 && setIsOpen(true)}
                    placeholder={externalLoading ? "Detecting location…" : (placeholder || "Search place or enter lat, lng")}
                    className="w-full pl-10 pr-20 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-cc-purple-500/40 focus:border-cc-purple-500/60 transition-all text-sm"
                />
                <div className="absolute right-2 flex items-center gap-1">
                    <button
                        type="button"
                        onClick={handleUseMyLocation}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-cc-purple-500 transition-colors"
                        title="Use my location"
                    >
                        <Crosshair className="w-4 h-4" />
                    </button>
                    {query && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Dropdown */}
            {isOpen && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1.5 bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-dropdown-enter">
                    {suggestions.map((place, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => handleSelect(place)}
                            className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left border-b border-border/50 last:border-0"
                        >
                            <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-cc-purple-500" />
                            <div className="min-w-0">
                                <div className="text-sm font-medium text-foreground truncate">{place.name}</div>
                                <div className="text-xs text-muted-foreground truncate">
                                    {place.type && <span className="capitalize">{place.type}</span>}
                                    {place.type && place.context && " · "}
                                    {place.context}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
