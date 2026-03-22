'use client';

import { ArrowLeft, Activity } from 'lucide-react';
import Link from 'next/link';
import AdminDashboard from '@/features/admin/components/AdminDashboard';

export default function AdminDevicesPage() {
    return (
        <div className="font-sans text-foreground min-h-screen bg-background p-6">
            <header className="flex items-center justify-between mb-8 pb-6 border-b border-border">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-sky-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                        <Activity size={28} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-foreground tracking-tight">
                            Edge Device <span className="text-indigo-500">Health</span>
                        </h1>
                        <p className="text-muted-foreground font-medium">Real-time Telemetry & Diagnostics</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard/admin"
                        className="bg-card hover:bg-muted px-4 py-2 rounded-lg border border-border flex items-center gap-2 transition-colors group"
                    >
                        <ArrowLeft size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                        <span className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">Virtual Fleet</span>
                    </Link>
                </div>
            </header>

            <AdminDashboard />
        </div>
    );
}
