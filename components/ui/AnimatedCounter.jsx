'use client';
import { useEffect, useState } from 'react';

export default function AnimatedCounter({ end, duration = 1500, suffix = '', decimals = 0, delay = 0 }) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let startTime = null;
        let animationFrameId;
        let timeoutId;

        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            const percentage = Math.min(progress / duration, 1);

            // Ease out quart function
            const ease = 1 - Math.pow(1 - percentage, 4);

            setCount(ease * end);

            if (percentage < 1) {
                animationFrameId = window.requestAnimationFrame(animate);
            }
        };

        if (delay > 0) {
            timeoutId = setTimeout(() => {
                animationFrameId = window.requestAnimationFrame(animate);
            }, delay);
        } else {
            animationFrameId = window.requestAnimationFrame(animate);
        }

        return () => {
            if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [end, duration, delay]);

    return (
        <span>
            {count.toFixed(decimals)}{suffix}
        </span>
    );
}
