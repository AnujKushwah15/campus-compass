export default function Button({
    variant = 'primary',
    size = 'md',
    children,
    className = '',
    isLoading,
    ...props
}) {

    const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-70 disabled:cursor-not-allowed";

    const variants = {
        primary: "bg-cc-pista-500 text-white hover:bg-cc-pista-800 shadow-md hover:shadow-glow active:transform active:scale-95 focus:ring-cc-pista-500",
        secondary: "bg-white border-2 border-cc-pista-500 text-cc-pista-800 hover:bg-cc-beige-200 focus:ring-cc-pista-500",
        ghost: "text-cc-pista-800 hover:bg-cc-pista-500/10 focus:ring-cc-pista-500",
        danger: "bg-red-500 text-white hover:bg-red-600 focus:ring-red-500"
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
