"use client";
import React from 'react';
import { MapPin } from 'lucide-react';

export default function MockMap({ status = 'ontime' }) {
    return (
        <div className="relative w-full h-[400px] md:h-[500px] bg-[#E5E0D5] rounded-2xl overflow-hidden border border-white shadow-inner group">
            {/* Map Background Pattern (Simulating Streets) */}
            <svg className="absolute inset-0 w-full h-full opacity-30" preserveAspectRatio="xMidYMid slice">
                {/* Abstract Roads */}
                <path d="M-100,100 Q400,300 900,100 T1500,400" fill="none" stroke="white" strokeWidth="20" />
                <path d="M-100,100 Q400,300 900,100 T1500,400" fill="none" stroke="#D6D0C0" strokeWidth="12" />

                {/* Cross streets */}
                <path d="M400,0 L400,600" fill="none" stroke="white" strokeWidth="15" />
                <path d="M800,0 L800,600" fill="none" stroke="white" strokeWidth="10" />
            </svg>

            {/* Route Line (Highlighted) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <path d="M100,400 Q400,300 700,200" fill="none" stroke="#5B9BD5" strokeWidth="6" strokeLinecap="round" strokeDasharray="10 10" className="opacity-60" />
            </svg>

            {/* Bus Marker (Animated) */}
            <div className="absolute top-[35%] left-[45%] transform -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ease-in-out hover:scale-110 cursor-pointer z-20">
                <div className="relative">
                    {/* Pulse Effect */}
                    <div className={`absolute top-0 left-0 w-full h-full rounded-full animate-ping opacity-75 ${status === 'ontime' ? 'bg-cc-brown-400' : status === 'delayed' ? 'bg-amber-400' : 'bg-red-400'
                        }`}></div>

                    {/* Bus Icon Marker */}
                    <div className={`relative flex items-center justify-center w-12 h-12 rounded-full border-2 border-white shadow-lg text-white ${status === 'ontime' ? 'bg-cc-brown-600' : status === 'delayed' ? 'bg-amber-500' : 'bg-red-500'
                        }`}>
                        <div className="text-[10px] font-bold absolute -top-1 right-0 bg-white text-cc-pista-800 px-1 rounded-sm shadow-sm">
                            Bus 42
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6v6" /><path d="M15 6v6" /><path d="M2 12h19.6" /><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3" /><circle cx="7" cy="18" r="2" /><path d="M9 18h5" /><circle cx="16" cy="18" r="2" /></svg>
                    </div>

                    {/* Tooltip on Hover */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max bg-white/90 backdrop-blur px-3 py-1 rounded-lg text-xs font-semibold text-cc-pista-800 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm pointer-events-none">
                        Arriving in 5 mins
                    </div>
                </div>
            </div>

            {/* Campus Marker */}
            <div className="absolute top-[28%] left-[75%] z-10 flex flex-col items-center">
                <MapPin className="text-cc-pista-500 w-8 h-8 drop-shadow-md mb-1" fill="#708F59" />
                <span className="bg-white/80 px-2 py-0.5 rounded text-[10px] font-bold text-cc-pista-800 shadow-sm">CAMPUS</span>
            </div>

            {/* Home/Start Marker */}
            <div className="absolute bottom-[20%] left-[10%] z-10 flex flex-col items-center">
                <div className="w-4 h-4 rounded-full bg-cc-pista-800 border-2 border-white shadow-md mb-1"></div>
                <span className="bg-white/80 px-2 py-0.5 rounded text-[10px] font-bold text-cc-pista-800 shadow-sm">START</span>
            </div>
        </div>
    );
}
