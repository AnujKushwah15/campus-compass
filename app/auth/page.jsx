"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { User, Shield, ArrowRight, Mail, Phone, Hash, School, GraduationCap } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
    const [activeTab, setActiveTab] = useState('login');
    const [userType, setUserType] = useState('student');
    const router = useRouter();

    const handleLogin = (e) => {
        e.preventDefault();
        // Simulate login
        if (userType === 'student') {
            router.push('/dashboard/student');
        } else {
            router.push('/dashboard/parent');
        }
    };

    return (
        <main className="min-h-screen w-full relative overflow-hidden bg-cc-beige-200 flex flex-col items-center justify-center p-4">
            {/* Staff Login Button */}
            <div className="absolute top-6 right-6 z-50">
                <Link href="/staff/login">
                    <Button variant="outline" className="bg-white/50 backdrop-blur-sm border-cc-pista-500 text-cc-pista-800 hover:bg-cc-pista-500 hover:text-white transition-all text-sm py-2 px-4 shadow-sm">
                        Staff Login
                    </Button>
                </Link>
            </div>
            {/* Background Elements */}
            <div className="absolute inset-0 z-0">
                {/* Abstract Map/Route Pattern */}
                <svg className="w-full h-full opacity-[0.03]" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path d="M0,50 Q25,30 50,50 T100,50" stroke="#708F59" strokeWidth="0.5" fill="none" />
                    <path d="M0,30 Q40,80 80,30 T120,40" stroke="#5B9BD5" strokeWidth="0.5" fill="none" />
                    <circle cx="20" cy="20" r="15" fill="#A67B59" className="blur-3xl" />
                    <circle cx="80" cy="80" r="20" fill="#87CEEB" className="blur-3xl" />
                </svg>
                <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-bl from-cc-sky-300/10 to-transparent blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-gradient-to-tr from-cc-brown-400/10 to-transparent blur-3xl pointer-events-none" />
            </div>

            {/* Hero Logo Area */}
            <div className="z-10 mb-8 animate-fadeInDown">
                <div className="scale-125">
                    <Logo />
                </div>
            </div>

            {/* Auth Card */}
            <Card className="z-10 w-full max-w-md md:max-w-lg mt-4 backdrop-blur-xl border-white/50 shadow-glow" padding="none">
                {/* Tabs */}
                <div className="flex border-b border-cc-beige-300">
                    <button
                        onClick={() => setActiveTab('login')}
                        className={`flex-1 py-4 text-sm font-bold tracking-wide transition-colors duration-200 
              ${activeTab === 'login'
                                ? 'text-cc-pista-800 bg-white/40 border-b-2 border-cc-pista-500'
                                : 'text-cc-pista-500 hover:bg-white/20 hover:text-cc-pista-800'}`}
                    >
                        LOGIN
                    </button>
                    <button
                        onClick={() => setActiveTab('signup')}
                        className={`flex-1 py-4 text-sm font-bold tracking-wide transition-colors duration-200 
              ${activeTab === 'signup'
                                ? 'text-cc-pista-800 bg-white/40 border-b-2 border-cc-pista-500'
                                : 'text-cc-pista-500 hover:bg-white/20 hover:text-cc-pista-800'}`}
                    >
                        SIGN UP
                    </button>
                </div>

                <div className="p-6 md:p-8">
                    {activeTab === 'login' ? (
                        <form onSubmit={handleLogin} className="space-y-6 animate-fadeIn">
                            <div className="space-y-4">
                                {/* Login As Selector */}
                                <div className="grid grid-cols-2 gap-3 p-1 bg-cc-beige-300/30 rounded-lg">
                                    <button
                                        type="button"
                                        onClick={() => setUserType('student')}
                                        className={`flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${userType === 'student' ? 'bg-white shadow-sm text-cc-pista-800' : 'text-cc-pista-500 hover:text-cc-pista-800'
                                            }`}
                                    >
                                        <User size={16} /> Student
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setUserType('parent')}
                                        className={`flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${userType === 'parent' ? 'bg-white shadow-sm text-cc-pista-800' : 'text-cc-pista-500 hover:text-cc-pista-800'
                                            }`}
                                    >
                                        <Shield size={16} /> Parent
                                    </button>
                                </div>

                                <Input
                                    label={userType === 'student' ? "Email / Mobile / PRN" : "Child's PRN Number"}
                                    placeholder={userType === 'student' ? "Enter your credentials" : "Enter PRN (e.g., 2023001)"}
                                    type="text"
                                    required
                                />

                                <div className="space-y-1">
                                    <Input
                                        label="Password"
                                        type="password"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <div className="flex justify-end">
                                        <Link href="#" className="text-xs text-cc-sky-500 hover:text-cc-sky-300 transition-colors font-medium">
                                            Forgot Password?
                                        </Link>
                                    </div>
                                </div>
                            </div>

                            {userType === 'parent' && (
                                <div className="bg-cc-sky-500/10 border border-cc-sky-300/30 rounded-lg p-3 flex items-start gap-3">
                                    <div className="bg-cc-sky-500 rounded-full p-0.5 mt-0.5"><div className="w-1 h-1 bg-white rounded-full"></div></div>
                                    <p className="text-xs text-cc-pista-500 leading-relaxed">
                                        Parents can log in directly using their child&apos;s PRN number to get instant tracking access.
                                    </p>
                                </div>
                            )}

                            <Button type="submit" size="lg" className="w-full group">
                                {userType === 'student' ? 'Login to Dashboard' : 'Track Bus'}
                                <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </form>
                    ) : (
                        <form className="space-y-4 animate-fadeIn" onSubmit={(e) => e.preventDefault()}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label="Full Name" placeholder="John Doe" required icon={<User size={16} />} />
                                <Input label="Mobile Number" placeholder="+91 98765..." required icon={<Phone size={16} />} />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label="PRN Number" placeholder="University PRN" required icon={<Hash size={16} />} />
                                <Input label="College Name" placeholder="Engineering College" required icon={<School size={16} />} />
                            </div>

                            <Input label="Semester" placeholder="e.g., 5th Semester" required icon={<GraduationCap size={16} />} />

                            <Input label="Email" type="email" placeholder="john@example.com" required icon={<Mail size={16} />} />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label="Password" type="password" placeholder="Create password" required />
                                <Input label="Confirm Password" type="password" placeholder="Confirm password" required />
                            </div>

                            <Button variant="primary" size="lg" className="w-full mt-2">
                                Create Account
                            </Button>

                            <p className="text-center text-xs text-cc-pista-500 mt-4">
                                Already have an account?{' '}
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('login')}
                                    className="text-cc-sky-500 font-bold hover:underline"
                                >
                                    Login here
                                </button>
                            </p>
                        </form>
                    )}
                </div>
            </Card>

            {/* Footer */}
            <footer className="absolute bottom-4 text-xs text-cc-pista-500/60 font-medium">
                © 2025 Campus Compass. Real-time Transit System.
            </footer>
        </main>
    );
}
