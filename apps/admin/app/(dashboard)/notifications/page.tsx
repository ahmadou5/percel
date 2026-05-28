'use client';

import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { adminNotifications } from '@/lib/admin-data';

export default function NotificationsPage() {
  const [audience, setAudience] = useState<'All users' | 'All drivers' | 'Specific user'>('All users');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const preview = useMemo(() => ({ audience, title: title || 'Notification title', body: body || 'Your push notification preview appears here.' }), [audience, title, body]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Broadcast notifications</h2>
        <p className="mt-1 text-sm text-muted-foreground">Send push updates to all users, all drivers, or one account.</p>
      </div>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-4 p-5">
          <div className="flex flex-wrap gap-2">
            {(['All users', 'All drivers', 'Specific user'] as const).map((item) => (
              <button key={item} onClick={() => setAudience(item)} className={item === audience ? 'rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground' : 'rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground'}>{item}</button>
            ))}
          </div>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Notification title" />
          <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Notification body" className="min-h-32 w-full rounded-2xl border border-border bg-background p-4 text-sm outline-none ring-0 placeholder:text-muted-foreground focus:border-primary" />
          <div className="flex flex-wrap gap-3">
            <Button>Send broadcast</Button>
            <Button variant="secondary">Save draft</Button>
          </div>
        </Card>

        <Card className="space-y-4 p-5">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">Preview</p>
          <div className="rounded-3xl border border-border bg-gradient-to-br from-background to-muted p-5">
            <Badge>{preview.audience}</Badge>
            <h3 className="mt-4 text-xl font-semibold tracking-tight">{preview.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{preview.body}</p>
          </div>
          <p className="text-xs text-muted-foreground">The live notification queue is already wired in the API; this panel gives ops a clear broadcast surface.</p>
        </Card>
      </section>

      <Card className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <tr>
              <th className="px-5 py-4">Audience</th>
              <th className="px-5 py-4">Title</th>
              <th className="px-5 py-4">Body</th>
              <th className="px-5 py-4">Sent</th>
            </tr>
          </thead>
          <tbody>
            {adminNotifications.map((item) => (
              <tr key={item.id} className="border-b border-border/70 last:border-b-0">
                <td className="px-5 py-4 font-medium">{item.channel}</td>
                <td className="px-5 py-4">{item.title}</td>
                <td className="px-5 py-4 text-muted-foreground">{item.body}</td>
                <td className="px-5 py-4 text-muted-foreground">{item.sentAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
