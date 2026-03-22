"use client";
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function Input({ label, error, icon, className = '', containerClassName = '', type = 'text', ...props }) {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
        <div className={`w-full space-y-1.5 ${containerClassName}`}>
            {label && (
                <label className="block text-xs font-bold text-cc-purple-500 ml-1 uppercase tracking-wider">
                    {label}
                </label>
            )}
            <div className="relative group">
                {icon && (
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-lg border border-cc-purple-500/50 bg-cc-purple-500/10 text-cc-purple-500 shadow-[0_0_8px_rgba(139,92,246,0.2)] pointer-events-none transition-all group-hover:bg-cc-purple-500/20 group-hover:shadow-[0_0_12px_rgba(139,92,246,0.3)]">
                        {icon}
                    </div>
                )}
                <input
                    type={inputType}
                    className={`w-full px-4 py-3 rounded-xl border bg-background/50 backdrop-blur-sm transition-all duration-200
          focus:outline-none focus:ring-2 text-foreground placeholder:text-muted-foreground/50 font-medium
          ${icon ? 'pl-14' : ''} ${isPassword ? 'pr-12' : ''}
          ${error
                            ? 'border-destructive focus:border-destructive focus:ring-destructive/30'
                            : 'border-cc-purple-200 dark:border-cc-purple-900/50 focus:border-cc-purple-500 focus:ring-cc-purple-500/20 hover:border-cc-purple-400'
                        } ${className}`}
                    {...props}
                />
                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-cc-purple-500 transition-colors p-1"
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                )}
            </div>
            {error && <span className="text-xs text-red-500 font-medium ml-1 animate-fadeIn">{error}</span>}
        </div>
    );
}
