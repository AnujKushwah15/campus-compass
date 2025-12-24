"use client";

import MockMap from '@/components/MockMap';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Phone, Clock, MapPin } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function StudentDashboard() {
    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Page Header & Status */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-cc-pista-800">Live Tracking</h1>
                    <p className="text-cc-pista-500 text-sm">Bus No. 42 • Route 3 (West City)</p>
                </div>

                <div className="flex items-center gap-3">
                    <Card className="flex items-center gap-3 !py-2 !px-4 bg-white/60" padding="none">
                        <div className="w-2.5 h-2.5 rounded-full bg-cc-brown-400 animate-pulse"></div>
                        <span className="text-sm font-semibold text-cc-pista-800">Status: On Time</span>
                    </Card>
                    <Button variant="ghost" size="sm" className="hidden md:flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full border border-cc-pista-800/40"></span> Refresh
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Map Section */}
                <div className="lg:col-span-2 space-y-4">
                    <MockMap status="ontime" />

                    {/* Quick Status Bar below map on mobile, or generally useful */}
                    <div className="flex items-center gap-2 p-3 bg-cc-brown-400/10 border border-cc-brown-400/20 rounded-lg text-sm text-cc-pista-800">
                        <CheckCircleIcon className="w-5 h-5 text-cc-brown-600" />
                        <span className="font-medium">Bus is running on schedule. Expected to reach campus by 08:45 AM.</span>
                    </div>
                </div>

                {/* Info Sidebar */}
                <div className="space-y-4">
                    {/* ETA Card */}
                    <Card className="bg-gradient-to-br from-white to-cc-beige-100">
                        <div className="flex items-start justify-between mb-2">
                            <span className="text-xs font-bold text-cc-pista-500 uppercase tracking-wider">Estimated Arrival</span>
                            <Clock size={18} className="text-cc-sky-500" />
                        </div>
                        <div className="text-3xl font-bold text-cc-pista-800 mb-1">12 <span className="text-lg font-medium text-cc-pista-500">mins</span></div>
                        <p className="text-sm text-cc-pista-500">to College Campus Stop</p>

                        <div className="mt-4 pt-4 border-t border-cc-pista-800/5 space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-cc-sky-300"></div>
                                    <div className="w-0.5 h-6 bg-cc-pista-800/10"></div>
                                </div>
                                <div>
                                    <p className="text-xs text-cc-pista-500">Current Stop</p>
                                    <p className="text-sm font-semibold text-cc-pista-800">Central Library</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col items-center gap-1">
                                    <div className="w-2 h-2 rounded-full border-2 border-cc-brown-400 bg-white"></div>
                                </div>
                                <div>
                                    <p className="text-xs text-cc-pista-500">Next Stop</p>
                                    <p className="text-sm font-semibold text-cc-pista-800">Stadium Road</p>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Driver Info Card */}
                    <Card>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-full bg-cc-pista-200 flex items-center justify-center text-xl">👨‍✈️</div>
                            <div>
                                <p className="font-bold text-cc-pista-800">Rajesh Kumar</p>
                                <Badge variant="neutral">Driver</Badge>
                            </div>
                        </div>

                        <div className="flex items-center justify-between bg-white/50 p-3 rounded-lg border border-white">
                            <div className="flex items-center gap-2 text-sm text-cc-pista-800">
                                <Phone size={16} className="text-cc-pista-500" />
                                +91 98765 43210
                            </div>
                            <button className="p-2 bg-cc-brown-400 text-white rounded-full hover:bg-cc-brown-600 transition-colors shadow-sm cursor-pointer">
                                <Phone size={16} />
                            </button>
                        </div>
                    </Card>

                    {/* Route Summary */}
                    <Card padding="sm" className="bg-cc-sky-500/5 border-cc-sky-300/20">
                        <div className="flex items-center gap-2 mb-2">
                            <MapPin size={16} className="text-cc-sky-500" />
                            <span className="text-xs font-bold text-cc-sky-500 uppercase">Route Details</span>
                        </div>
                        <div className="flex items-center justify-between text-sm font-medium text-cc-pista-800">
                            <span>Shivajinagar</span>
                            <ArrowRightIcon className="w-4 h-4 text-cc-pista-500/50" />
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
