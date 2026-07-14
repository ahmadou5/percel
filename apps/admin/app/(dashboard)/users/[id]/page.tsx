import { notFound } from 'next/navigation';

import { getUserDetail } from '@/lib/admin-data';
import { UserDetailView } from '@/components/user-detail-view';

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUserDetail(id);
  if (!user) notFound();

  return <UserDetailView initialUser={user} />;
}
