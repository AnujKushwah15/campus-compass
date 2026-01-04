'use client';
import { useEffect, useState } from 'react';

export default function TextReveal({ text, className = '', delay = 0 }) {
    const [visibleWords, setVisibleWords] = useState(0);
    const words = text.split(' ');

    useEffect(() => {
        let timeout;
        const startDelay = setTimeout(() => {
            const interval = setInterval(() => {
                setVisibleWords(prev => {
                    if (prev < words.length) {
                        return prev + 1;
                    }
                    clearInterval(interval);
                    return prev;
                });
            }, 50); // Speed of word reveal

            return () => clearInterval(interval);
        }, delay);

        return () => clearTimeout(startDelay);
    }, [text, delay, words.length]);

    return (
        <p className={className}>
            {words.map((word, index) => (
                <span
                    key={index}
                    className={`inline-block transition-all duration-500 ease-out transform ${index < visibleWords
                        ? 'opacity-100 translate-y-0 blur-0'
                        : 'opacity-0 translate-y-4 blur-sm'
                        }`}
                    style={{ transitionDelay: `${index * 30}ms`, marginRight: '0.25em' }}
                >
                    {word}
                </span>
            ))}
        </p>
    );
}
