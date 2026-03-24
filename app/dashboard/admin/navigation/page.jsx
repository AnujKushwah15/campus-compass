import AdminGuard from "@/features/admin/components/AdminGuard";
import RouteNavigator from "@/features/navigation/components/RouteNavigator";

export const metadata = {
    title: "Route Navigator | Admin | Campus Compass",
    description: "Admin route navigation tool — find and plan routes using real-time road data.",
};

export default function AdminNavigationPage() {
    return (
        <AdminGuard>
            <RouteNavigator />
        </AdminGuard>
    );
}
