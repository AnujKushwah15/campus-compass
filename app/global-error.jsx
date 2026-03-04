"use client";

import { useEffect } from "react";
import "./globals.css"; // Ensure CSS is loaded even if root panics

export default function GlobalError({ error, reset }) {
    useEffect(() => {
        console.error("Critical Global Panic:", error);
    }, [error]);

    return (
        <html lang="en">
            <body className="bg-cc-beige-100 dark:bg-slate-900 antialiased font-sans flex flex-col items-center justify-center min-h-screen text-center p-4">
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-10 max-w-lg shadow-xl">
                    <div className="w-20 h-20 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                        <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3">
                        Critical System Error
                    </h1>
                    <p className="text-slate-600 dark:text-slate-300 mb-8 text-lg">
                        A catastrophic error prevented the application from rendering.
                    </p>
                    <button
                        onClick={() => reset()}
                        className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-semibold py-3 px-8 rounded-xl transition-all shadow-md active:scale-95"
                    >
                        Reboot Interface
                    </button>
                </div>
            </body>
        </html>
    );
}
