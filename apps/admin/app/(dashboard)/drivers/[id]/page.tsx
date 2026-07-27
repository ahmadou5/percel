import { notFound } from 'next/navigation';

import { getDriverDetail } from '@/lib/admin-data';
import { DriverDetailView } from '@/components/driver-detail-view';

export default async function DriverDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const driver = await getDriverDetail(id);
  if (!driver) notFound();

  return <DriverDetailView initialDriver={driver} />;
}
