'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { AdminServiceArea } from '@/lib/admin-data';

interface ServiceAreasListProps {
  initialAreas: AdminServiceArea[];
}

export function ServiceAreasList({ initialAreas }: ServiceAreasListProps) {
  const router = useRouter();
  const [areas, setAreas] = useState<AdminServiceArea[]>(initialAreas);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [baseFareNgn, setBaseFareNgn] = useState(0);
  const [perKmNgn, setPerKmNgn] = useState(0);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setCity('');
    setState('');
    setBaseFareNgn(0);
    setPerKmNgn(0);
    setActive(false);
    setIsEditing(null);
    setError(null);
  };

  const handleEdit = (area: AdminServiceArea) => {
    setIsEditing(area.id);
    setCity(area.city);
    setState(area.state);
    setBaseFareNgn(area.baseFareNgn);
    setPerKmNgn(area.perKmNgn);
    setActive(area.active);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const url = isEditing
        ? `/api/admin/service-areas/${isEditing}`
        : '/api/admin/service-areas';
      const method = isEditing ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city, state, baseFareNgn: Number(baseFareNgn), perKmNgn: Number(perKmNgn), active }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Operation failed');
      }

      resetForm();
      router.refresh();
      // Reload page to reflect server component state
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service area?')) return;
    try {
      const response = await fetch(`/api/admin/service-areas/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Delete failed');
      router.refresh();
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-destructive/15 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">
          {isEditing ? 'Edit Service Area' : 'Create New Service Area'}
        </h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-5 items-end">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">City</label>
            <input
              type="text"
              required
              disabled={!!isEditing}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="e.g. Kano"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">State</label>
            <input
              type="text"
              required
              disabled={!!isEditing}
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="e.g. Kano"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Base Fare (₦)</label>
            <input
              type="number"
              required
              min="0"
              value={baseFareNgn}
              onChange={(e) => setBaseFareNgn(Number(e.target.value))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Per KM Rate (₦)</label>
            <input
              type="number"
              required
              min="0"
              value={perKmNgn}
              onChange={(e) => setPerKmNgn(Number(e.target.value))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2 items-center min-h-[40px]">
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="rounded border-input bg-background"
              />
              <span>Active Area</span>
            </label>
            <button
              type="submit"
              disabled={isSubmitting}
              className="ml-auto rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-md border border-input bg-background px-4 py-2 text-sm font-semibold hover:bg-muted"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <tr>
                <th className="px-5 py-4">City</th>
                <th className="px-5 py-4">State</th>
                <th className="px-5 py-4">Base Fare</th>
                <th className="px-5 py-4">Per KM Rate</th>
                <th className="px-5 py-4">Active</th>
                <th className="px-5 py-4">Active Drivers</th>
                <th className="px-5 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {areas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">
                    No local service areas configured yet.
                  </td>
                </tr>
              ) : (
                areas.map((area) => (
                  <tr key={area.id} className="border-b border-border/70 last:border-b-0 hover:bg-muted/30">
                    <td className="px-5 py-4 font-semibold">{area.city}</td>
                    <td className="px-5 py-4">{area.state}</td>
                    <td className="px-5 py-4">₦{area.baseFareNgn.toLocaleString()}</td>
                    <td className="px-5 py-4">₦{area.perKmNgn.toLocaleString()}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${area.active ? 'bg-success/10 text-success border border-success/20' : 'bg-muted text-muted-foreground border'}`}>
                        {area.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono">{area.driverCount}</td>
                    <td className="px-5 py-4 space-x-2">
                      <button
                        onClick={() => handleEdit(area)}
                        className="text-primary hover:underline text-sm font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(area.id)}
                        className="text-destructive hover:underline text-sm font-semibold"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
