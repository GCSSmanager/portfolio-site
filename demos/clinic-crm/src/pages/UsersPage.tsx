import { PageHeader } from "../components/ui";
import { UsersManagement } from "../components/UsersManagement";

export function UsersPage() {
  return (
    <div className="max-w-4xl p-4 sm:p-6">
      <PageHeader title="Пользователи" />
      <UsersManagement />
    </div>
  );
}
