import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

export const metadata = {
    title: 'Admin Control Center | Campus Compass',
    description: 'System health, monitoring, and arbitration control for Campus Compass infrastructure.',
};

export default function AdminLayout({ children }) {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col">
            <nav className="sticky top-0 z-50 w-full glass-panel border-b border-red-500/20 bg-red-50/80 dark:bg-red-950/30 px-4 sm:px-6 py-3 backdrop-blur-md">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-lg">
                            <ShieldAlert size={24} />
                        </div>
                        <div>
                            <h1 className="font-bold text-red-900 dark:text-red-100 leading-tight">Admin Console</h1>
                            <p className="text-xs text-red-700 dark:text-red-300 font-medium tracking-wide uppercase">System Health Monitoring</p>
                        </div>
                    </div>

                    <div className="flex gap-4 items-center">
                        <Link href="/dashboard/student" className="text-sm font-medium hover:text-red-700 transition">Back to App</Link>
                    </div>
                </div>
            </nav>

            <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                {children}
            </main>
        </div>
    );
}
