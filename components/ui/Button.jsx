export default function Button({
    variant = 'primary',
    size = 'md',
    children,
    className = '',
    isLoading,
    ...props
}) {

    const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-70 disabled:cursor-not-allowed border border-foreground/20 dark:border-white/20 shadow-sm";

    const variants = {
        primary: "bg-primary text-primary-foreground hover:opacity-90 hover:shadow-glow active:transform active:scale-95 focus:ring-primary",
        secondary: "bg-background border-primary/50 text-primary hover:bg-muted focus:ring-primary",
        outline: "bg-transparent text-foreground hover:bg-muted focus:ring-primary",
        ghost: "text-foreground hover:bg-muted focus:ring-primary",
        danger: "bg-red-500 text-white hover:bg-red-600 focus:ring-red-500 border-red-600/50",
        warning: "bg-yellow-500 text-white hover:bg-yellow-600 focus:ring-yellow-500 border-yellow-600/50"
    };

    const sizes = {
        sm: "px-3 py-1.5 text-sm",
        md: "px-5 py-2.5 text-base",
        lg: "px-6 py-3.5 text-lg w-full sm:w-auto"
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={isLoading || props.disabled}
            {...props}
        >
            {isLoading ? (
                <span className="animate-pulse">Processing...</span>
            ) : children}
        </button>
    );
}

