"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  Ticket,
  Plus,
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { dashboardApi } from "@/lib/api";
import { StatCard } from "@/components/dashboard/StatCard";
import { UnratedTicketsBanner } from "@/components/dashboard/UnratedTicketsBanner";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Badge } from "@/components/ui/badge";
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

// ─── Types ──────────────────────────────────────────────────────────────────

interface SatkerDashboardData {
  counts: {
    PENDING: number;
    PROSES: number;
    SELESAI: number;
    DIBATALKAN: number;
  };
  recentTickets: {
    id: string;
    nomorTiket: string;
    judul: string;
    status: string;
    tanggalBuat: string;
  }[];
  unratedCount: number;
}

// ─── Status Badge Helper ────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: "Pending",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  PROSES: {
    label: "Proses",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  },
  SELESAI: {
    label: "Selesai",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800",
  },
  DIBATALKAN: {
    label: "Dibatalkan",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800",
  },
};

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || { label: status, className: "" };
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}

// ─── Date Formatter ─────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─── Satker Dashboard Content ───────────────────────────────────────────────

function SatkerDashboard() {
  const router = useRouter();
  const [data, setData] = useState<SatkerDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const response = await dashboardApi.getSatker();
        setData(response.data.data);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Gagal memuat data dashboard";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="card" />
        <LoadingSkeleton variant="table" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const hasTickets =
    data.counts.PENDING +
      data.counts.PROSES +
      data.counts.SELESAI +
      data.counts.DIBATALKAN >
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
            <Plus className="mr-2 h-4 w-4" />
            Buat Tiket Baru
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Pending"
          value={data.counts.PENDING}
          icon={Clock}
          variant="warning"
        />
        <StatCard
          title="Proses"
          value={data.counts.PROSES}
          icon={Loader2}
          variant="info"
        />
        <StatCard
          title="Selesai"
          value={data.counts.SELESAI}
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="Dibatalkan"
          value={data.counts.DIBATALKAN}
          icon={XCircle}
          variant="danger"
        />
      </div>

      {/* Unrated Tickets Banner */}
      <UnratedTicketsBanner count={data.unratedCount} />

      {/* Recent Tickets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tiket Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentTickets.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Tidak ada tiket terbaru.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Tiket</TableHead>
                    <TableHead>Judul</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tanggal Buat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentTickets.map((ticket) => (
                    <TableRow
                      key={ticket.id}
                      className="cursor-pointer hover:bg-muted/50"
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
                      <TableCell className="font-mono text-sm">
                        {ticket.nomorTiket}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {ticket.judul}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={ticket.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
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
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
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
