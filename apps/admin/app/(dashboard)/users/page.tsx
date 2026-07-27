import { loadDashboardUsers } from '@/lib/admin-data';
import { UsersManagementTable } from '@/components/users-management-table';

export default async function UsersPage() {
  const users = await loadDashboardUsers();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">User management</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Live customer and platform user accounts from the Percel API.
        </p>
      </div>
      <UsersManagementTable initialUsers={users} />
    </div>
  );
}

