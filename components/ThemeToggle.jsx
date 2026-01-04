'use client';

import { useTheme } from '@/components/ThemeProvider';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle({ className = '' }) {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className={`p-2 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${theme === 'dark'
                ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700'
                : 'bg-secondary text-orange-500 hover:bg-secondary/80'
                } ${className}`}
            aria-label="Toggle Theme"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
            {theme === 'light' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
    );
}
