import ProfileView from '@/features/profile/components/ProfileView';
import AdminGuard from '@/features/admin/components/AdminGuard';

export default function AdminProfilePage() {
    return (
        <AdminGuard>
            <ProfileView role="Admin" />
        </AdminGuard>
    );
}
