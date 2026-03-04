import AdminDashboard from "@/components/admin/AdminDashboard";

export default function AdminPage() {
    return (
        <div className="space-y-6">
            <header className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight">Active Edge Nodes</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Real-time telemetry and arbitration status for all connected bus hardware.</p>
            </header>

            <AdminDashboard />
        </div>
    );
}
