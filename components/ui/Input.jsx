export default function Input({ label, error, icon, className = '', ...props }) {
    return (
        <div className="w-full space-y-1.5">
            <label className="block text-sm font-semibold text-cc-pista-800 ml-1">
                {label}
            </label>
            <div className="relative">
                {icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-cc-pista-500 pointer-events-none">
                        {icon}
                    </div>
                )}
                <input
                    className={`w-full px-4 py-2.5 rounded-lg border bg-white/50 backdrop-blur-sm transition-all duration-200
          focus:outline-none focus:ring-2 text-cc-pista-900 placeholder:text-cc-pista-500/50
          ${icon ? 'pl-10' : ''}
          ${error
                            ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                            : 'border-cc-beige-300 focus:border-cc-pista-500 focus:ring-cc-pista-500/20 hover:border-cc-pista-500/50'
                        } ${className}`}
                    {...props}
                />
            </div>
            {error && <span className="text-xs text-red-500 font-medium ml-1 animate-fadeIn">{error}</span>}
        </div>
    );
}
