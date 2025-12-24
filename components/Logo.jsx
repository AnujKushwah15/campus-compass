import { MapPin, BusFront } from 'lucide-react';

export default function Logo() {
    return (
        <div className="flex items-center gap-2 select-none group">
            <div className="relative flex items-center justify-center w-10 h-10 bg-cc-pista-500 rounded-xl shadow-glow text-white overflow-hidden transition-transform transform group-hover:scale-105">
                {/* Abstract "tech" circles in background */}
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-white/20 rounded-full blur-[1px]" />

                {/* Overlapping icons to create a unique mark */}
                <MapPin className="w-5 h-5 absolute text-cc-sky-300 transform -translate-y-1 translate-x-1" />
                <BusFront className="w-6 h-6 z-10 relative" />
            </div>
            <div className="flex flex-col leading-none">
                <span className="font-bold text-lg text-cc-pista-800 tracking-tight">Campus</span>
                <span className="font-medium text-sm text-cc-pista-500 tracking-wider uppercase">Compass</span>
            </div>
        </div>
    );
}
