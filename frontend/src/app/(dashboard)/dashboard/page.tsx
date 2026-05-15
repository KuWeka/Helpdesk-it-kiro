"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  ShieldX,
  Ticket,
  Plus,
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { StatCard } from "@/components/dashboard/StatCard";
import { useSatkerDashboard } from "@/hooks/useDashboard";
import { UnratedTicketsBanner } from "@/components/dashboard/UnratedTicketsBanner";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { StatusBadge } from "@/components/tickets/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/formatters";

// ─── Satker Dashboard Content ───────────────────────────────────────────────

function SatkerDashboard() {
  const router = useRouter();
  const { data, isLoading, isError } = useSatkerDashboard();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="card" />
        <LoadingSkeleton variant="table" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-destructive">Gagal memuat data dashboard</p>
      </div>
    );
  }

  if (!data) return null;

  const typedData = data as {
    counts: { PENDING: number; PROSES: number; SELESAI: number; DIBATALKAN: number; DITOLAK: number };
    recentTickets: { id: string; nomorTiket: string; judul: string; status: string; tanggalBuat: string }[];
    unratedCount: number;
  };

  const hasTickets =
    typedData.counts.PENDING +
      typedData.counts.PROSES +
      typedData.counts.SELESAI +
      typedData.counts.DIBATALKAN +
      typedData.counts.DITOLAK >
    0;

  // Empty state: no tickets at all
  if (!hasTickets) {
    return (
      <EmptyState
        icon={Ticket}
        title="Belum Ada Tiket"
        description="Anda belum membuat tiket bantuan IT. Buat tiket pertama Anda untuk mendapatkan bantuan."
        action={
          <Button onClick={() => router.push("/dashboard/create-ticket")}>
            <Plus className="mr-2 size-4" />
            Buat Tiket Baru
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Pending"
          value={typedData.counts.PENDING}
          icon={Clock}
          variant="warning"
        />
        <StatCard
          title="Proses"
          value={typedData.counts.PROSES}
          icon={Loader2}
          variant="info"
        />
        <StatCard
          title="Selesai"
          value={typedData.counts.SELESAI}
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="Dibatalkan"
          value={typedData.counts.DIBATALKAN}
          icon={XCircle}
          variant="danger"
        />
        <StatCard
          title="Ditolak"
          value={typedData.counts.DITOLAK}
          icon={ShieldX}
          variant="danger"
        />
      </div>

      {/* Unrated Tickets Banner */}
      <UnratedTicketsBanner count={typedData.unratedCount} />

      {/* Recent Tickets Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-200">
            Tiket Terbaru
          </CardTitle>
        </CardHeader>
        <CardContent>
          {typedData.recentTickets.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Tidak ada tiket terbaru.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">No. Tiket</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Judul</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tanggal Buat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {typedData.recentTickets.map((ticket) => (
                    <TableRow
                      key={ticket.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() =>
                        router.push(`/dashboard/tickets/${ticket.id}`)
                      }
                      tabIndex={0}
                      role="link"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          router.push(`/dashboard/tickets/${ticket.id}`);
                        }
                      }}
                    >
                      <TableCell className="font-mono text-sm text-slate-700 dark:text-slate-300">
                        {ticket.nomorTiket}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-slate-700 dark:text-slate-300">
                        {ticket.judul}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={ticket.status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(ticket.tanggalBuat)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { BidtekkomDashboard } from "@/components/dashboard/BidtekkomDashboard";
import { PadalDashboard } from "@/components/dashboard/PadalDashboard";
import { TeknisiDashboard } from "@/components/dashboard/TeknisiDashboard";

// ─── Main Dashboard Page (Role-Conditional) ─────────────────────────────────

export default function DashboardPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <LoadingSkeleton variant="card" />
        <LoadingSkeleton variant="table" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Selamat datang, {user.nama}
        </p>
      </div>

      {user.role === "SATKER" && <SatkerDashboard />}
      {user.role === "BIDTEKKOM" && <BidtekkomDashboard />}
      {user.role === "PADAL" && <PadalDashboard />}
      {user.role === "TEKNISI" && <TeknisiDashboard />}
    </div>
  );
}
