export default function Badge({ children, variant = 'neutral', className = '' }) {
    const styles = {
        success: "bg-cc-brown-400/20 text-cc-brown-600 border-cc-brown-600/30",
        warning: "bg-amber-100 text-amber-700 border-amber-500/30",
        danger: "bg-red-100 text-red-700 border-red-500/30",
        neutral: "bg-cc-beige-300/50 text-cc-pista-800 border-cc-pista-800/20",
        info: "bg-cc-sky-300/20 text-cc-sky-500 border-cc-sky-500/30"
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[variant]} ${className}`}>
            {children}
        </span>
    );
}
