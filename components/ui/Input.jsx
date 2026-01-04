export default function Input({ label, error, icon, className = '', ...props }) {
    return (
        <div className="w-full space-y-1.5">
            <label className="block text-sm font-semibold text-foreground ml-1">
                {label}
            </label>
            <div className="relative">
                {icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                        {icon}
                    </div>
                )}
                <input
                    className={`w-full px-4 py-2.5 rounded-lg border bg-background/50 backdrop-blur-sm transition-all duration-200
          focus:outline-none focus:ring-2 text-foreground placeholder:text-muted-foreground/50
          ${icon ? 'pl-10' : ''}
          ${error
                            ? 'border-destructive focus:border-destructive focus:ring-destructive/30'
                            : 'border-input focus:border-primary focus:ring-primary/20 hover:border-primary/50'
                        } ${className}`}
                    {...props}
                />
            </div>
            {error && <span className="text-xs text-red-500 font-medium ml-1 animate-fadeIn">{error}</span>}
        </div>
    );
}
