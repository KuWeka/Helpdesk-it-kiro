"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardCheck,
  CheckCircle2,
  Star,
  Users,
  Phone,
  Inbox,
} from "lucide-react";
import { dashboardApi, ticketApi } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import { StatCard } from "@/components/dashboard/StatCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
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
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { useToast } from "@/components/ui/use-toast";

// ─── Types ──────────────────────────────────────────────────────────────────

interface PadalDashboardData {
  activeCount: number;
  completedCount: number;
  averageRating: number | null;
  teamMembers: TeamMember[];
}

interface TeamMember {
  id: string;
  nama: string;
  nomorWhatsApp: string;
}

interface ActiveTicket {
  id: string;
  nomorTiket: string;
  judul: string;
  lokasi: string;
  tanggalAssign: string;
  creator: {
    nama: string;
  };
}

// ─── Component ──────────────────────────────────────────────────────────────

export function PadalDashboard() {
  const router = useRouter();
  const { toast } = useToast();

  const [dashboardData, setDashboardData] = useState<PadalDashboardData | null>(null);
  const [activeTickets, setActiveTickets] = useState<ActiveTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmTicket, setConfirmTicket] = useState<ActiveTicket | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  // Fetch dashboard data and active tickets
  const fetchData = useCallback(async () => {
    try {
      const [dashRes, ticketsRes] = await Promise.all([
        dashboardApi.getPadal(),
        ticketApi.list({ status: "PROSES", sortBy: "tanggalAssign", sortOrder: "asc" }),
      ]);

      const dashData = dashRes.data?.data || dashRes.data;
      setDashboardData(dashData);

      const ticketsData = ticketsRes.data?.data || [];
      // Handle paginated or direct array response
      const tickets = Array.isArray(ticketsData) ? ticketsData : [];
      setActiveTickets(tickets);
    } catch {
      toast({
        title: "Gagal memuat data",
        description: "Terjadi kesalahan saat memuat dashboard.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle completing a ticket with optimistic UI update
  const handleComplete = async () => {
    if (!confirmTicket) return;

    setIsCompleting(true);

    // Save previous state for revert
    const previousTickets = [...activeTickets];
    const previousDashboardData = dashboardData ? { ...dashboardData } : null;

    // Optimistic update: immediately remove ticket from active list and update counts
    setActiveTickets((prev) => prev.filter((t) => t.id !== confirmTicket.id));
    if (dashboardData) {
      setDashboardData({
        ...dashboardData,
        activeCount: Math.max(0, dashboardData.activeCount - 1),
        completedCount: dashboardData.completedCount + 1,
      });
    }
    setConfirmTicket(null);

    try {
      await ticketApi.complete(confirmTicket.id);
      toast({
        title: "Tiket diselesaikan",
        description: `Tiket ${confirmTicket.nomorTiket} berhasil ditandai selesai.`,
      });
      // Refresh data to get accurate server state
      await fetchData();
    } catch {
      // Revert optimistic update on error
      setActiveTickets(previousTickets);
      if (previousDashboardData) {
        setDashboardData(previousDashboardData);
      }
      toast({
        title: "Gagal menyelesaikan tiket",
        description: "Terjadi kesalahan. Silakan coba lagi.",
        variant: "destructive",
      });
    } finally {
      setIsCompleting(false);
    }
  };

  // ─── Loading State ──────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard Padal</h1>
        <LoadingSkeleton variant="card" />
        <LoadingSkeleton variant="table" />
        <LoadingSkeleton variant="list" />
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Dashboard Padal</h1>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Tiket Aktif"
          value={dashboardData?.activeCount ?? 0}
          icon={ClipboardCheck}
          variant="warning"
        />
        <StatCard
          title="Tiket Selesai"
          value={dashboardData?.completedCount ?? 0}
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="Rating Rata-rata"
          value={dashboardData?.averageRating != null ? dashboardData.averageRating.toFixed(1) : "-"}
          icon={Star}
          variant="info"
        />
      </div>

      {/* Active Tickets Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-200">Tiket Aktif</CardTitle>
        </CardHeader>
        <CardContent>
          {activeTickets.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Tidak ada tiket aktif"
              description="Saat ini tidak ada tiket yang sedang dikerjakan."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">No. Tiket</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Judul</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Satker</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Lokasi</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tgl Assign</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeTickets.map((ticket) => (
                    <TableRow
                      key={ticket.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/tickets/${ticket.id}`)}
                      tabIndex={0}
                      role="link"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          router.push(`/tickets/${ticket.id}`);
                        }
                      }}
                    >
                      <TableCell className="font-medium">{ticket.nomorTiket}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{ticket.judul}</TableCell>
                      <TableCell>{ticket.creator?.nama ?? "-"}</TableCell>
                      <TableCell>{ticket.lokasi}</TableCell>
                      <TableCell>{formatDate(ticket.tanggalAssign)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="default"
                          className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmTicket(ticket);
                          }}
                        >
                          Selesai
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Members Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-800 dark:text-slate-200">
            <Users className="size-5" />
            Tim Teknisi
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!dashboardData?.teamMembers || dashboardData.teamMembers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Belum ada anggota tim"
              description="Belum ada Teknisi yang ditugaskan ke tim Anda."
            />
          ) : (
            <div className="space-y-3">
              {dashboardData.teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <p className="font-medium">{member.nama}</p>
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {member.nomorWhatsApp}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Modal for "Selesai" action */}
      <ConfirmModal
        open={!!confirmTicket}
        onOpenChange={(open) => !open && setConfirmTicket(null)}
        title="Selesaikan Tiket"
        description={
          <span>
            Apakah Anda yakin ingin menandai tiket{" "}
            <span className="font-semibold">{confirmTicket?.nomorTiket}</span> sebagai selesai?
            Tindakan ini tidak dapat dibatalkan.
          </span>
        }
        confirmLabel="Ya, Selesaikan"
        cancelLabel="Batal"
        onConfirm={handleComplete}
        isLoading={isCompleting}
      />
    </div>
  );
}
