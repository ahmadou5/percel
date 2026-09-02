'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Truck,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Send,
  History,
  Wallet,
  Star,
  MessageSquare,
  Flag,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  ChevronLeft,
  ChevronRight,
  Package,
  UserX,
  RefreshCw,
  FileText,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AdminDriver, AdminOrder } from '@/lib/admin-data';

type KycDocStatus = 'VERIFIED' | 'SUBMITTED' | 'REJECTED' | 'MISSING';

type KycDocItem = {
  key: string;
  label: string;
  status: KycDocStatus;
  url?: string;
  value?: string;
  rejectionReason?: string;
  verifiedAt?: string;
};

type AuditLog = {
  id: string;
  adminName: string;
  action: string;
  details: string;
  reason?: string;
  timestamp: string;
};

type DriverReview = {
  id: string;
  user: string;
  rating: string;
  comment: string;
  createdAt?: string;
  isFlagged?: boolean;
  responseNote?: string;
};

const DOC_REJECT_REASONS = [
  'Blurry / unreadable document',
  'Expired document',
  'Mismatch with profile name',
  'Suspicious / fraudulent document',
  'Other',
];

const SUSPEND_REASONS = [
  'Fraud suspected',
  'Customer complaints',
  'Vehicle issue',
  'Policy violation',
  'Other',
];

