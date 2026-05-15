"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  FileText,
  FileSpreadsheet,
  Download,
  Calendar,
  Ticket,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  Star,
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { reportApi } from "@/lib/api";
import { StatCard } from "@/components/dashboard/StatCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { formatDate } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ReportTicketRow {
  nomorTiket: string;
  judul: string;
  namaSatker: string;
  divisiSatker: string | null;
  lokasi: string;
  tanggalBuat: string;
  tanggalAssign: string | null;
  tanggalSelesai: string | null;
  status: string;
  rating: {
    bintang: number;
    feedback: string;
  } | null;
}

interface ReportSummary {
  total: number;
  pending: number;
  proses: number;
  selesai: number;
  dibatalkan: number;
  averageRating: number | null;
}

interface ReportData {
  tickets: ReportTicketRow[];
  summary: ReportSummary;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MONTHS = [
  { value: "1", label: "Januari" },
  { value: "2", label: "Februari" },
  { value: "3", label: "Maret" },
  { value: "4", label: "April" },
  { value: "5", label: "Mei" },
  { value: "6", label: "Juni" },
  { value: "7", label: "Juli" },
  { value: "8", label: "Agustus" },
  { value: "9", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
];

function getYearOptions(): string[] {
  const currentYear = new Date().getFullYear();
  const years: string[] = [];
  for (let y = currentYear; y >= currentYear - 5; y--) {
    years.push(String(y));
  }
  return years;
}

// ─── Status Badge Helper ────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: "Pending",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  PROSES: {
    label: "Proses",
    className:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  },
  SELESAI: {
    label: "Selesai",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800",
  },
  DIBATALKAN: {
    label: "Dibatalkan",
    className:
      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800",
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

// ─── Star Rating Display ────────────────────────────────────────────────────

function RatingStars({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted-foreground">-</span>;
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i < value
              ? "fill-amber-400 text-amber-400"
              : "fill-muted text-muted-foreground/30"
          }`}
        />
      ))}
    </span>
  );
}

// ─── Main Report Page ───────────────────────────────────────────────────────

export default function ReportsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState<string>(String(now.getMonth() + 1));
  const [year, setYear] = useState<string>(String(now.getFullYear()));
  const [data, setData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const yearOptions = getYearOptions();

  const fetchReport = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await reportApi.getMonthly({
        month: Number(month),
        year: Number(year),
      });
      setData(response.data.data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Gagal memuat data laporan";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchReport();
    }
  }, [fetchReport, authLoading, user]);

  const handleExportPDF = async () => {
    try {
      setIsExportingPDF(true);
      const response = await reportApi.exportPDF({
        month: Number(month),
        year: Number(year),
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `laporan-bulanan-${year}-${month.padStart(2, "0")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      setError("Gagal mengunduh file PDF");
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsExportingExcel(true);
      const response = await reportApi.exportExcel({
        month: Number(month),
        year: Number(year),
      });
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `laporan-bulanan-${year}-${month.padStart(2, "0")}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      setError("Gagal mengunduh file Excel");
    } finally {
      setIsExportingExcel(false);
    }
  };

  if (authLoading) {
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
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Laporan Bulanan</h1>
        <p className="text-muted-foreground">
          {user.role === "PADAL"
            ? "Laporan tiket yang ditugaskan kepada Anda"
            : "Laporan seluruh tiket helpdesk"}
        </p>
      </div>

      {/* Filters and Export */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          {/* Month Selector */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">
              Bulan
            </label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Pilih bulan" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Year Selector */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">
              Tahun
            </label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Pilih tahun" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="min-h-[44px] lg:min-h-0"
            onClick={handleExportPDF}
            disabled={isExportingPDF || isLoading || !data?.tickets.length}
          >
            {isExportingPDF ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            Export PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="min-h-[44px] lg:min-h-0"
            onClick={handleExportExcel}
            disabled={isExportingExcel || isLoading || !data?.tickets.length}
          >
            {isExportingExcel ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="mr-2 h-4 w-4" />
            )}
            Export Excel
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-6">
          <LoadingSkeleton variant="card" />
          <LoadingSkeleton variant="table" />
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="flex items-center justify-center py-12">
          <p className="text-destructive">{error}</p>
        </div>
      )}

      {/* Data Content */}
      {!isLoading && !error && data && (
        <>
          {/* Summary Section */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard
              title="Total Tiket"
              value={data.summary.total}
              icon={Ticket}
              variant="default"
            />
            <StatCard
              title="Pending"
              value={data.summary.pending}
              icon={Clock}
              variant="warning"
            />
            <StatCard
              title="Proses"
              value={data.summary.proses}
              icon={Loader2}
              variant="info"
            />
            <StatCard
              title="Selesai"
              value={data.summary.selesai}
              icon={CheckCircle2}
              variant="success"
            />
            <StatCard
              title="Dibatalkan"
              value={data.summary.dibatalkan}
              icon={XCircle}
              variant="danger"
            />
            <StatCard
              title="Rata-rata Rating"
              value={
                data.summary.averageRating !== null
                  ? data.summary.averageRating.toFixed(1)
                  : "-"
              }
              icon={Star}
              variant="default"
            />
          </div>

          {/* Data Table or Empty State */}
          {data.tickets.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="Tidak Ada Data"
              description={`Tidak ada tiket untuk bulan ${
                MONTHS.find((m) => m.value === month)?.label
              } ${year}.`}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Data Tiket — {MONTHS.find((m) => m.value === month)?.label}{" "}
                  {year}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>No. Tiket</TableHead>
                        <TableHead>Judul</TableHead>
                        <TableHead>Nama Satker</TableHead>
                        <TableHead>Divisi</TableHead>
                        <TableHead>Lokasi</TableHead>
                        <TableHead>Tgl Buat</TableHead>
                        <TableHead>Tgl Assign</TableHead>
                        <TableHead>Tgl Selesai</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>Feedback</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.tickets.map((ticket) => (
                        <TableRow key={ticket.nomorTiket}>
                          <TableCell className="font-mono text-sm whitespace-nowrap">
                            {ticket.nomorTiket}
                          </TableCell>
                          <TableCell className="max-w-[180px] truncate">
                            {ticket.judul}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {ticket.namaSatker}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {ticket.divisiSatker || "-"}
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate">
                            {ticket.lokasi}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {formatDate(ticket.tanggalBuat)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {formatDate(ticket.tanggalAssign)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {formatDate(ticket.tanggalSelesai)}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={ticket.status} />
                          </TableCell>
                          <TableCell>
                            <RatingStars value={ticket.rating?.bintang ?? null} />
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                            {ticket.rating?.feedback || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
