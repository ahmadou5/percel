import { notFound } from 'next/navigation';
import Link from 'next/link';

import { Card } from '@/components/ui/card';
import { DetailActions } from '@/components/ui/detail-actions';
import { getDriverDetail } from '@/lib/admin-data';
import { ArrowLeft, FileCheck, FileX, AlertCircle } from 'lucide-react';

export default async function KycVerificationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const driver = await getDriverDetail(id);
  
  if (!driver) notFound();

  const isPending = driver.kyc === 'SUBMITTED' || driver.kyc === 'PENDING';

  const actions = isPending ? [
    { label: 'Approve KYC', tone: 'default' as const, actionUrl: `/api/admin/drivers/${id}/approve-kyc`, successMessage: `${driver.name} KYC approved.` },
    { label: 'Reject KYC', tone: 'danger' as const, prompt: 'Rejection reason', actionUrl: `/api/admin/drivers/${id}/reject-kyc`, successMessage: `${driver.name} KYC rejected.` },
  ] : [];

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/70 pb-4">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Link href="/dashboard" className="text-xs hover:text-foreground transition-colors">Dashboard</Link>
            <span>/</span>
            <Link href="/drivers" className="text-xs hover:text-foreground transition-colors">Drivers</Link>
            <span>/</span>
            <Link href={`/drivers/${driver.id}`} className="text-xs hover:text-foreground transition-colors">{driver.name}</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">KYC Verification</h2>
            <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
              driver.kyc === 'VERIFIED' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' :
              isPending ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' :
              'border-rose-500/30 bg-rose-500/10 text-rose-400'
            }`}>
              {driver.kyc}
            </span>
          </div>
        </div>
        
        {isPending && (
          <DetailActions actions={actions} />
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        {/* Main Document Viewer */}
        <div className="space-y-6">
          <Card className="p-6 border-border/80 shadow-xs">
            <div className="flex items-center gap-2 border-b border-border/50 pb-3 mb-4">
              <FileCheck className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Submitted Documents</h3>
            </div>
            
            <div className="space-y-6">
              {(driver.kycDocuments ?? []).length > 0 ? (
                (driver.kycDocuments ?? []).map((item, i) => (
                  <div key={i} className="rounded-xl border border-border/50 bg-muted/20 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{item.label}</p>
                    {item.value.startsWith('http') ? (
                      <div className="aspect-[4/3] w-full overflow-hidden rounded-lg border border-border/50 bg-black/5 flex items-center justify-center">
                        {/* Assuming some are images */}
                        <img src={item.value} alt={item.label} className="object-contain w-full h-full max-h-[400px]" onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement!.innerHTML = `<div class="text-sm text-muted-foreground p-4 break-all flex flex-col items-center gap-2"><FileCheck class="h-6 w-6"/> <a href="${item.value}" target="_blank" class="text-primary hover:underline">View Document</a></div>`;
                        }} />
                      </div>
                    ) : (
                      <p className="font-mono text-sm text-foreground break-all">{item.value}</p>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-border/50 rounded-xl bg-muted/10">
                  <FileX className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium text-foreground">No documents uploaded</p>
                  <p className="text-xs text-muted-foreground text-center mt-1">This driver has not submitted any KYC documents yet.</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar Context */}
        <div className="space-y-6">
          <Card className="p-5 border-border/80 shadow-xs">
            <h4 className="text-sm font-bold border-b border-border/50 pb-2 mb-3">Applicant Details</h4>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Full Name</p>
                <p className="text-sm font-semibold">{driver.name}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Contact</p>
                <p className="text-sm">{driver.email}</p>
                <p className="text-sm">{driver.phone}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Vehicle Details</p>
                <p className="text-sm">{driver.vehicle}</p>
              </div>
            </div>
          </Card>

          {driver.kycReason && (
             <Card className="p-4 border-rose-500/30 bg-rose-500/5 shadow-xs">
               <div className="flex items-start gap-2 text-rose-400">
                 <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                 <div>
                   <h4 className="text-xs font-bold uppercase tracking-wider mb-1">Previous Rejection Reason</h4>
                   <p className="text-xs">{driver.kycReason}</p>
                 </div>
               </div>
             </Card>
          )}

          <Card className="p-5 border-border/80 shadow-xs bg-muted/20">
            <h4 className="text-sm font-bold border-b border-border/50 pb-2 mb-3 text-muted-foreground">Verification Guidelines</h4>
            <ul className="space-y-2 text-xs text-muted-foreground list-disc pl-4">
              <li>Ensure the name on the ID matches the applicant name exactly.</li>
              <li>Check that the ID is not expired.</li>
              <li>Verify the face in the selfie matches the ID photo.</li>
              <li>Confirm the vehicle plate matches the provided registration document.</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
