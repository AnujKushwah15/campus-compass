"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/components/AuthProvider";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, ShieldX } from "lucide-react";

/**
 * Wraps children with admin-only access.
 * Fetches the user's role from Firestore and redirects if not admin.
 */
export default function AdminGuard({ children }) {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [roleStatus, setRoleStatus] = useState("checking"); // "checking" | "admin" | "denied"

    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            router.replace("/auth");
            return;
        }

        // Fetch role from Firestore
        getDoc(doc(db, "users", user.uid))
            .then((snap) => {
                const role = snap.exists() ? snap.data().role : null;
                if (role === "admin") {
                    setRoleStatus("admin");
                } else {
                    setRoleStatus("denied");
                }
            })
            .catch(() => setRoleStatus("denied"));
    }, [user, authLoading, router]);

    if (authLoading || roleStatus === "checking") {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                <p className="animate-pulse font-medium">Verifying admin access...</p>
            </div>
        );
    }

    if (roleStatus === "denied") {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <ShieldX className="w-16 h-16 text-red-500 opacity-80" />
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Access Denied</h2>
                <p className="text-slate-500 dark:text-slate-400 text-center max-w-sm">
                    This page is restricted to administrators only.
                </p>
            </div>
        );
    }

    return children;
}
