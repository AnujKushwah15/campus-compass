export default function Card({
    children,
    className = '',
    padding = 'md',
    hoverEffect = false
}) {

    const paddings = {
        none: "",
        sm: "p-3",
        md: "p-5",
        lg: "p-8"
    };

    return (
        <div className={`
      glass-panel rounded-2xl border border-white/60 shadow-sm
      ${hoverEffect ? 'hover:shadow-glow hover:-translate-y-1 transition-all duration-300' : ''}
      ${paddings[padding]}
      ${className}
    `}>
            {children}
        </div>
    );
}
