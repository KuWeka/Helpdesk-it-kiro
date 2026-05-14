"use client";

import React, { useEffect, useState } from "react";
import { Activity, CheckCircle2, Inbox } from "lucide-react";
import { dashboardApi, ticketApi } from "@/lib/api";
import { StatCard } from "@/components/dashboard/StatCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRouter } from "next/navigation";

// ─── Types ──────────────────────────────────────────────────────────────────

interface TeknisiDashboardData {
  hasPadal: boolean;
  activeCount: number;
  completedCount: number;
}

interface TicketRow {
  id: string;
  nomorTiket: string;
  judul: string;
  lokasi: string;
  tanggalAssign: string | null;
  creator?: { nama: string };
}

// ─── Component ──────────────────────────────────────────────────────────────

export function TeknisiDashboard() {
  const router = useRouter();
  const [data, setData] = useState<TeknisiDashboardData | null>(null);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const res = await dashboardApi.getTeknisi();
        const dashboardData: TeknisiDashboardData = res.data?.data || res.data;
        setData(dashboardData);

        // If assigned to a Padal, also fetch active tickets for the table
        if (dashboardData.hasPadal) {
          const ticketRes = await ticketApi.list({ status: "PROSES", pageSize: "20" });
          const ticketData = ticketRes.data?.data || [];
          setTickets(Array.isArray(ticketData) ? ticketData : []);
        }
      } catch (err) {
        setError("Gagal memuat data dashboard. Silakan coba lagi.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="card" />
        <LoadingSkeleton variant="table" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <EmptyState
        icon={Inbox}
        title="Terjadi Kesalahan"
        description={error}
      />
    );
  }

  // Not assigned to any Padal team
  if (!data?.hasPadal) {
    return (
      <EmptyState
        icon={Inbox}
        title="Belum Ditugaskan"
        description="Anda belum ditugaskan ke tim manapun. Hubungi Bidtekkom untuk penugasan."
      />
    );
  }

  // Assigned to Padal - show stat cards and ticket table
  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          title="Tiket Aktif"
          value={data.activeCount}
          icon={Activity}
          variant="info"
        />
        <StatCard
          title="Tiket Selesai"
          value={data.completedCount}
          icon={CheckCircle2}
          variant="success"
        />
      </div>

      {/* Read-only note */}
      <p className="text-sm text-muted-foreground">
        Tampilan hanya-baca. Anda dapat melihat tiket yang ditangani oleh tim Anda.
      </p>

      {/* Ticket Table */}
      {tickets.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Tidak Ada Tiket Aktif"
          description="Saat ini tidak ada tiket aktif yang ditangani oleh tim Anda."
        />
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">No. Tiket</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Judul</TableHead>
                <TableHead className="hidden md:table-cell text-xs font-semibold text-slate-500 uppercase tracking-wide">Pelapor</TableHead>
                <TableHead className="hidden md:table-cell text-xs font-semibold text-slate-500 uppercase tracking-wide">Lokasi</TableHead>
                <TableHead className="hidden sm:table-cell text-xs font-semibold text-slate-500 uppercase tracking-wide">Tgl Assign</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => (
                <TableRow
                  key={ticket.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/dashboard/tickets/${ticket.id}`)}
                  tabIndex={0}
                  role="link"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(`/dashboard/tickets/${ticket.id}`);
                    }
                  }}
                >
                  <TableCell className="font-mono text-sm">
                    {ticket.nomorTiket}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {ticket.judul}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {ticket.creator?.nama || "-"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {ticket.lokasi}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {ticket.tanggalAssign
                      ? new Date(ticket.tanggalAssign).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
