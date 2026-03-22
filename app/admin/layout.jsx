import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

export const metadata = {
    title: 'Admin Control Center | Campus Compass',
    description: 'System health, monitoring, and arbitration control for Campus Compass infrastructure.',
};

export default function AdminLayout({ children }) {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col">
            <nav className="sticky top-0 z-50 w-full glass-panel border-b border-red-500/20 bg-red-50/80 dark:bg-red-950/30 px-4 sm:px-8 lg:px-12 xl:px-16 py-3 backdrop-blur-md">
                <div className="w-full flex items-center justify-between relative">
                    {/* Left */}
                    <div className="flex-shrink-0 z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-lg">
                                <ShieldAlert size={24} />
                            </div>
                            <div>
                                <h1 className="font-bold text-red-900 dark:text-red-100 leading-tight">Admin Console</h1>
                                <p className="text-xs text-red-700 dark:text-red-300 font-medium tracking-wide uppercase">System Health Monitoring</p>
                            </div>
                        </div>
                    </div>

                    {/* Center */}
                    <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-0"></div>

                    {/* Right */}
                    <div className="flex items-center gap-4 flex-shrink-0 z-10">
                        <Link href="/dashboard/student" className="text-sm font-medium hover:text-red-700 transition">Back to App</Link>
                    </div>
                </div>
            </nav>

            <main className="flex-1 w-full px-4 sm:px-8 lg:px-12 xl:px-16 py-6">
                {children}
            </main>
        </div>
    );
}
