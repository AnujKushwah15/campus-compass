export default function Input({ label, error, icon, className = '', containerClassName = '', ...props }) {
    return (
        <div className={`w-full space-y-1.5 ${containerClassName}`}>
            <label className="block text-xs font-bold text-cc-purple-500 ml-1 uppercase tracking-wider">
                {label}
            </label>
            <div className="relative group">
                {icon && (
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-lg border border-cc-purple-500/50 bg-cc-purple-500/10 text-cc-purple-500 shadow-[0_0_8px_rgba(139,92,246,0.2)] pointer-events-none transition-all group-hover:bg-cc-purple-500/20 group-hover:shadow-[0_0_12px_rgba(139,92,246,0.3)]">
                        {icon}
                    </div>
                )}
                <input
                    className={`w-full px-4 py-3 rounded-xl border bg-background/50 backdrop-blur-sm transition-all duration-200
          focus:outline-none focus:ring-2 text-foreground placeholder:text-muted-foreground/50 font-medium
          ${icon ? 'pl-14' : ''}
          ${error
                            ? 'border-destructive focus:border-destructive focus:ring-destructive/30'
                            : 'border-cc-purple-200 dark:border-cc-purple-900/50 focus:border-cc-purple-500 focus:ring-cc-purple-500/20 hover:border-cc-purple-400'
                        } ${className}`}
                    {...props}
                />
            </div>
            {error && <span className="text-xs text-red-500 font-medium ml-1 animate-fadeIn">{error}</span>}
        </div>
    );
}
