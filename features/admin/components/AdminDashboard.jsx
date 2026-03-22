"use client";
import { useEffect, useState } from "react";
import { rtdb } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import DeviceHealthCard from "./DeviceHealthCard";
import { Activity } from "lucide-react";

export default function AdminDashboard() {
    const [buses, setBuses] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const busesRef = ref(rtdb, "buses");
        const unsubscribe = onValue(busesRef, (snapshot) => {
            if (snapshot.exists()) {
                setBuses(snapshot.val());
            } else {
                setBuses({});
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500">
                <Activity className="animate-spin w-8 h-8 mb-4 text-red-500" />
                <p className="font-medium animate-pulse">Connecting to Edge Network...</p>
            </div>
        );
    }

    const busEntries = Object.entries(buses);

    if (busEntries.length === 0) {
        return (
            <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <p className="text-slate-500 dark:text-slate-400">No edge nodes currently registered or active.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {busEntries.map(([busId, data]) => (
                <DeviceHealthCard key={busId} busId={busId} data={data} />
            ))}
        </div>
    );
}
