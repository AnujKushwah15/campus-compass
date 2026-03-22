import { Bus } from 'lucide-react';

export default function Logo() {
    return (
        <div className="flex items-center gap-3 select-none group">
            <div className="relative flex items-center justify-center w-12 h-12 bg-gradient-to-br from-cc-purple-500 to-cc-purple-700 rounded-xl shadow-lg shadow-cc-purple-500/30 text-white overflow-hidden transition-transform duration-300 transform group-hover:scale-105 group-hover:rotate-3">
                {/* Glass shine effect */}
                <div className="absolute top-0 right-0 w-8 h-8 bg-white/10 rounded-full blur-lg transform translate-x-1/2 -translate-y-1/2 pointer-events-none" />

                {/* Bus Icon */}
                <Bus className="w-7 h-7 relative z-10 drop-shadow-md" strokeWidth={1.5} />
            </div>
            <div className="flex flex-col">
                <span className="font-bold text-xl text-black dark:text-white leading-none tracking-tight group-hover:text-black/80 dark:group-hover:text-white/80 transition-colors">Campus</span>
                <span className="font-bold text-sm text-cc-purple-500 leading-none tracking-widest uppercase">Compass</span>
            </div>
        </div>
    );
}
