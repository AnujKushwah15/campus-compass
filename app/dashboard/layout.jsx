"use client";

import Navbar from '@/components/Navbar';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/components/AuthProvider';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

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
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-muted-foreground animate-pulse">Loading secure session...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return null; // Will redirect in useEffect
    }

    return (
        <div className="flex min-h-screen flex-col">
            {!isStandalonePage && <Navbar />}
            <main className="flex-1 w-full px-4 sm:px-8 lg:px-12 xl:px-16 py-6">
                {children}
            </main>
        </div>
    );
}
