"use client";

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import MockMap from '@/components/MockMap';
import Badge from '@/components/ui/Badge';
import { Search, MapPin, Phone, ShieldCheck, Video } from 'lucide-react';

export default function ParentDashboard() {
    const [isTracking, setIsTracking] = useState(false);
    const [prn, setPrn] = useState('');
    const [showLiveFeed, setShowLiveFeed] = useState(false);

    const handleTrack = (e) => {
        e.preventDefault();
        if (prn.length > 0) {
            setIsTracking(true);
        }
    };

    if (showLiveFeed) {
        return (
            <div className="fixed inset-0 z-50 bg-background/95 flex flex-col items-center justify-center animate-fadeIn">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <h2 className="text-foreground text-xl font-bold tracking-widest animate-pulse">LOADING LIVE FEED...</h2>
                <button
                    onClick={() => setShowLiveFeed(false)}
                    className="mt-8 text-muted-foreground hover:text-foreground text-sm underline"
                >
                    Cancel
                </button>
            </div>
        );
    }

    if (!isTracking) {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center animate-fadeIn">
                <div className="text-center mb-8 space-y-2">
                    <h1 className="text-3xl font-bold text-foreground">Track Your Child&apos;s Bus</h1>
                    <p className="text-muted-foreground max-w-md mx-auto">
                        Enter your child&apos;s PRN number to get real-time location updates and safety status.
                    </p>
                </div>

                <Card className="w-full max-w-md bg-white/70 backdrop-blur-xl shadow-glow">
                    <form onSubmit={handleTrack} className="space-y-4">
                        <Input
                            label="Student PRN Number"
                            placeholder="e.g., 2023001"
                            value={prn}
                            onChange={(e) => setPrn(e.target.value)}
                            icon={<Search size={18} />}
                            required
                        />
                        <Button size="lg" className="w-full mt-2 group">
                            Find Bus <MapPin size={18} className="ml-2 group-hover:animate-bounce" />
                        </Button>
                    </form>
                    <div className="mt-6 flex items-start gap-3 p-3 bg-secondary/10 rounded-lg">
                        <ShieldCheck className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            <span className="font-semibold text-secondary-foreground">Secure Tracking:</span> Only parents with a valid PRN can access live location data. Verification is instant.
                        </p>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsTracking(false)}
                        className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground"
                    >
                        ← Back
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Tracking: Rohan Sharma</h1>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="font-medium bg-muted px-2 rounded">PRN: {prn}</span>
                            <span>•</span>
                            <span>5th Semester, Computer Engineering</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Live Map */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-card/60 backdrop-blur-sm border border-border p-4 rounded-2xl shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-accent rounded-full animate-pulse"></div>
                            <h2 className="text-lg font-bold text-foreground">Bus is approaching your stop</h2>
                        </div>
                        <Badge variant="success">On Time</Badge>
                    </div>

                    <MockMap status="ontime" />

                    {/* Friendly Status Message */}
                    <div className="p-4 bg-secondary/10 border border-secondary/30 rounded-xl">
                        <p className="text-foreground font-medium text-center">
                            &quot;Don&apos;t worry! The bus has left the campus and is moving smoothly. Approx 10 minutes to reach stop.&quot;
                        </p>
                    </div>
                </div>

                {/* Info Panel */}
                <div className="space-y-4">
                    {/* Driver Details (Prominent) */}
                    <Card padding="sm" className="bg-primary text-primary-foreground shadow-lg overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-bl-full -mr-4 -mt-4"></div>
                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl border-2 border-white/50">
                                    👨‍✈️
                                </div>
                                <div>
                                    <p className="text-xs opacity-80 mb-0.5 uppercase tracking-wider">Driver Details</p>
                                    <p className="font-bold text-lg leading-tight">Rajesh Kumar</p>
                                    <div className="flex items-center gap-1 text-xs opacity-90 mt-0.5">
                                        <span>⭐ 4.8</span>
                                        <span>•</span>
                                        <span>+91 98765 43210</span>
                                    </div>
                                </div>
                            </div>
                            <button className="bg-background text-foreground p-2.5 rounded-full hover:bg-muted transition-colors shadow-lg active:scale-95">
                                <Phone size={20} />
                            </button>
                        </div>
                    </Card>

                    {/* Request Live Feed Button */}
                    <Button
                        variant="danger"
                        className="w-full flex items-center justify-center gap-2 shadow-md animate-pulse"
                        onClick={() => setShowLiveFeed(true)}
                    >
                        <Video size={18} />
                        Request Live Feed
                    </Button>

                    <Card>
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Live Status</h3>
                        <div className="space-y-6 relative">
                            {/* Timeline */}
                            <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-muted"></div>

                            <TimelineItem
                                status="completed"
                                time="05:10 PM"
                                title="Left Campus"
                                desc="Bus departed from main gate"
                            />
                            <TimelineItem
                                status="current"
                                time="05:25 PM"
                                title="Approaching Shivaji Park"
                                desc="Current Location (Traffic: Low)"
                            />
                            <TimelineItem
                                status="upcoming"
                                time="05:35 PM"
                                title="Your Stop: Residence Area"
                                desc="Estimated Arrival"
                            />
                        </div>
                    </Card>

                    {/* Bus Info */}
                    <Card padding="sm" className="bg-secondary/10 border-secondary/20">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-foreground font-medium">Bus Number</span>
                            <Badge variant="info">MH 12 AB 1234</Badge>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function TimelineItem({ time, title, desc, status }) {
    const dotStyles = {
        completed: "bg-accent ring-4 ring-accent/30",
        current: "bg-secondary ring-4 ring-secondary/30 animate-pulse",
        upcoming: "bg-background border-2 border-muted"
    };

    return (
        <div className={`relative pl-8 ${status === 'upcoming' ? 'opacity-60' : ''}`}>
            <div className={`absolute left-0 top-1.5 w-5 h-5 rounded-full z-10 ${dotStyles[status]}`}></div>
            <div className="flex flex-col">
                <span className="text-xs font-bold opacity-60 mb-0.5">{time}</span>
                <span className={`text-sm font-bold ${status === 'current' ? 'text-secondary' : 'text-foreground'}`}>{title}</span>
                <span className="text-xs text-muted-foreground">{desc}</span>
            </div>
        </div>
    );
}
