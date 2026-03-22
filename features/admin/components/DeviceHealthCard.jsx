"use client";
import { Server, Smartphone, Cpu, MapPin, Gauge } from "lucide-react";

export default function DeviceHealthCard({ busId, data }) {
    const { active_source = "none", status = "offline", location, sources } = data || {};

    // Status color mapping
    const statusConfig = {
        online: "bg-emerald-500 shadow-emerald-500/30",
        degraded: "bg-amber-500 shadow-amber-500/30 text-slate-900",
        offline: "bg-rose-500 shadow-rose-500/30"
    };

    const statusBadgeColors = {
        online: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
        degraded: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
        offline: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800"
    };

    const getAgeStr = (timestamp) => {
        if (!timestamp) return "Never";
        const ageMs = Date.now() - timestamp;
        if (ageMs < 5000) return "Just now";
        if (ageMs < 60000) return `${Math.floor(ageMs / 1000)}s ago`;
        if (ageMs < 3600000) return `${Math.floor(ageMs / 60000)}m ago`;
        return "> 1h old";
    };

    const sourceIcon = (sourceName) => {
        switch (sourceName) {
            case "neo_m8n": return <Cpu className="w-4 h-4 text-indigo-500" />;
            case "neo_m8n_degraded": return <Cpu className="w-4 h-4 text-amber-500" />;
            case "phone": return <Smartphone className="w-4 h-4 text-sky-500" />;
            default: return <Server className="w-4 h-4 text-slate-400" />;
        }
    };

    const speed = location?.speed ? (location.speed * 3.6).toFixed(1) : "0.0"; // Convert m/s to km/h assuming standard

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col group">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2.5 h-2.5 rounded-full ${statusConfig[status] || statusConfig.offline} shadow-sm animate-pulse-slow`} />
                        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{busId}</h3>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusBadgeColors[status] || statusBadgeColors.offline}`}>
                        {status.toUpperCase()}
                    </span>
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-700 flex items-center justify-center border border-slate-100 dark:border-slate-600">
                    <Server className={`w-5 h-5 ${status === 'online' ? 'text-emerald-500' : 'text-slate-400'}`} />
                </div>
            </div>

            <div className="p-5 flex-1 flex flex-col gap-4">
                {/* Active Source Banner */}
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Source</span>
                    <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                        {sourceIcon(active_source)}
                        <span>{active_source === "none" ? "None" : active_source}</span>
                    </div>
                </div>

                {/* Telemetry Grid */}
                {location && active_source !== "none" ? (
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-start gap-2">
                            <Gauge className="w-4 h-4 text-slate-400 mt-0.5" />
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400">Speed</p>
                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{speed} <span className="text-xs font-normal text-slate-500">km/h</span></p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400">Coords</p>
                                <p className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono tracking-tighter">
                                    {location?.lat?.toFixed(4)}, {location?.lng?.toFixed(4)}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-12 text-sm text-slate-500 italic">
                        No telemetry available
                    </div>
                )}
            </div>

            {/* Hardware Diagnostics Footer */}
            <div className="bg-slate-50 dark:bg-slate-900/80 px-5 py-3 border-t border-slate-100 dark:border-slate-700 flex justify-between text-xs">
                <div className="flex flex-col gap-0.5">
                    <span className="text-slate-400 font-semibold uppercase text-[10px]">Pi GPS</span>
                    <span className={`${Date.now() - (sources?.neo_m8n?.last_seen || 0) < 5000 ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-600 dark:text-slate-400'}`}>
                        {getAgeStr(sources?.neo_m8n?.last_seen)}
                    </span>
                </div>
                <div className="flex flex-col gap-0.5 text-center">
                    <span className="text-slate-400 font-semibold uppercase text-[10px]">IMU</span>
                    <span className={`${Date.now() - (sources?.imu?.last_seen || 0) < 5000 ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-slate-600 dark:text-slate-400'}`}>
                        {getAgeStr(sources?.imu?.last_seen)}
                    </span>
                </div>
                <div className="flex flex-col gap-0.5 text-right">
                    <span className="text-slate-400 font-semibold uppercase text-[10px]">Phone</span>
                    <span className={`${Date.now() - (sources?.phone?.last_seen || 0) < 5000 ? 'text-sky-600 dark:text-sky-400 font-medium' : 'text-slate-600 dark:text-slate-400'}`}>
                        {getAgeStr(sources?.phone?.last_seen)}
                    </span>
                </div>
            </div>
        </div>
    );
}
