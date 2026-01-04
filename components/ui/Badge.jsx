export default function Badge({ children, variant = 'neutral', className = '' }) {
    const styles = {
        success: "bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400 dark:border-green-400/30",
        warning: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400 dark:border-amber-400/30",
        danger: "bg-destructive/10 text-destructive border-destructive/20",
        neutral: "bg-secondary/10 text-secondary-foreground border-secondary/20",
        info: "bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400 dark:border-sky-400/30"
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[variant]} ${className}`}>
            {children}
        </span>
    );
}
