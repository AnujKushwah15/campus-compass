"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Logo from '@/components/Logo';
import { User, Lock, ArrowRight, Bus } from 'lucide-react';
import Link from 'next/link';
import BackgroundAnimation from '@/components/ui/BackgroundAnimation';

export default function StaffLoginPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLogin = (e) => {
        e.preventDefault();
        setIsLoading(true);

        // Simple hardcoded auth check
        setTimeout(() => {
            if (formData.username === 'admin' && formData.password === 'admin') {
                router.push('/admin/dashboard');
            } else if (formData.username === 'driver') {
                // Allow driver to login with just username 'driver' or both 'driver'/'driver'
                // The prompt said "name and pasword driver" for driver
                if (formData.password === 'driver') {
                    router.push('/staff/driver');
                } else {
                    alert('Invalid credentials');
                    setIsLoading(false);
                }
            } else {
                alert('Invalid credentials');
                setIsLoading(false);
            }
        }, 1000);
    };

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
                            label="Username / Staff ID"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            placeholder="Enter username (e.g. admin, driver)"
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
