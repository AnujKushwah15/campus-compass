"use client";

import Navbar from '@/components/Navbar';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/components/AuthProvider';
import { useEffect } from 'react';
import BusLoader from '@/components/BusLoader';

export default function DashboardLayout({
    children,
}) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, loading } = useAuth();

    // Check if we are in a standalone mode path (Admin or Driver)
    const isStandalonePage = pathname?.startsWith('/dashboard/admin') || pathname?.startsWith('/dashboard/driver');

    useEffect(() => {
        if (!loading && !user) {
            router.push('/auth');
        }
    }, [user, loading, router]);

    if (loading) {
        return <BusLoader fullScreen message="Loading secure session..." />;
    }

    if (!user) {
        return null; // Will redirect in useEffect
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
