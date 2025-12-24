import Navbar from '@/components/Navbar';

export default function DashboardLayout({
    children,
}) {
    return (
        <div className="min-h-screen bg-cc-beige-200">
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                {children}
            </main>
        </div>
    );
}
