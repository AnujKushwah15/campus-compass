'use client';

import { useTheme } from '@/components/ThemeProvider';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle({ className = '' }) {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className={`p-2 rounded-full transition-all duration-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cc-purple-500 bg-cc-purple-500 text-white hover:bg-cc-purple-600 ${className}`}
            aria-label="Toggle Theme"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
            {theme === 'light' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
    );
}
