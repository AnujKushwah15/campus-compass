'use client';
import { useState, useEffect } from 'react';

export default function TypewriterText({ text, speed = 30, className = '' }) {
    const [displayedText, setDisplayedText] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (currentIndex < text.length) {
            const timeout = setTimeout(() => {
                setDisplayedText(prev => prev + text[currentIndex]);
                setCurrentIndex(prev => prev + 1);
            }, speed);

            return () => clearTimeout(timeout);
        }
    }, [currentIndex, text, speed]);

    return (
        <p className={className}>
            {displayedText}
            {currentIndex < text.length && (
                <span className="animate-pulse text-primary ml-0.5">|</span>
            )}
        </p>
    );
}
