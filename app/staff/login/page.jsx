"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Logo from '@/components/Logo';
import { User, Lock, ArrowRight, Bus, Loader2 } from 'lucide-react';
import Link from 'next/link';
import BackgroundAnimation from '@/components/ui/BackgroundAnimation';
import { useAuth } from '@/features/auth/components/AuthProvider';

const STAFF_DASHBOARDS = {
    admin: '/dashboard/admin',
    driver: '/dashboard/driver',
};

export default function StaffLoginPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const { user, role, loading: authLoading } = useAuth();

    // Redirect already-logged-in staff to their dashboard
    useEffect(() => {
        if (!authLoading && user && STAFF_DASHBOARDS[role]) {
            router.replace(STAFF_DASHBOARDS[role]);
        }
    }, [user, role, authLoading, router]);

    const [formData, setFormData] = useState({
        username: '', // Treated as email
        password: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // 1. Sign in with Firebase Auth
            const userCredential = await signInWithEmailAndPassword(auth, formData.username, formData.password);
            const user = userCredential.user;

            // 2. Fetch User Role from Firestore
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                const role = userData.role;

                if (role === 'admin') {
                    router.push('/dashboard/admin');
                } else if (role === 'driver') {
                    router.push('/dashboard/driver');
                } else {
                    alert("Unauthorized access. You are not a staff member.");
                    // Optional: Sign out if not authorized
                    // await auth.signOut();
                    setIsLoading(false);
                }
            } else {
                console.error("No user document found!");
                alert("Account configuration error. Please contact Administrator.");
                setIsLoading(false);
            }

        } catch (error) {
            console.error("Login Error:", error);
            alert("Login Failed: " + error.message);
            setIsLoading(false);
        }
    };

    // Show spinner while auth resolves or while redirecting
    if (authLoading || (!authLoading && user && STAFF_DASHBOARDS[role])) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-destructive" />
                    <p className="text-muted-foreground animate-pulse text-sm">
                        {user ? 'Redirecting to dashboard...' : 'Loading secure session...'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen w-full relative overflow-hidden bg-background flex flex-col items-center justify-center p-4">
            {/* Background Elements */}
            <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
                <BackgroundAnimation />
            </div>

            <div className="z-10 mb-8 scale-110">
                <Logo />
            </div>

            <Card className="z-10 w-full max-w-md backdrop-blur-xl border-border shadow-glow hover:shadow-lg transition-shadow duration-300 animate-pop-in" padding="lg">
                <div className="text-center mb-8">
                    <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4 text-destructive">
                        <Bus size={24} />
                    </div>
                    <h1 className="text-2xl font-bold text-cc-purple-500">Staff Portal</h1>
                    <p className="text-muted-foreground mt-2 text-sm">Welcome back, please login to your account.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-4">
                        <Input
                            label="Email Address"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            placeholder="Enter staff email"
                            icon={<User size={18} />}
                            required
                            containerClassName="opacity-0 animate-pop-in delay-100"
                        />
                        <Input
                            label="Password"
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="••••••••"
                            icon={<Lock size={18} />}
                            required
                            containerClassName="opacity-0 animate-pop-in delay-200"
                        />
                    </div>

                    <Button
                        type="submit"
                        size="lg"
                        className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-md shadow-destructive/20 opacity-0 animate-pop-in delay-300"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Verifying...' : 'Login to Dashboard'}
                        {!isLoading && <ArrowRight size={18} className="ml-2" />}
                    </Button>
                </form>

                <div className="mt-6 text-center">
                    <Link href="/" className="text-xs text-muted-foreground hover:text-destructive transition-colors">
                        &larr; Back to Home
                    </Link>
                </div>
            </Card>

            <footer className="absolute bottom-4 text-xs text-muted-foreground font-medium">
                © 2025 Campus Compass. Staff Restricted Area.
            </footer>
        </main>
    );
}
