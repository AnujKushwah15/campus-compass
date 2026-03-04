"use client";

import { useEffect } from "react";

export default function Error({ error, reset }) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error("Global Error Caught:", error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-2xl p-8 max-w-md shadow-sm">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-cc-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-2">
                    Something went wrong!
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mb-8">
                    An unexpected error occurred in the application. We've logged the issue.
                </p>
                <button
                    onClick={() => reset()}
                    className="w-full bg-cc-primary hover:bg-cc-primary-700 text-white font-medium py-3 px-4 rounded-xl transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-cc-primary focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                >
                    Try again
                </button>
            </div>
        </div>
    );
}