export function DriverDetailView({ initialDriver }: { initialDriver: AdminDriver }) {
  const [driver, setDriver] = useState<AdminDriver>(initialDriver);

  // Initialize detailed KYC Documents
  const [kycDocs, setKycDocs] = useState<KycDocItem[]>(() => {
    if (initialDriver.detailedKycDocs && initialDriver.detailedKycDocs.length > 0) {
      return initialDriver.detailedKycDocs;
    }
    // Parse or map from initial summary array or defaults
    const existing = initialDriver.kycDocuments || [];
    const docKeys = [
      { key: 'nin', label: 'NIN Verification' },
      { key: 'bvn', label: 'BVN Verification' },
      { key: 'license', label: 'Driver License' },
      { key: 'selfie', label: 'Selfie Photo' },
      { key: 'vehicle', label: 'Vehicle Photo' },
    ];

    return docKeys.map((item) => {
      const found = existing.find((d) => d.label.toLowerCase().includes(item.key));
      let status: KycDocStatus = 'SUBMITTED';

      if (found) {
        if (found.value.toLowerCase().includes('verified')) status = 'VERIFIED';
        else if (found.value.toLowerCase().includes('missing')) status = 'MISSING';
        else if (found.value.toLowerCase().includes('rejected')) status = 'REJECTED';
      } else {
        status = 'MISSING';
      }

      return {
        key: item.key,
        label: item.label,
        status,
        value: found?.value ?? (status === 'VERIFIED' ? 'Verified' : status === 'SUBMITTED' ? 'Submitted' : 'Missing'),
        url: status !== 'MISSING' ? `https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop` : undefined,
      };
    });
  });

  // Lightbox Modal State
  const [lightboxDoc, setLightboxDoc] = useState<KycDocItem | null>(null);

  // Reject Document Modal State
  const [rejectingDoc, setRejectingDoc] = useState<KycDocItem | null>(null);
  const [rejectReasonCategory, setRejectReasonCategory] = useState(DOC_REJECT_REASONS[0]);
  const [customRejectReason, setCustomRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // Suspend Driver Modal State
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReasonCategory, setSuspendReasonCategory] = useState(SUSPEND_REASONS[0]);
  const [customSuspendReason, setCustomSuspendReason] = useState('');
  const [suspending, setSuspending] = useState(false);

  // Vehicle Verification State
  const [vehicleStatus, setVehicleStatus] = useState<string>(
    (driver as any).vehicleStatus || 'PENDING'
  );
  const [vehicleRejectionReason, setVehicleRejectionReason] = useState<string | undefined>(
    (driver as any).vehicleRejectionReason
  );
  const [vehicleProcessing, setVehicleProcessing] = useState(false);

  const handleApproveVehicle = async () => {
    setVehicleProcessing(true);
    try {
      const res = await fetch(`/api/admin/drivers/${driver.id}/vehicle-verification/approve`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to approve vehicle verification');
      setVehicleStatus('APPROVED');
      setVehicleRejectionReason(undefined);
      showToast('Driver vehicle verification approved successfully!');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Approval failed', 'error');
    } finally {
      setVehicleProcessing(false);
    }
  };

  const handleRejectVehicle = async (reason?: string) => {
    setVehicleProcessing(true);
    try {
      const res = await fetch(`/api/admin/drivers/${driver.id}/vehicle-verification/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || 'Vehicle documentation did not meet requirements.' }),
      });
      if (!res.ok) throw new Error('Failed to reject vehicle verification');
      setVehicleStatus('REJECTED');
      setVehicleRejectionReason(reason || 'Vehicle documentation did not meet requirements.');
      showToast('Driver vehicle verification rejected.', 'error');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Rejection failed', 'error');
    } finally {
      setVehicleProcessing(false);
    }
  };

  // Reviews Moderation State
  const [reviews, setReviews] = useState<DriverReview[]>(
    (driver.reviews || [
      { id: 'rev-1', user: 'David Eze', rating: '4.8', comment: 'Punctual rider, handled fragile item carefully.', createdAt: 'Yesterday' },
    ]).map((r) => ({ ...r, isFlagged: Boolean(r.rating && parseFloat(r.rating) <= 2.5) }))
  );
  const [reviewFilter, setReviewFilter] = useState<'ALL' | 'LOW' | 'HIGH'>('ALL');
  const [activeNoteReviewId, setActiveNoteReviewId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  // Assigned Orders State & Filter & Reassign Modal
  const [assignedOrders, setAssignedOrders] = useState<AdminOrder[]>(
    driver.assignedOrders || [
      { id: 'ord-1', trackingCode: 'PCL-9821XA', user: 'Emeka Obi', userId: 'u-1', driver: driver.name, driverId: driver.id, status: 'IN_TRANSIT', price: '₦4,500', date: 'Today', payment: 'PAID', pickup: 'Lekki Phase 1', dropoff: 'Ikeja City Mall', items: ['Fragile package'], timeline: [] },
      { id: 'ord-2', trackingCode: 'PCL-4410ZB', user: 'Fatima Ali', userId: 'u-2', driver: driver.name, driverId: driver.id, status: 'COMPLETED', price: '₦3,200', date: 'Yesterday', payment: 'PAID', pickup: 'Victoria Island', dropoff: 'Yaba', items: ['Documents'], timeline: [] },
      { id: 'ord-3', trackingCode: 'PCL-1193CY', user: 'John Doe', userId: 'u-3', driver: driver.name, driverId: driver.id, status: 'CANCELLED', price: '₦2,800', date: '3 days ago', payment: 'REFUNDED', pickup: 'Surulere', dropoff: 'Ikoyi', items: ['Electronics'], timeline: [] },
    ]
  );
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');
  const [reassigningOrder, setReassigningOrder] = useState<AdminOrder | null>(null);
  const [reassignReason, setReassignReason] = useState('');

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(
    driver.auditLogs || [
      { id: 'log-1', adminName: 'Fleet Admin', action: 'KYC Document Uploaded', details: 'Driver submitted NIN & License', timestamp: '2 days ago' },
    ]
  );

  // Wallet Ledger Pagination State
  const [walletPage, setWalletPage] = useState(1);
  const walletPageSize = 5;

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const logAdminAction = (action: string, details: string, reason?: string) => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      adminName: 'Admin Operator',
      action,
      details,
      reason,
      timestamp: 'Just now',
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Recompute Aggregate KYC Status based on per-document statuses
  const recomputedKycStatus = useMemo(() => {
    const total = kycDocs.length;
    const verifiedCount = kycDocs.filter((d) => d.status === 'VERIFIED').length;
    const hasRejected = kycDocs.some((d) => d.status === 'REJECTED');
    const hasSubmitted = kycDocs.some((d) => d.status === 'SUBMITTED');

    if (verifiedCount === total) return 'APPROVED';
    if (hasRejected) return 'REJECTED';
    if (verifiedCount > 0 || hasSubmitted) return 'PARTIALLY VERIFIED';
    return 'INCOMPLETE';
  }, [kycDocs]);

  // Check backend discrepancy flag
  const isBackendDiscrepancy =
    driver.kyc === 'APPROVED' && recomputedKycStatus !== 'APPROVED';

  // 1. Handle Document Approve Action
  const handleApproveDocument = async (docKey: string) => {
    setKycDocs((prev) =>
      prev.map((d) =>
        d.key === docKey
          ? { ...d, status: 'VERIFIED', value: 'Verified', verifiedAt: 'Just now', rejectionReason: undefined }
          : d
      )
    );

    const doc = kycDocs.find((d) => d.key === docKey);
    logAdminAction('KYC Document Approved', `Verified ${doc?.label || docKey}`);
    showToast(`${doc?.label || docKey} approved and verified.`);
  };

  // Handle Document Reject Confirm
  const handleConfirmRejectDocument = async () => {
    if (!rejectingDoc) return;
    setRejecting(true);

    const reasonText =
      rejectReasonCategory === 'Other'
        ? customRejectReason.trim() || 'Other'
        : rejectReasonCategory;

    try {
      setKycDocs((prev) =>
        prev.map((d) =>
          d.key === rejectingDoc.key
            ? { ...d, status: 'REJECTED', value: 'Rejected', rejectionReason: reasonText }
            : d
        )
      );

      logAdminAction('KYC Document Rejected', `Rejected ${rejectingDoc.label}`, reasonText);
      showToast(`Rejected ${rejectingDoc.label}. Notification sent to courier.`);

      setRejectingDoc(null);
      setCustomRejectReason('');
    } catch {
      showToast('Failed to reject document', 'error');
    } finally {
      setRejecting(false);
    }
  };

  // Handle Request Missing Document Action
  const handleRequestMissingDocument = (doc: KycDocItem) => {
    logAdminAction(
      'Document Upload Requested',
      `Sent push & email notification to ${driver.name} requesting upload of ${doc.label}`
    );
    showToast(`Request sent to courier for ${doc.label}!`);
  };

  // 2. Handle Suspend / Reactivate Confirmation
  const handleConfirmSuspendToggle = async () => {
    setSuspending(true);
    const isSuspending = driver.status === 'ACTIVE';
    const reasonText =
      suspendReasonCategory === 'Other'
        ? customSuspendReason.trim() || 'Other'
        : suspendReasonCategory;

    const endpoint = isSuspending
      ? `/api/admin/drivers/${driver.id}/suspend`
      : `/api/admin/drivers/${driver.id}/reactivate`;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reasonText }),
      });

      if (!res.ok) {
        throw new Error('Failed to update driver account status');
      }

      const nextStatus = isSuspending ? 'SUSPENDED' : 'ACTIVE';
      setDriver((prev) => ({
        ...prev,
        status: nextStatus,
      }));

      logAdminAction(
        isSuspending ? 'Driver Suspended' : 'Driver Reactivated',
        `Status updated to ${nextStatus}`,
        reasonText
      );

      showToast(`Driver account ${isSuspending ? 'suspended' : 'reactivated'} successfully!`);
      setShowSuspendModal(false);
      setCustomSuspendReason('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Action failed', 'error');
    } finally {
      setSuspending(false);
    }
  };

  // 3. Wallet Transactions Logic
  const transactions = driver.walletTransactions || [
    { id: 'tx-1', type: 'CREDIT', category: 'EARNINGS', amount: '₦14,200', status: 'COMPLETED', reference: 'EARN-9912', note: 'Weekly delivery payouts', createdAt: 'Today' },
    { id: 'tx-2', type: 'DEBIT', category: 'COMMISSION', amount: '₦1,420', status: 'COMPLETED', reference: 'COMM-1092', note: 'Percel platform fee (10%)', createdAt: 'Yesterday' },
  ];
  const totalWalletTx = transactions.length;
  const totalWalletPages = Math.ceil(totalWalletTx / walletPageSize) || 1;
  const paginatedTransactions = transactions.slice(
    (walletPage - 1) * walletPageSize,
    walletPage * walletPageSize
  );

  // 4. Reviews Moderation & Rating Filter
  const filteredReviews = useMemo(() => {
    if (reviewFilter === 'LOW') {
      return [...reviews].sort((a, b) => parseFloat(a.rating) - parseFloat(b.rating));
    }
    if (reviewFilter === 'HIGH') {
      return [...reviews].filter((r) => parseFloat(r.rating) >= 4.5);
    }
    return reviews;
  }, [reviews, reviewFilter]);

  const handleToggleFlagReview = (reviewId: string) => {
    setReviews((prev) =>
      prev.map((r) => {
        if (r.id === reviewId) {
          const nextFlag = !r.isFlagged;
          logAdminAction(
            nextFlag ? 'Review Flagged' : 'Review Unflagged',
            `Moderation flag updated for review by ${r.user}`
          );
          return { ...r, isFlagged: nextFlag };
        }
        return r;
      })
    );
    showToast('Review moderation status updated.');
  };

  const handleSaveInternalNote = (reviewId: string) => {
    if (!noteText.trim()) return;
    setReviews((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, responseNote: noteText.trim() } : r))
    );
    logAdminAction('Review Note Added', `Added internal note to review by user`);
    showToast('Internal note saved for review.');
    setActiveNoteReviewId(null);
    setNoteText('');
  };

  // 5. Assigned Orders Filter & Manual Reassignment
  const filteredAssignedOrders = useMemo(() => {
    if (orderStatusFilter === 'ALL') return assignedOrders;
    return assignedOrders.filter((o) => o.status === orderStatusFilter);
  }, [assignedOrders, orderStatusFilter]);

  const handleConfirmReassignOrder = () => {
    if (!reassigningOrder) return;
    const reason = reassignReason.trim() || 'Manual admin reassignment';

    setAssignedOrders((prev) =>
      prev.map((o) => (o.id === reassigningOrder.id ? { ...o, status: 'UNASSIGNED', driver: 'Unassigned' } : o))
    );

    logAdminAction(
      'Order Reassigned',
      `Unassigned driver ${driver.name} from order ${reassigningOrder.trackingCode}`,
      reason
    );

    showToast(`Order ${reassigningOrder.trackingCode} unassigned from driver.`);
    setReassigningOrder(null);
    setReassignReason('');
  };

  const initial = driver.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-bold text-white shadow-2xl transition-all ${toastMessage.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
            }`}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toastMessage.text}
        </div>
      )}

      {/* Backend Discrepancy Alert Banner */}
      {isBackendDiscrepancy && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-300 flex items-start gap-3 shadow-xs animate-fade-in">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-extrabold text-sm block">⚠️ KYC Status Discrepancy Flagged</span>
            <p className="leading-relaxed">
              Backend database currently reports <span className="font-mono font-bold text-white">APPROVED</span>, but per-document records indicate{' '}
              <span className="font-mono font-bold text-amber-300">{recomputedKycStatus}</span>. All 5 documents must be verified before full approval status is assigned.
            </p>
          </div>
        </div>
      )}

      {/* Header and Main Actions */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl shrink-0 bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-xl overflow-hidden shadow-xs">
            {driver.avatarUrl ? (
              <img src={driver.avatarUrl} alt={driver.name} className="w-full h-full object-cover" />
            ) : (
              initial
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`rounded-full border px-3 py-0.5 text-xs font-bold ${driver.status === 'ACTIVE'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                  }`}
              >
                {driver.status}
              </span>

              {/* Recomputed KYC Status Badge */}
              <span
                className={`rounded-full border px-3 py-0.5 text-xs font-bold ${recomputedKycStatus === 'APPROVED'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : recomputedKycStatus === 'PARTIALLY VERIFIED'
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                  }`}
              >
                KYC {recomputedKycStatus}
              </span>
            </div>

            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{driver.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {driver.email} · {driver.phone} · <span className="font-medium text-foreground">{driver.vehicle}</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            onClick={() => setShowSuspendModal(true)}
            variant={driver.status === 'ACTIVE' ? 'danger' : 'secondary'}
            className="cursor-pointer"
          >
            <div className='flex items-center justify-between'>
              <ShieldAlert className="h-4 w-4 mr-1.5" />
              {driver.status === 'ACTIVE' ? 'Suspend Driver' : 'Reactivate Driver'} </div>
          </Button>
          <Button
            onClick={() => document.getElementById('driver-wallet-section')?.scrollIntoView({ behavior: 'smooth' })}
            variant="default"
            className="cursor-pointer"
          >
            <div className='flex items-center justify-between'>
              <Wallet className="h-4 w-4 mr-1.5" /> {`View Wallet`}
            </div>

          </Button>
        </div>
      </div>

      {/* Grid Layout: KYC Documents + Wallet Section */}
      <section className="grid gap-6 xl:grid-cols-2">
        {/* 1. KYC Documents Verification & Actions */}
        <Card className="space-y-4 p-6 border-border/80 bg-card/90 backdrop-blur-md shadow-xs">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h3 className="text-lg font-semibold tracking-tight">KYC Document Verification</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Review, verify, or reject driver credential records</p>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary">
              {kycDocs.filter((d) => d.status === 'VERIFIED').length}/{kycDocs.length} Verified
            </span>
          </div>

          <div className="space-y-3">
            {kycDocs.map((item) => {
              const isVerified = item.status === 'VERIFIED';
              const isSubmitted = item.status === 'SUBMITTED';
              const isRejected = item.status === 'REJECTED';
              const isMissing = item.status === 'MISSING';

              return (
                <div
                  key={item.key}
                  className={`rounded-2xl border p-4 transition-all ${isVerified
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : isRejected
                      ? 'border-rose-500/30 bg-rose-500/5'
                      : isSubmitted
                        ? 'border-amber-500/30 bg-amber-500/5'
                        : 'border-border/80 bg-muted/20 border-dashed'
                    }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Document Thumbnail Preview Button */}
                      <button
                        onClick={() => item.url && setLightboxDoc(item)}
                        className={`w-12 h-12 rounded-xl shrink-0 border flex items-center justify-center overflow-hidden transition-transform hover:scale-105 cursor-pointer ${isMissing ? 'bg-muted border-border text-muted-foreground' : 'bg-background border-primary/20 text-primary'
                          }`}
                        title={item.url ? 'Click to view document lightbox' : 'No document image available'}
                      >
                        {item.url ? (
                          <img src={item.url} alt={item.label} className="w-full h-full object-cover" />
                        ) : (
                          <FileText className="h-5 w-5" />
                        )}
                      </button>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">{item.label}</span>
                          <span
                            className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${isVerified
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                              : isSubmitted
                                ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                                : isRejected
                                  ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                                  : 'border-border bg-muted text-muted-foreground'
                              }`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.value}</p>
                        {item.rejectionReason && (
                          <p className="text-[11px] text-rose-400 mt-1 italic">Reason: {item.rejectionReason}</p>
                        )}
                      </div>
                    </div>

                    {/* Per-Document Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {item.url && (
                        <button
                          onClick={() => setLightboxDoc(item)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" /> Preview
                        </button>
                      )}

                      {isMissing ? (
                        <button
                          onClick={() => handleRequestMissingDocument(item)}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/20 cursor-pointer"
                        >
                          <Send className="h-3.5 w-3.5" /> Request Document
                        </button>
                      ) : (
                        <>
                          {(!isVerified || isRejected) && (
                            <button
                              onClick={() => handleApproveDocument(item.key)}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-2.5 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 cursor-pointer"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                            </button>
                          )}

                          {(!isRejected || isVerified) && (
                            <button
                              onClick={() => setRejectingDoc(item)}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/20 px-2.5 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-500/30 cursor-pointer"
                            >
                              <XCircle className="h-3.5 w-3.5" /> Reject
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* 2. Vehicle Verification Admin Approval Card */}
        <Card className="space-y-4 p-6 border-border/80 bg-card/90 backdrop-blur-md shadow-xs">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" /> Vehicle Verification (Admin Approval)
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Review submitted vehicle category, license plate, model & photos
              </p>
            </div>
            <span
              className={`text-xs font-mono font-bold px-3 py-1 rounded-full border ${
                vehicleStatus === 'APPROVED'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : vehicleStatus === 'SUBMITTED'
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                  : vehicleStatus === 'REJECTED'
                  ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                  : 'border-border bg-muted text-muted-foreground'
              }`}
            >
              {vehicleStatus === 'APPROVED'
                ? 'APPROVED'
                : vehicleStatus === 'SUBMITTED'
                ? 'SUBMITTED — REVIEW REQUIRED'
                : vehicleStatus === 'REJECTED'
                ? 'DECLINED'
                : 'NOT SUBMITTED'}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-xl border border-border p-3.5 bg-muted/20">
              <div>
                <span className="text-muted-foreground block text-[11px]">Vehicle Category</span>
                <span className="font-bold text-sm text-foreground">{driver.vehicle?.split('-')[0] || 'BIKE'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">License Plate</span>
                <span className="font-bold text-sm text-foreground font-mono">{driver.vehicle?.split('-')[1] || 'Not provided'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Vehicle Model</span>
                <span className="font-bold text-sm text-foreground">{driver.vehicle?.split('-')[2] || 'Not provided'}</span>
              </div>
            </div>

            {/* Vehicle Photo Preview */}
            <div className="rounded-xl border border-border p-3 bg-muted/10 space-y-2">
              <span className="text-muted-foreground block text-[11px] font-semibold">Submitted Vehicle Photo</span>
              {driver.vehicleImageUrl ? (
                <a href={driver.vehicleImageUrl} target="_blank" rel="noopener noreferrer" className="block relative h-40 w-full overflow-hidden rounded-lg border border-border group">
                  <img src={driver.vehicleImageUrl} alt="Vehicle Photo" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-bold text-xs">
                    Click to expand full image
                  </div>
                </a>
              ) : (
                <div className="h-32 w-full rounded-lg border border-dashed border-border flex flex-col items-center justify-center text-muted-foreground bg-muted/20">
                  <Truck className="h-8 w-8 opacity-40 mb-1" />
                  <span className="text-xs">No vehicle photo uploaded yet</span>
                </div>
              )}
            </div>

            {vehicleRejectionReason && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-300">
                <span className="font-bold block">Rejection Reason:</span>
                <p className="mt-0.5">{vehicleRejectionReason}</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <span className="text-muted-foreground text-xs font-semibold">Admin Verification Action:</span>
              <div className="flex items-center gap-2">
                <Button
                  disabled={vehicleProcessing || vehicleStatus === 'APPROVED'}
                  onClick={handleApproveVehicle}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Approve Vehicle
                </Button>
                <Button
                  disabled={vehicleProcessing || vehicleStatus === 'REJECTED'}
                  onClick={() => {
                    const reason = window.prompt('Enter reason for declining vehicle verification:');
                    if (reason !== null) handleRejectVehicle(reason);
                  }}
                  variant="danger"
                  className="font-bold text-xs"
                >
                  <XCircle className="h-4 w-4 mr-1" /> Reject Vehicle
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* 3. Driver Wallet Section */}
        <Card id="driver-wallet-section" className="space-y-4 p-6 border-primary/30 bg-primary/5 backdrop-blur-md shadow-xs">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Driver Wallet & Earnings</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Current Balance: <span className="font-semibold text-foreground font-mono text-sm">{driver.walletBalance || '₦42,800'}</span>
              </p>
            </div>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-mono font-bold text-emerald-400">
              Payout Ready
            </span>
          </div>

          <div className="space-y-2.5">
            {paginatedTransactions.map((tx, idx) => {
              const isCredit = tx.type === 'CREDIT' || tx.category?.includes('EARNING');
              return (
                <div
                  key={tx.id || idx}
                  className="flex items-center justify-between rounded-xl border border-border/80 bg-background p-3.5 text-xs transition-all hover:bg-muted/40"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${isCredit
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                        : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                        }`}
                    >
                      {isCredit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                    </div>
                    <div>
                      <span className="font-bold text-foreground block">{tx.category}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{tx.createdAt} · {tx.reference}</span>
                    </div>
                  </div>

                  <div className="text-right font-mono font-bold text-sm">
                    <span className={isCredit ? 'text-emerald-400' : 'text-foreground'}>
                      {isCredit ? '+' : '-'}{tx.amount}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Wallet Pagination */}
          {totalWalletPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs">
              <span className="text-muted-foreground">
                Showing {(walletPage - 1) * walletPageSize + 1} to {Math.min(walletPage * walletPageSize, totalWalletTx)} of {totalWalletTx}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={walletPage <= 1}
                  onClick={() => setWalletPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-input bg-background p-1.5 text-foreground hover:bg-muted disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="font-mono font-bold">{walletPage}/{totalWalletPages}</span>
                <button
                  disabled={walletPage >= totalWalletPages}
                  onClick={() => setWalletPage((p) => Math.min(totalWalletPages, p + 1))}
                  className="rounded-lg border border-input bg-background p-1.5 text-foreground hover:bg-muted disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </Card>
      </section>

      {/* Grid Layout: Reviews Moderation + Assigned Orders */}
      <section className="grid gap-6 xl:grid-cols-2">
        {/* 4. Customer Reviews Moderation */}
        <Card className="space-y-4 p-6 border-border/80 bg-card/90 backdrop-blur-md shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold tracking-tight">Customer Reviews</h3>
                <span className="inline-flex items-center gap-1 font-mono font-bold text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                  <Star className="h-3 w-3 fill-amber-400" /> {driver.rating} ({reviews.length})
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Filter, flag, and append internal moderation notes</p>
            </div>

            {/* Rating Filter Tabs */}
            <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-xl border border-border/60">
              <button
                onClick={() => setReviewFilter('ALL')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${reviewFilter === 'ALL' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                All
              </button>
              <button
                onClick={() => setReviewFilter('LOW')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${reviewFilter === 'LOW' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                Low Ratings
              </button>
              <button
                onClick={() => setReviewFilter('HIGH')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${reviewFilter === 'HIGH' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                5★ Only
              </button>
            </div>
          </div>

          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {filteredReviews.length > 0 ? (
              filteredReviews.map((rev) => {
                const isLow = parseFloat(rev.rating) < 3.5;

                return (
                  <div
                    key={rev.id}
                    className={`rounded-2xl border p-4 transition-all ${rev.isFlagged
                      ? 'border-amber-500/40 bg-amber-500/10'
                      : isLow
                        ? 'border-rose-500/30 bg-rose-500/5'
                        : 'border-border/80 bg-background/60'
                      }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="font-bold text-sm text-foreground">{rev.user}</div>
                      <div className="flex items-center gap-1 font-mono text-sm text-amber-400">
                        <span className="font-bold">{rev.rating}</span>
                        <Star className="h-3.5 w-3.5 fill-amber-400" />
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{rev.comment}</p>

                    {rev.responseNote && (
                      <div className="mt-2 rounded-xl bg-muted/60 p-2.5 text-[11px] text-foreground border border-border">
                        <span className="font-bold text-primary block mb-0.5">Internal Admin Note:</span>
                        {rev.responseNote}
                      </div>
                    )}

                    {/* Review Moderation Toolbar */}
                    <div className="flex items-center justify-between border-t border-border/40 mt-3 pt-2.5 text-xs">
                      <button
                        onClick={() => handleToggleFlagReview(rev.id)}
                        className={`inline-flex items-center gap-1 text-[11px] font-bold cursor-pointer ${rev.isFlagged ? 'text-amber-400 hover:underline' : 'text-muted-foreground hover:text-foreground'
                          }`}
                      >
                        <Flag className="h-3 w-3" /> {rev.isFlagged ? 'Flagged for Follow-up' : 'Flag Review'}
                      </button>

                      <button
                        onClick={() => {
                          setActiveNoteReviewId(rev.id);
                          setNoteText(rev.responseNote || '');
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline cursor-pointer"
                      >
                        <MessageSquare className="h-3 w-3" /> Add Internal Note
                      </button>
                    </div>

                    {/* Inline Note Input */}
                    {activeNoteReviewId === rev.id && (
                      <div className="mt-3 space-y-2 pt-2 border-t border-border animate-fade-in">
                        <Input
                          placeholder="Type internal moderation note..."
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" className="h-7 text-xs" onClick={() => setActiveNoteReviewId(null)}>
                            Cancel
                          </Button>
                          <Button className="h-7 text-xs" onClick={() => handleSaveInternalNote(rev.id)}>
                            Save Note
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground py-8 text-center">No reviews matching filter criteria.</p>
            )}
          </div>
        </Card>

        {/* 5. Assigned Orders List & Reassignment */}
        <Card className="space-y-4 p-6 border-border/80 bg-card/90 backdrop-blur-md shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Assigned Orders History</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Track jobs and reassign active deliveries if required</p>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border/60">
              {['ALL', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setOrderStatusFilter(st)}
                  className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${orderStatusFilter === st ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  {st === 'ALL' ? 'All' : st}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
            {filteredAssignedOrders.length > 0 ? (
              filteredAssignedOrders.map((order) => {
                const isActive = order.status === 'IN_TRANSIT' || order.status === 'ACCEPTED';

                return (
                  <div
                    key={order.id}
                    className="flex items-center justify-between rounded-xl border border-border/80 p-3.5 text-xs bg-background/50 transition-all hover:bg-muted/40"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Link href={`/orders/${order.id}`} className="font-mono font-bold text-primary hover:underline">
                          {order.trackingCode}
                        </Link>
                        <span
                          className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${isActive
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                            : 'border-border bg-muted text-muted-foreground'
                            }`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">Customer: {order.user} · {order.date}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-foreground">{order.price}</span>
                      {isActive && (
                        <button
                          onClick={() => setReassigningOrder(order)}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-300 hover:bg-amber-500/20 cursor-pointer"
                        >
                          <RefreshCw className="h-3 w-3" /> Reassign
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground py-8 text-center">No assigned orders recorded matching filter.</p>
            )}
          </div>
        </Card>
      </section>

      {/* 6. Admin Audit Trail Section */}
      <Card className="space-y-4 p-6 border-border/80 bg-card/90 backdrop-blur-md shadow-xs">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            <h3 className="text-lg font-semibold tracking-tight">Driver Admin Activity & Audit Trail</h3>
          </div>
          <span className="text-xs text-muted-foreground font-mono font-bold">{auditLogs.length} logs recorded</span>
        </div>

        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
          {auditLogs.map((log) => (
            <div key={log.id} className="rounded-xl border border-border/80 bg-background/60 p-3.5 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 text-primary" /> {log.adminName}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">{log.timestamp}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  {log.action}
                </span>
                <span className="text-muted-foreground truncate">{log.details}</span>
              </div>
              {log.reason && (
                <p className="text-[11px] text-amber-400 italic bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                  Reason: {log.reason}
                </p>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Lightbox Modal for Document Preview */}
      {lightboxDoc && lightboxDoc.url && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-foreground">{lightboxDoc.label} Lightbox</h3>
              <button onClick={() => setLightboxDoc(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="w-full h-80 rounded-xl bg-black overflow-hidden flex items-center justify-center border border-border">
              <img src={lightboxDoc.url} alt={lightboxDoc.label} className="w-full h-full object-contain" />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Status: <strong className="text-foreground font-mono">{lightboxDoc.status}</strong></span>
              <Button variant="secondary" onClick={() => setLightboxDoc(null)}>
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Document Reason Modal */}
      {rejectingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-foreground">Reject {rejectingDoc.label}</h3>
              <button onClick={() => setRejectingDoc(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Select the reason for rejecting this document. Notification will be dispatched to driver.
            </p>

            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                Rejection Reason
              </label>
              <select
                value={rejectReasonCategory}
                onChange={(e) => setRejectReasonCategory(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {DOC_REJECT_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>

              {rejectReasonCategory === 'Other' && (
                <Input
                  placeholder="Specify custom reason..."
                  value={customRejectReason}
                  onChange={(e) => setCustomRejectReason(e.target.value)}
                />
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <Button variant="secondary" onClick={() => setRejectingDoc(null)}>
                Cancel
              </Button>
              <Button variant="danger" loading={rejecting} onClick={handleConfirmRejectDocument}>
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Driver Modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-foreground">
                {driver.status === 'ACTIVE' ? 'Suspend Driver Account' : 'Reactivate Driver Account'}
              </h3>
              <button onClick={() => setShowSuspendModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                Required Reason
              </label>
              <select
                value={suspendReasonCategory}
                onChange={(e) => setSuspendReasonCategory(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {SUSPEND_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>

              {suspendReasonCategory === 'Other' && (
                <Input
                  placeholder="Specify custom reason..."
                  value={customSuspendReason}
                  onChange={(e) => setCustomSuspendReason(e.target.value)}
                />
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <Button variant="secondary" onClick={() => setShowSuspendModal(false)}>
                Cancel
              </Button>
              <Button
                variant={driver.status === 'ACTIVE' ? 'danger' : 'default'}
                loading={suspending}
                onClick={handleConfirmSuspendToggle}
              >
                Confirm {driver.status === 'ACTIVE' ? 'Suspension' : 'Reactivation'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Order Reassignment Modal */}
      {reassigningOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-foreground">Reassign Order {reassigningOrder.trackingCode}</h3>
              <button onClick={() => setReassigningOrder(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Unassign courier <span className="font-bold text-foreground">{driver.name}</span> from order{' '}
              <span className="font-mono font-bold text-foreground">{reassigningOrder.trackingCode}</span> so it can be re-dispatched.
            </p>

            <Input
              placeholder="Reason for reassignment (e.g. Courier suspended mid-job)..."
              value={reassignReason}
              onChange={(e) => setReassignReason(e.target.value)}
            />

            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <Button variant="secondary" onClick={() => setReassigningOrder(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleConfirmReassignOrder}>
                Confirm Reassignment
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
