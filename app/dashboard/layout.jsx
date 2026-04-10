"use client";

import Navbar from '@/components/Navbar';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/components/AuthProvider';
import { useEffect } from 'react';
import BusLoader from '@/components/BusLoader';
import { Loader2 } from 'lucide-react';

/** Map each role to the dashboard path it is allowed to access. */
const ROLE_DASHBOARDS = {
    admin:   '/dashboard/admin',
    student: '/dashboard/student',
    parent:  '/dashboard/parent',
    driver:  '/dashboard/driver',
};

export default function DashboardLayout({
    children,
}) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, role, loading } = useAuth();

    // Check if we are in a standalone mode path (Admin or Driver)
    const isStandalonePage = pathname?.startsWith('/dashboard/admin') || pathname?.startsWith('/dashboard/driver');

    useEffect(() => {
        if (loading) return;

        // Not logged in → send to auth
        if (!user) {
            router.push('/auth');
            return;
        }

        // Role known → enforce that the user is on their own dashboard
        if (role && ROLE_DASHBOARDS[role]) {
            const allowedPrefix = ROLE_DASHBOARDS[role];
            if (!pathname?.startsWith(allowedPrefix)) {
                router.replace(allowedPrefix);
            }
        }
    }, [user, role, loading, pathname, router]);

    if (loading) {
        return <BusLoader fullScreen message="Loading secure session..." />;
    }

    if (!user) {
        return null; // Will redirect in useEffect
    }

    // While role is loading or a redirect is pending, show spinner to avoid
    // briefly rendering the wrong dashboard's content.
    if (!role || (role && ROLE_DASHBOARDS[role] && !pathname?.startsWith(ROLE_DASHBOARDS[role]))) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-muted-foreground animate-pulse">Verifying access...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col">
            {!isStandalonePage && <Navbar />}
            <main className="flex-1 w-full px-4 sm:px-8 lg:px-12 xl:px-16 pt-6 pb-24 md:py-6">
                {children}
            </main>
        </div>
    );
}
