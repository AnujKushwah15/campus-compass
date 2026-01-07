"use client";

import dynamic from 'next/dynamic';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

const LiveMap = dynamic(() => import('@/components/ui/LiveMap'), { ssr: false });
import AnimatedCounter from '@/components/ui/AnimatedCounter';
import { Phone, Clock, MapPin } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function StudentDashboard() {
    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Page Header & Status */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-cc-purple-500">Live Tracking</h1>
                    <p className="text-muted-foreground text-sm">Bus No. 42 • Route 3 (West City)</p>
                </div>

                <div className="flex items-center gap-3">
                    <Card className="flex items-center gap-3 !py-2 !px-4 bg-card/60 border border-cc-purple-500 shadow-[0_0_10px_rgba(139,92,246,0.2)] opacity-0 animate-pop-in delay-75" padding="none">
                        <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></div>
                        <span className="text-sm font-semibold text-cc-purple-500">Status: On Time</span>
                    </Card>
                    <Button variant="ghost" size="sm" className="hidden md:flex items-center gap-2 border border-cc-purple-500 hover:shadow-[0_0_15px_rgba(139,92,246,0.5)] transition-all duration-300 text-cc-purple-500 hover:bg-cc-purple-500/10 opacity-0 animate-pop-in delay-150">
                        <span className="w-2 h-2 rounded-full border border-cc-purple-500 bg-cc-purple-500/30 shadow-[0_0_5px_rgba(139,92,246,0.5)]"></span> Refresh
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Map Section */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="h-[400px] w-full rounded-2xl overflow-hidden border border-border relative z-0">
                        <LiveMap busLocation={{ lat: 23.0325, lng: 72.5814, speed: 30 }} />
                    </div>

                    {/* Quick Status Bar below map on mobile, or generally useful */}
                    <div className="flex items-center gap-2 p-3 bg-accent/10 border border-cc-purple-500 rounded-lg text-sm text-foreground">
                        <CheckCircleIcon className="w-5 h-5 text-accent" />
                        <span className="font-medium">Bus is running on schedule. Expected to reach campus by 08:45 AM.</span>
                    </div>
                </div>

                {/* Info Sidebar */}
                <div className="space-y-4">
                    {/* ETA Card */}
                    <Card className="bg-gradient-to-br from-card to-muted border-cc-purple-500 opacity-0 animate-pop-in delay-100">
                        <div className="flex items-start justify-between mb-2">
                            <span className="text-xs font-bold text-cc-purple-500 uppercase tracking-wider">Estimated Arrival</span>
                            <div className="p-2 bg-cc-purple-500/10 text-cc-purple-500 rounded-full border border-cc-purple-500/50 shadow-[0_0_10px_rgba(139,92,246,0.3)]">
                                <Clock size={18} />
                            </div>
                        </div>
                        <div className="text-3xl font-bold text-foreground mb-1"><AnimatedCounter end={12} duration={2000} /> <span className="text-lg font-medium text-muted-foreground">mins</span></div>
                        <p className="text-sm text-muted-foreground">to College Campus Stop</p>

                        <div className="mt-4 pt-4 border-t border-border space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-secondary"></div>
                                    <div className="w-0.5 h-6 bg-foreground/10"></div>
                                </div>
                                <div>
                                    <p className="text-xs text-cc-purple-400">Current Stop</p>
                                    <p className="text-sm font-semibold text-foreground">Central Library</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col items-center gap-1">
                                    <div className="w-2 h-2 rounded-full border-2 border-accent bg-background"></div>
                                </div>
                                <div>
                                    <p className="text-xs text-cc-purple-400">Next Stop</p>
                                    <p className="text-sm font-semibold text-foreground">Stadium Road</p>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Driver Info Card */}
                    <Card className="border-cc-purple-500 shadow-[0_0_20px_rgba(139,92,246,0.15)] opacity-0 animate-pop-in delay-200">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-xl">👨‍✈️</div>
                            <div>
                                <p className="font-bold text-cc-purple-500">Rajesh Kumar</p>
                                <Badge variant="neutral">Driver</Badge>
                            </div>
                        </div>

                        <div className="flex items-center justify-between bg-background/50 p-3 rounded-lg border border-border">
                            <div className="flex items-center gap-2 text-sm text-foreground">
                                <div className="p-1.5 bg-cc-purple-500/10 text-cc-purple-500 rounded-full border border-cc-purple-500/50 shadow-[0_0_10px_rgba(139,92,246,0.3)]">
                                    <Phone size={14} />
                                </div>
                                +91 98765 43210
                            </div>
                            <button className="p-2 bg-accent text-accent-foreground rounded-full hover:bg-accent/80 transition-colors shadow-sm cursor-pointer">
                                <Phone size={16} />
                            </button>
                        </div>
                    </Card>

                    {/* Route Summary */}
                    <Card padding="sm" className="bg-secondary/5 border-cc-purple-500 opacity-0 animate-pop-in delay-300">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-cc-purple-500/10 text-cc-purple-500 rounded-full border border-cc-purple-500/50 shadow-[0_0_10px_rgba(139,92,246,0.3)]">
                                <MapPin size={14} />
                            </div>
                            <span className="text-xs font-bold text-cc-purple-500 uppercase">Route Details</span>
                        </div>
                        <div className="flex items-center justify-between text-sm font-medium text-foreground">
                            <span>Shivajinagar</span>
                            <ArrowRightIcon className="w-4 h-4 text-muted-foreground/50" />
                            <span>College Campus</span>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function CheckCircleIcon({ className }) {
    return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
}

function ArrowRightIcon({ className }) {
    return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
}
