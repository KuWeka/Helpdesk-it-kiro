"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useTheme } from "next-themes";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import {
  Ticket,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  UserPlus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard } from "@/components/dashboard/StatCard";
import { QuickAssignModal } from "@/components/dashboard/QuickAssignModal";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { StatusBadge } from "@/components/tickets/StatusBadge";
import { dashboardApi } from "@/lib/api";
import { formatDate } from "@/lib/formatters";

// ─── Types ──────────────────────────────────────────────────────────────────

interface TicketItem {
  id: string;
  nomorTiket: string;
  judul: string;
  status: string;
  tanggalBuat: string;
  creator?: { nama: string };
}

interface MonthlyTrend {
  month: number;
  count: number;
}

interface BidtekkomData {
  totalTickets: number;
  counts: {
    PENDING: number;
    PROSES: number;
    SELESAI: number;
    DIBATALKAN: number;
    DITOLAK: number;
  };
  userCount: number;
  monthlyTrend: MonthlyTrend[];
  recentTickets: TicketItem[];
  unassignedTickets: TicketItem[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

// ─── Component ──────────────────────────────────────────────────────────────

export function BidtekkomDashboard() {
  const { resolvedTheme } = useTheme();
  const [data, setData] = useState<BidtekkomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quick-assign modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<{
    id: string;
    nomorTiket: string;
  } | null>(null);

  // Ref to store previous unassigned tickets for revert
  const [previousUnassigned, setPreviousUnassigned] = useState<TicketItem[] | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await dashboardApi.getBidtekkom();
      const responseData = res.data?.data || res.data;
      setData(responseData);
      setError(null);
    } catch {
      setError("Gagal memuat data dashboard. Silakan refresh halaman.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleQuickAssign(ticket: TicketItem) {
    setSelectedTicket({ id: ticket.id, nomorTiket: ticket.nomorTiket });
    setAssignModalOpen(true);
  }

  // Optimistic assign: immediately remove ticket from unassigned list
  function handleOptimisticAssign(ticketId: string, _padalId: string, _padalNama: string) {
    if (!data) return;
    setPreviousUnassigned([...data.unassignedTickets]);
    setData({
      ...data,
      unassignedTickets: data.unassignedTickets.filter((t) => t.id !== ticketId),
      counts: {
        ...data.counts,
        PENDING: Math.max(0, data.counts.PENDING - 1),
        PROSES: data.counts.PROSES + 1,
      },
    });
  }

  // Revert optimistic assign on error
  function handleAssignError(ticketId: string) {
    if (!data || !previousUnassigned) return;
    setData({
      ...data,
      unassignedTickets: previousUnassigned,
      counts: {
        ...data.counts,
        PENDING: data.counts.PENDING + 1,
        PROSES: Math.max(0, data.counts.PROSES - 1),
      },
    });
    setPreviousUnassigned(null);
  }

  function handleAssigned() {
    // Refresh dashboard data after successful assignment
    setPreviousUnassigned(null);
    fetchData();
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="card" />
        <LoadingSkeleton variant="table" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="mt-4 text-sm text-muted-foreground">
          {error || "Data tidak tersedia."}
        </p>
        <Button variant="outline" className="mt-4" onClick={fetchData}>
          Coba Lagi
        </Button>
      </div>
    );
  }

  // Prepare chart data — teal-based palette
  const barChartData = [
    { name: "PENDING", value: data.counts.PENDING, fill: "#f59e0b" },
    { name: "PROSES", value: data.counts.PROSES, fill: "#0d9488" },
    { name: "SELESAI", value: data.counts.SELESAI, fill: "#16a34a" },
    { name: "DIBATALKAN", value: data.counts.DIBATALKAN, fill: "#dc2626" },
    { name: "DITOLAK", value: data.counts.DITOLAK, fill: "#be123c" },
  ];

  const lineChartData = data.monthlyTrend.map((item) => ({
    name: MONTH_LABELS[item.month - 1],
    tiket: item.count,
  }));

  // Dark mode aware chart colors
  const isDark = resolvedTheme === "dark";
  const axisTickColor = isDark ? "hsl(215, 20%, 65%)" : "hsl(215, 16%, 47%)";
  const gridStrokeColor = isDark ? "hsl(217, 33%, 17%)" : "hsl(214, 32%, 91%)";

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Dashboard Bidtekkom</h1>
        <p className="text-sm text-muted-foreground">
          Ringkasan aktivitas sistem SIGAP
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total Tiket"
          value={data.totalTickets}
          icon={Ticket}
          variant="default"
        />
        <StatCard
          title="Pending"
          value={data.counts.PENDING}
          icon={Clock}
          variant="warning"
        />
        <StatCard
          title="Proses"
          value={data.counts.PROSES}
          icon={AlertCircle}
          variant="info"
        />
        <StatCard
          title="Selesai"
          value={data.counts.SELESAI}
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="Total User"
          value={data.userCount}
          icon={Users}
          variant="default"
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bar Chart - Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-200">Distribusi Tiket per Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStrokeColor} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: axisTickColor, fontSize: 12 }}
                    axisLine={{ stroke: gridStrokeColor }}
                    tickLine={{ stroke: gridStrokeColor }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: axisTickColor, fontSize: 12 }}
                    axisLine={{ stroke: gridStrokeColor }}
                    tickLine={{ stroke: gridStrokeColor }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--card-foreground))",
                    }}
                    labelStyle={{ color: "hsl(var(--card-foreground))" }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Line Chart - Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-200">
              Tren Pembuatan Tiket Bulanan ({new Date().getFullYear()})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStrokeColor} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: axisTickColor, fontSize: 12 }}
                    axisLine={{ stroke: gridStrokeColor }}
                    tickLine={{ stroke: gridStrokeColor }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: axisTickColor, fontSize: 12 }}
                    axisLine={{ stroke: gridStrokeColor }}
                    tickLine={{ stroke: gridStrokeColor }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--card-foreground))",
                    }}
                    labelStyle={{ color: "hsl(var(--card-foreground))" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="tiket"
                    stroke="#0d9488"
                    strokeWidth={2}
                    dot={{ fill: "#0d9488", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tickets Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-200">Tiket Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentTickets.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Belum ada tiket.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">No. Tiket</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Judul</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Satker</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tanggal Buat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentTickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-mono text-sm">
                        {ticket.nomorTiket}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {ticket.judul}
                      </TableCell>
                      <TableCell>{ticket.creator?.nama || "-"}</TableCell>
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

      {/* Unassigned Tickets Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Clock className="size-5 text-amber-500 dark:text-amber-400" />
            Tiket Belum Di-assign
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.unassignedTickets.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Semua tiket sudah di-assign.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">No. Tiket</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Judul</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Satker</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tanggal Buat</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.unassignedTickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-mono text-sm">
                        {ticket.nomorTiket}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {ticket.judul}
                      </TableCell>
                      <TableCell>{ticket.creator?.nama || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(ticket.tanggalBuat)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0"
                          onClick={() => handleQuickAssign(ticket)}
                        >
                          <UserPlus className="mr-1.5 size-3.5" />
                          Assign
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

      {/* Quick Assign Modal */}
      {selectedTicket && (
        <QuickAssignModal
          open={assignModalOpen}
          onClose={() => {
            setAssignModalOpen(false);
            setSelectedTicket(null);
          }}
          ticketId={selectedTicket.id}
          ticketNumber={selectedTicket.nomorTiket}
          onAssigned={handleAssigned}
          onOptimisticAssign={handleOptimisticAssign}
          onAssignError={handleAssignError}
        />
      )}
    </div>
  );
}
