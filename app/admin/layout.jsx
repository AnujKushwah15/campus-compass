'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldAlert, Navigation } from 'lucide-react';



export default function AdminLayout({ children }) {
    const pathname = usePathname();

    const navItems = [
        { href: '/admin', label: 'Control Center', icon: ShieldAlert },
        { href: '/dashboard/admin/navigation', label: 'Route Navigator', icon: Navigation },
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col">
            <nav className="sticky top-0 z-50 w-full border-b border-red-500/20 bg-red-50/80 dark:bg-red-950/30 px-4 sm:px-8 lg:px-12 xl:px-16 backdrop-blur-md">
                <div className="w-full flex items-center justify-between">
                    {/* Brand */}
                    <div className="flex items-center gap-3 py-3">
                        <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-lg shrink-0">
                            <ShieldAlert size={20} />
                        </div>
                        <div>
                            <h1 className="font-bold text-red-900 dark:text-red-100 leading-tight text-sm">Admin Console</h1>
                            <p className="text-xs text-red-700 dark:text-red-300 font-medium tracking-wide uppercase hidden sm:block">Campus Compass</p>
                        </div>
                    </div>

                    {/* Nav tabs */}
                    <div className="flex items-center gap-1">
                        {navItems.map(({ href, label, icon: Icon }) => {
                            const isActive = pathname === href;
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        isActive
                                            ? 'bg-red-600 text-white shadow-sm'
                                            : 'text-red-800 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-900/40'
                                    }`}
                                >
                                    <Icon size={15} />
                                    <span className="hidden sm:inline">{label}</span>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Back link */}
                    <Link href="/dashboard/student" className="text-sm font-medium text-red-800 dark:text-red-200 hover:text-red-600 transition py-3">
                        ← Back to App
                    </Link>
                </div>
            </nav>

            <main className="flex-1 w-full">
                {children}
            </main>
        </div>
    );
}
