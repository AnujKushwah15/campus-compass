"use client";

import { useMemo } from 'react';

export default function RouteMap() {
    const nodes = useMemo(() => [
        { id: 1, name: 'Campus Gate', x: 10, y: 50, type: 'start' },
        { id: 2, name: 'Main Road', x: 30, y: 30, type: 'stop' },
        { id: 3, name: 'City Center', x: 50, y: 60, type: 'stop' },
        { id: 4, name: 'North Stop', x: 70, y: 40, type: 'stop' },
        { id: 5, name: 'Hostel', x: 90, y: 50, type: 'end' },
    ], []);

    return (
        <div className="w-full h-64 bg-white rounded-xl shadow-sm border border-cc-red-100 relative overflow-hidden">
            <div className="absolute top-2 left-2 z-10 bg-white/90 px-3 py-1 rounded-full text-xs font-bold text-cc-red-800 shadow-sm">
                Route #42: Campus Express
            </div>

            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* Connection Line */}
                <path
                    d="M10,50 L30,30 L50,60 L70,40 L90,50"
                    fill="none"
                    stroke="#FFCCCC"
                    strokeWidth="2"
                    strokeLinecap="round"
                />
                <path
                    d="M10,50 L30,30 L50,60"
                    fill="none"
                    stroke="#FF4D4D"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="animate-pulse"
                />

                {/* Nodes */}
                {nodes.map((node) => (
                    <g key={node.id} className="group cursor-pointer">
                        <circle
                            cx={node.x}
                            cy={node.y}
                            r="3"
                            fill={node.type === 'start' || node.type === 'end' ? '#CC0000' : 'white'}
                            stroke="#CC0000"
                            strokeWidth="1.5"
                            className="group-hover:scale-125 transition-transform origin-center"
                        />
                        {/* Label Tooltip (Always visible for now for clarity) */}
                        <text
                            x={node.x}
                            y={node.y + 8}
                            fontSize="3"
                            textAnchor="middle"
                            fill="#660000"
                            fontWeight="bold"
                        >
                            {node.name}
                        </text>
                    </g>
                ))}

                {/* Current Bus Position */}
                <circle cx="50" cy="60" r="4" fill="#FF4D4D" className="animate-ping opacity-75" />
                <circle cx="50" cy="60" r="2.5" fill="#990000" />
            </svg>
        </div>
    );
}
