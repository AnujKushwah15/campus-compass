"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

const SESSION_KEY = "cc_session";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Read cached session from sessionStorage. Returns null if missing/expired. */
function readCachedSession(uid) {
    try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const session = JSON.parse(raw);
        if (session.uid !== uid) return null; // different user
        if (Date.now() - session.loginTimestamp > SESSION_TTL_MS) {
            sessionStorage.removeItem(SESSION_KEY);
            return null; // expired
        }
        return session; // { uid, role, loginTimestamp }
    } catch {
        return null;
    }
}

/** Persist session to sessionStorage. */
function writeSession(uid, role) {
    try {
        sessionStorage.setItem(
            SESSION_KEY,
            JSON.stringify({ uid, role, loginTimestamp: Date.now() })
        );
    } catch {
        // sessionStorage unavailable (SSR / private browsing edge case)
    }
}

/** Clear the cached session. */
function clearSession() {
    try {
        sessionStorage.removeItem(SESSION_KEY);
    } catch { /* noop */ }
}

const AuthContext = createContext({
    user: null,
    role: null,
    loading: true,
});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        setIsHydrated(true);
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                // To prevent the dashboard flicker, we check if sessionStorage has a token.
                const hasSession = !!sessionStorage.getItem(SESSION_KEY);
                
                if (hasSession && loading) {
                     // We clear session ONLY if we are SURE it's a real logout. 
                     // Wait a short tick, if it's still null, then clear it.
                     setTimeout(() => {
                        if (!auth.currentUser) {
                            clearSession();
                            setUser(null);
                            setRole(null);
                            setLoading(false);
                        }
                     }, 1000);
                     return;
                }

                clearSession();
                setUser(null);
                setRole(null);
                setLoading(false);
                return;
            }

            setUser(currentUser);

            // Try to use cached role to avoid a Firestore round-trip
            const cached = readCachedSession(currentUser.uid);
            if (cached) {
                setRole(cached.role);
                setLoading(false);
                return;
            }

            // Fetch role from Firestore and cache it
            try {
                const userDocSnap = await getDoc(doc(db, "users", currentUser.uid));
                const fetchedRole = userDocSnap.exists()
                    ? (userDocSnap.data().role || "student")
                    : "student";
                writeSession(currentUser.uid, fetchedRole);
                setRole(fetchedRole);
            } catch (err) {
                console.error("AuthProvider: failed to fetch user role", err);
                setRole("student"); // safe fallback
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, role, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
