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
      bg-card border border-border text-card-foreground shadow-sm rounded-2xl
      ${hoverEffect ? 'hover:shadow-glow hover:-translate-y-1 transition-all duration-300' : ''}
      ${paddings[padding]}
      ${className}
    `}>
            {children}
        </div>
    );
}

