import Link from "next/link";

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center">
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-3xl p-10 max-w-lg shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]">
                <div className="w-24 h-24 bg-cc-primary/10 dark:bg-cc-primary/20 rounded-full flex flex-col items-center justify-center mx-auto mb-6 relative overflow-hidden">
                    <span className="text-3xl font-black text-cc-primary dark:text-cc-primary-400 z-10 tracking-tighter">404</span>
                    <div className="absolute inset-0 bg-gradient-to-tr from-cc-primary/20 to-transparent opacity-50"></div>
                </div>

                <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3">
                    Page Not Found
                </h2>

                <p className="text-slate-500 dark:text-slate-400 mb-8 text-lg leading-relaxed">
                    We couldn't find the route you're looking for. It might have been moved or deleted.
                </p>

                <Link
                    href="/"
                    className="inline-flex items-center justify-center w-full sm:w-auto bg-cc-primary hover:bg-cc-primary-700 text-white font-semibold py-3 px-8 rounded-xl transition-all shadow-md active:scale-[0.98] ring-offset-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cc-primary dark:focus-visible:ring-cc-primary-400 dark:ring-offset-slate-900"
                >
                    Return Home
                </Link>
            </div>
        </div>
    );
}
