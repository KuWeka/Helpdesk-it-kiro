"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter, notFound } from "next/navigation";
import {
  ArrowLeft,
  Download,
  FileText,
  Loader2,
  MapPin,
  Calendar,
  User,
  Building2,
  Tag,
  CheckCircle2,
  XCircle,
  UserPlus,
  ShieldX,
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { ticketApi, staffApi } from "@/lib/api";
import { StatusBadge } from "@/components/tickets/StatusBadge";
import { RatingDisplay } from "@/components/tickets/RatingDisplay";
import InlineRatingForm from "@/components/tickets/InlineRatingForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { CancelTicketModal } from "@/components/tickets/CancelTicketModal";
import { RejectTicketModal } from "@/components/tickets/RejectTicketModal";
import { formatDateTime, formatFileSize } from "@/lib/formatters";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Attachment {
  id: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

interface Rating {
  id: string;
  bintang: number;
  feedback: string;
  createdAt: string;
  userId: string;
}

interface TicketDetail {
  id: string;
  nomorTiket: string;
  judul: string;
  deskripsi: string;
  kategori: string;
  lokasi: string;
  status: string;
  divisiSatker: string | null;
  tanggalBuat: string;
  tanggalAssign: string | null;
  tanggalSelesai: string | null;
  alasanBatal: string | null;
  creatorId: string;
  padalId: string | null;
  creator: {
    id: string;
    nama: string;
    email: string;
    divisi: string | null;
  };
  padal: {
    id: string;
    nama: string;
  } | null;
  attachments: Attachment[];
  rating: Rating | null;
}

interface PadalUser {
  id: string;
  nama: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  HARDWARE: "Hardware",
  SOFTWARE: "Software",
  JARINGAN: "Jaringan",
  EMAIL: "Email",
  WEBSITE: "Website",
  LAINNYA: "Lainnya",
};

// ─── Main Component ─────────────────────────────────────────────────────────

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const ticketId = params.id as string;

  // State
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  // Action states
  const [completeLoading, setCompleteLoading] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [rejectLoading, setRejectLoading] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [confirmCompleteOpen, setConfirmCompleteOpen] = useState(false);

  // Ref to store previous ticket state for optimistic revert
  const previousTicketRef = useRef<TicketDetail | null>(null);

  // Fetch ticket detail
  const fetchTicket = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setErrorStatus(null);
      const response = await ticketApi.getById(ticketId, { _suppressGlobalToast: true });
      setTicket(response.data.data || response.data);
    } catch (err: unknown) {
      const status =
        (err as { response?: { status?: number } })?.response?.status ?? null;
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Gagal memuat detail tiket";
      setErrorStatus(status);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchTicket();
    }
  }, [authLoading, user, fetchTicket]);

  // Download attachment
  async function handleDownload(attachment: Attachment) {
    try {
      const response = await ticketApi.downloadAttachment(ticketId, attachment.id);
      const blob = new Blob([response.data], { type: attachment.mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = attachment.originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      // Silently fail or could show toast
    }
  }

  // Complete ticket with optimistic UI update
  async function handleComplete() {
    if (!ticket) return;
    setCompleteLoading(true);

    // Save previous state for revert
    previousTicketRef.current = { ...ticket };

    // Optimistic update: immediately set status to SELESAI
    setTicket({
      ...ticket,
      status: "SELESAI",
      tanggalSelesai: new Date().toISOString(),
    });
    setConfirmCompleteOpen(false);

    try {
      // Call API
      await ticketApi.complete(ticketId);
      // Refetch to get accurate server data
      await fetchTicket();
      toast({
        title: "Tiket Diselesaikan",
        description: `Tiket ${ticket.nomorTiket} berhasil ditandai selesai.`,
      });
    } catch (err: unknown) {
      // Revert optimistic update on error
      if (previousTicketRef.current) {
        setTicket(previousTicketRef.current);
      }
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Gagal menyelesaikan tiket";
      toast({
        title: "Gagal",
        description: message,
        variant: "destructive",
      });
    } finally {
      setCompleteLoading(false);
      previousTicketRef.current = null;
    }
  }

  // Handle optimistic assign: update ticket state immediately
  function handleOptimisticAssign(padalId: string, padalNama: string) {
    if (!ticket) return;
    setAssignLoading(true);
    previousTicketRef.current = { ...ticket };
    setTicket({
      ...ticket,
      status: "PROSES",
      padalId,
      padal: { id: padalId, nama: padalNama },
      tanggalAssign: new Date().toISOString(),
    });
  }

  // Handle assign success: refetch for accurate server data
  async function handleAssignSuccess() {
    await fetchTicket();
    setAssignLoading(false);
    toast({
      title: "Tiket Diassign",
      description: `Tiket ${ticket?.nomorTiket} berhasil diassign.`,
    });
    previousTicketRef.current = null;
  }

  // Handle assign error: revert optimistic update
  function handleAssignError(message: string) {
    setAssignLoading(false);
    if (previousTicketRef.current) {
      setTicket(previousTicketRef.current);
    }
    toast({
      title: "Gagal",
      description: message,
      variant: "destructive",
    });
    previousTicketRef.current = null;
  }

  // Handle optimistic cancel: update ticket state immediately
  function handleOptimisticCancel(alasanBatal?: string) {
    if (!ticket) return;
    setCancelLoading(true);
    previousTicketRef.current = { ...ticket };
    setTicket({
      ...ticket,
      status: "DIBATALKAN",
      alasanBatal: alasanBatal || null,
    });
  }

  // Handle cancel success: refetch for accurate server data
  async function handleCancelSuccess() {
    await fetchTicket();
    setCancelLoading(false);
    toast({
      title: "Tiket Dibatalkan",
      description: `Tiket ${ticket?.nomorTiket} berhasil dibatalkan.`,
    });
    previousTicketRef.current = null;
  }

  // Handle cancel error: revert optimistic update
  function handleCancelError(message: string) {
    setCancelLoading(false);
    if (previousTicketRef.current) {
      setTicket(previousTicketRef.current);
    }
    toast({
      title: "Gagal",
      description: message,
      variant: "destructive",
    });
    previousTicketRef.current = null;
  }

  // Handle optimistic reject: update ticket state immediately
  function handleOptimisticReject(alasanTolak: string) {
    if (!ticket) return;
    setRejectLoading(true);
    previousTicketRef.current = { ...ticket };
    setTicket({
      ...ticket,
      status: "DITOLAK",
      alasanBatal: alasanTolak,
    });
  }

  // Handle reject success: refetch for accurate server data
  async function handleRejectSuccess() {
    await fetchTicket();
    setRejectLoading(false);
    toast({
      title: "Tiket Ditolak",
      description: `Tiket ${ticket?.nomorTiket} berhasil ditolak.`,
    });
    previousTicketRef.current = null;
  }

  // Handle reject error: revert optimistic update
  function handleRejectError(message: string) {
    setRejectLoading(false);
    if (previousTicketRef.current) {
      setTicket(previousTicketRef.current);
    }
    toast({
      title: "Gagal",
      description: message,
      variant: "destructive",
    });
    previousTicketRef.current = null;
  }

  // ─── Permission Checks ──────────────────────────────────────────────────────

  const isTeknisi = user?.role === "TEKNISI";
  const isSatkerOwner =
    user?.role === "SATKER" && ticket?.creatorId === user?.userId;
  const isBidtekkom = user?.role === "BIDTEKKOM";
  const isAssignedPadal =
    user?.role === "PADAL" && ticket?.padalId === user?.userId;

  const canCancel =
    (isSatkerOwner || isBidtekkom) &&
    (ticket?.status === "PENDING" || ticket?.status === "PROSES");
  const canAssign = isBidtekkom && ticket?.status === "PENDING";
  const canReject = isBidtekkom && ticket?.status === "PENDING";
  const canComplete = isAssignedPadal && ticket?.status === "PROSES";
  const showRatingForm =
    isSatkerOwner && ticket?.status === "SELESAI" && !ticket?.rating;
  const isActionLoading =
    completeLoading || assignLoading || cancelLoading || rejectLoading;

  // ─── Loading State ──────────────────────────────────────────────────────────

  if (authLoading || isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-7 w-48" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6 space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ─── Error State ────────────────────────────────────────────────────────────

  if (errorStatus === 404 && !ticket) {
    notFound();
  }

  if (errorStatus === 403 && !ticket) {
    return (
      <div className="space-y-6 p-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Button>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
          <p className="text-lg font-semibold">Akses Ditolak</p>
          <p className="mt-2 text-sm">
            Anda tidak memiliki akses ke tiket ini.
          </p>
        </div>
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <div className="space-y-6 p-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Button>
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-destructive text-lg">{error}</p>
          <Button variant="outline" className="mt-4" onClick={fetchTicket}>
            Coba Lagi
          </Button>
        </div>
      </div>
    );
  }

  if (!ticket) return null;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            aria-label="Kembali"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {ticket.nomorTiket}
            </h1>
            <p className="text-muted-foreground text-sm">{ticket.judul}</p>
          </div>
        </div>
        <StatusBadge status={ticket.status} />
      </div>

      {/* Action Buttons (not shown for Teknisi) */}
      {!isTeknisi && (canAssign || canReject || canCancel || canComplete) && (
        <div className="flex flex-wrap gap-2">
          {canAssign && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setAssignModalOpen(true)}
              className="gap-2"
              disabled={isActionLoading}
            >
              {assignLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Assign ke Padal
            </Button>
          )}
          {canReject && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setRejectModalOpen(true)}
              className="gap-2"
              disabled={isActionLoading}
            >
              {rejectLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldX className="h-4 w-4" />
              )}
              Tolak Tiket
            </Button>
          )}
          {canComplete && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setConfirmCompleteOpen(true)}
              className="gap-2 bg-green-600 hover:bg-green-700"
              disabled={isActionLoading}
            >
              {completeLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Selesaikan Tiket
            </Button>
          )}
          {canCancel && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setCancelModalOpen(true)}
              className="gap-2"
              disabled={isActionLoading}
            >
              {cancelLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              Batalkan Tiket
            </Button>
          )}
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Ticket Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Deskripsi</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {ticket.deskripsi}
              </p>
            </CardContent>
          </Card>

          {/* Attachments */}
          {ticket.attachments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Lampiran ({ticket.attachments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {ticket.attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {attachment.originalName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(attachment.size)}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(attachment)}
                        className="shrink-0 gap-1"
                      >
                        <Download className="h-4 w-4" />
                        <span className="hidden sm:inline">Unduh</span>
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cancellation/Rejection Reason */}
          {(ticket.status === "DIBATALKAN" || ticket.status === "DITOLAK") && ticket.alasanBatal && (
            <Card className="border-red-200 dark:border-red-800">
              <CardHeader>
                <CardTitle className="text-lg text-destructive">
                  {ticket.status === "DITOLAK" ? "Alasan Penolakan" : "Alasan Pembatalan"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{ticket.alasanBatal}</p>
              </CardContent>
            </Card>
          )}

          {/* Inline Rating Form */}
          {showRatingForm && (
            <InlineRatingForm
              ticketId={ticket.id}
              onRatingSubmitted={fetchTicket}
            />
          )}

          {/* Rating Display */}
          {ticket.rating && (
            <RatingDisplay
              bintang={ticket.rating.bintang}
              feedback={ticket.rating.feedback}
              createdAt={ticket.rating.createdAt}
            />
          )}
        </div>

        {/* Right Column - Metadata */}
        <div className="space-y-6">
          {/* Ticket Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informasi Tiket</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoRow
                icon={<Tag className="h-4 w-4" />}
                label="Kategori"
                value={CATEGORY_LABELS[ticket.kategori] || ticket.kategori}
              />
              <InfoRow
                icon={<MapPin className="h-4 w-4" />}
                label="Lokasi"
                value={ticket.lokasi}
              />
              <InfoRow
                icon={<User className="h-4 w-4" />}
                label="Pelapor"
                value={ticket.creator.nama}
              />
              <InfoRow
                icon={<Building2 className="h-4 w-4" />}
                label="Divisi/Satker"
                value={ticket.divisiSatker || "—"}
              />
              <InfoRow
                icon={<User className="h-4 w-4" />}
                label="Padal Ditugaskan"
                value={ticket.padal?.nama || "—"}
              />
            </CardContent>
          </Card>

          {/* Timestamps Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoRow
                icon={<Calendar className="h-4 w-4" />}
                label="Tanggal Buat"
                value={formatDateTime(ticket.tanggalBuat)}
              />
              <InfoRow
                icon={<Calendar className="h-4 w-4" />}
                label="Tanggal Assign"
                value={formatDateTime(ticket.tanggalAssign)}
              />
              <InfoRow
                icon={<Calendar className="h-4 w-4" />}
                label="Tanggal Selesai"
                value={formatDateTime(ticket.tanggalSelesai)}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cancel Modal */}
      <CancelTicketModal
        open={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        ticketId={ticket.id}
        ticketNumber={ticket.nomorTiket}
        userRole={user?.role}
        onCancelled={handleCancelSuccess}
        onOptimisticCancel={handleOptimisticCancel}
        onCancelError={handleCancelError}
      />

      {/* Reject Modal */}
      <RejectTicketModal
        open={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        ticketId={ticket.id}
        ticketNumber={ticket.nomorTiket}
        onRejected={handleRejectSuccess}
        onOptimisticReject={handleOptimisticReject}
        onRejectError={handleRejectError}
      />

      {/* Assign Modal */}
      <AssignModal
        open={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        ticketId={ticket.id}
        ticketNumber={ticket.nomorTiket}
        onAssigned={handleAssignSuccess}
        onOptimisticAssign={handleOptimisticAssign}
        onAssignError={handleAssignError}
      />

      {/* Complete Confirmation Dialog */}
      <ConfirmModal
        open={confirmCompleteOpen}
        onOpenChange={setConfirmCompleteOpen}
        title="Selesaikan Tiket"
        description={
          <span>
            Apakah Anda yakin ingin menandai tiket{" "}
            <span className="font-semibold">{ticket.nomorTiket}</span> sebagai
            selesai? Tindakan ini tidak dapat dibatalkan.
          </span>
        }
        confirmLabel="Ya, Selesaikan"
        cancelLabel="Batal"
        onConfirm={handleComplete}
        isLoading={completeLoading}
      />
    </div>
  );
}

// ─── Info Row Component ─────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium break-words">{value}</p>
      </div>
    </div>
  );
}

// ─── Assign Modal (inline) ──────────────────────────────────────────────────

function AssignModal({
  open,
  onClose,
  ticketId,
  ticketNumber,
  onAssigned,
  onOptimisticAssign,
  onAssignError,
}: {
  open: boolean;
  onClose: () => void;
  ticketId: string;
  ticketNumber: string;
  onAssigned: () => void;
  onOptimisticAssign?: (padalId: string, padalNama: string) => void;
  onAssignError?: (message: string) => void;
}) {
  const [padalList, setPadalList] = useState<PadalUser[]>([]);
  const [selectedPadalId, setSelectedPadalId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedPadalId("");
      setError(null);
      fetchPadalUsers();
    }
  }, [open]);

  async function fetchPadalUsers() {
    setFetching(true);
    try {
      const res = await staffApi.listUsers({ role: "PADAL", pageSize: 100 });
      const data = res.data?.data || res.data;
      const users = (Array.isArray(data) ? data : []).filter(
        (u: { deletedAt?: string | null }) => !u.deletedAt
      );
      setPadalList(users);
    } catch {
      setPadalList([]);
    } finally {
      setFetching(false);
    }
  }

  async function handleAssign() {
    if (!selectedPadalId) return;
    setLoading(true);
    setError(null);

    // Find selected Padal name for optimistic update
    const selectedPadal = padalList.find((p) => p.id === selectedPadalId);
    const padalNama = selectedPadal?.nama || "";

    // Optimistic update: immediately update parent state
    if (onOptimisticAssign) {
      onOptimisticAssign(selectedPadalId, padalNama);
    }
    onClose();

    try {
      await ticketApi.assign(ticketId, { padalId: selectedPadalId });
      onAssigned();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Gagal assign tiket. Silakan coba lagi.";
      if (onAssignError) {
        onAssignError(message);
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Tiket</DialogTitle>
          <DialogDescription>
            Pilih Padal untuk tiket{" "}
            <span className="font-semibold">{ticketNumber}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {fetching ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">
                Memuat daftar Padal...
              </span>
            </div>
          ) : padalList.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Tidak ada Padal aktif yang tersedia.
            </p>
          ) : (
            <Select value={selectedPadalId} onValueChange={setSelectedPadalId}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih Padal..." />
              </SelectTrigger>
              <SelectContent>
                {padalList.map((padal) => (
                  <SelectItem key={padal.id} value={padal.id}>
                    {padal.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Batal
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedPadalId || loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
