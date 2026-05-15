"use client";

import React, { useState } from "react";
import {
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
} from "@tanstack/react-table";
import { useAuth } from "@/providers/AuthProvider";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuditLogs } from "@/hooks/useAudit";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { formatTimestamp, formatMetadata } from "@/lib/formatters";

// ─── Types ──────────────────────────────────────────────────────────────────

type AuditEventType =
  | "LOGIN"
  | "REGISTRATION"
  | "TICKET_CREATION"
  | "TICKET_ASSIGNMENT"
  | "TICKET_COMPLETION"
  | "TICKET_CANCELLATION"
  | "TICKET_REJECTION"
  | "TICKET_RATING"
  | "USER_SOFT_DELETE"
  | "ROLE_CHANGE"
  | "PASSWORD_RESET"
  | "PASSWORD_CHANGE"
  | "SETTINGS_CHANGE"
  | "TEAM_ASSIGNMENT"
  | "TEAM_REMOVAL";

interface AuditLogEntry {
  id: string;
  eventType: AuditEventType;
  actorId: string;
  actorNama: string;
  targetEntityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const EVENT_TYPES: AuditEventType[] = [
  "LOGIN",
  "REGISTRATION",
  "TICKET_CREATION",
  "TICKET_ASSIGNMENT",
  "TICKET_COMPLETION",
  "TICKET_CANCELLATION",
  "TICKET_REJECTION",
  "TICKET_RATING",
  "USER_SOFT_DELETE",
  "ROLE_CHANGE",
  "PASSWORD_RESET",
  "PASSWORD_CHANGE",
  "SETTINGS_CHANGE",
  "TEAM_ASSIGNMENT",
  "TEAM_REMOVAL",
];

const EVENT_TYPE_LABELS: Record<AuditEventType, string> = {
  LOGIN: "Login",
  REGISTRATION: "Registrasi",
  TICKET_CREATION: "Buat Tiket",
  TICKET_ASSIGNMENT: "Assign Tiket",
  TICKET_COMPLETION: "Selesai Tiket",
  TICKET_CANCELLATION: "Batal Tiket",
  TICKET_REJECTION: "Tolak Tiket",
  TICKET_RATING: "Rating Tiket",
  USER_SOFT_DELETE: "Hapus User",
  ROLE_CHANGE: "Ubah Role",
  PASSWORD_RESET: "Reset Password",
  PASSWORD_CHANGE: "Ubah Password",
  SETTINGS_CHANGE: "Ubah Pengaturan",
  TEAM_ASSIGNMENT: "Tambah Tim",
  TEAM_REMOVAL: "Hapus Tim",
};

const EVENT_TYPE_COLORS: Record<AuditEventType, string> = {
  LOGIN: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  REGISTRATION: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  TICKET_CREATION: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  TICKET_ASSIGNMENT: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  TICKET_COMPLETION: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  TICKET_CANCELLATION: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  TICKET_REJECTION: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
  TICKET_RATING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  USER_SOFT_DELETE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  ROLE_CHANGE: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  PASSWORD_RESET: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  PASSWORD_CHANGE: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  SETTINGS_CHANGE: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200",
  TEAM_ASSIGNMENT: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  TEAM_REMOVAL: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
};

// ─── Column Definitions ─────────────────────────────────────────────────────

const columnHelper = createColumnHelper<AuditLogEntry>();

const columns: ColumnDef<AuditLogEntry, unknown>[] = [
  columnHelper.accessor("createdAt", {
    header: "Waktu",
    cell: (info) => (
      <span className="text-sm whitespace-nowrap">
        {formatTimestamp(info.getValue() as string)}
      </span>
    ),
  }) as ColumnDef<AuditLogEntry, unknown>,
  columnHelper.accessor("eventType", {
    header: "Tipe Event",
    cell: (info) => {
      const eventType = info.getValue() as AuditEventType;
      return (
        <Badge className={`${EVENT_TYPE_COLORS[eventType]} border-0 text-xs`}>
          {EVENT_TYPE_LABELS[eventType]}
        </Badge>
      );
    },
  }) as ColumnDef<AuditLogEntry, unknown>,
  columnHelper.accessor("actorNama", {
    header: "Aktor",
    cell: (info) => (
      <span className="font-medium">{info.getValue() as string}</span>
    ),
  }) as ColumnDef<AuditLogEntry, unknown>,
  columnHelper.accessor("targetEntityId", {
    header: "Target",
    cell: (info) => {
      const value = info.getValue() as string | null;
      return (
        <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
          {value || "-"}
        </span>
      );
    },
  }) as ColumnDef<AuditLogEntry, unknown>,
  columnHelper.accessor("metadata", {
    header: "Detail",
    cell: (info) => (
      <span className="text-sm text-muted-foreground truncate max-w-[250px] block">
        {formatMetadata(info.getValue() as Record<string, unknown> | null)}
      </span>
    ),
  }) as ColumnDef<AuditLogEntry, unknown>,
];

// ─── Main Component ─────────────────────────────────────────────────────────

export default function AuditLogPage() {
  const { user, isLoading: authLoading } = useAuth();

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);

  // Build query params for TanStack Query
  const queryParams: Record<string, string | number> = { page, pageSize: 20 };
  if (searchQuery.trim()) queryParams.search = searchQuery.trim();
  if (eventTypeFilter !== "all") queryParams.eventType = eventTypeFilter;
  if (startDate) queryParams.startDate = new Date(startDate).toISOString();
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    queryParams.endDate = end.toISOString();
  }

  const { data: queryResult, isLoading, isError } = useAuditLogs(
    authLoading || !user ? undefined : queryParams
  );

  const logs: AuditLogEntry[] = (queryResult?.data ?? []) as AuditLogEntry[];
  const pagination: PaginationInfo = queryResult?.pagination ?? {
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 0,
  };

  // ─── TanStack Table ─────────────────────────────────────────────────────────

  const table = useReactTable({
    data: logs,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount: pagination.totalPages,
  });

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handlePrevPage = () => {
    if (pagination.page > 1) setPage((p) => p - 1);
  };

  const handleNextPage = () => {
    if (pagination.page < pagination.totalPages) setPage((p) => p + 1);
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setEventTypeFilter("all");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    eventTypeFilter !== "all" ||
    startDate !== "" ||
    endDate !== "";

  // ─── Loading State ──────────────────────────────────────────────────────────

  if (authLoading || (isLoading && !queryResult)) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-muted-foreground">
            Riwayat aktivitas sistem
          </p>
        </div>
        <LoadingSkeleton variant="table" />
      </div>
    );
  }

  // ─── Error State ────────────────────────────────────────────────────────────

  if (isError) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <p className="text-destructive">Gagal memuat data audit log</p>
        </div>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground">
          Riwayat aktivitas sistem
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4">
        {/* Search Row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <form onSubmit={handleSearch} className="flex flex-1 gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari aktor atau target..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm">
              Cari
            </Button>
          </form>

          <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Semua Event" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Event</SelectItem>
              {EVENT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {EVENT_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Range Row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <label htmlFor="startDate" className="text-sm text-muted-foreground whitespace-nowrap">
              Dari:
            </label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-[160px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="endDate" className="text-sm text-muted-foreground whitespace-nowrap">
              Sampai:
            </label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-[160px]"
            />
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-muted-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Reset Filter
            </Button>
          )}
        </div>
      </div>

      {/* Audit Log Table */}
      {logs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Tidak Ada Data"
          description="Tidak ada audit log yang ditemukan dengan filter yang dipilih."
        />
      ) : (
        <>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Menampilkan{" "}
              {(pagination.page - 1) * pagination.pageSize + 1} -{" "}
              {Math.min(
                pagination.page * pagination.pageSize,
                pagination.totalItems
              )}{" "}
              dari {pagination.totalItems} log
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0"
                onClick={handlePrevPage}
                disabled={pagination.page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                {pagination.page} / {pagination.totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0"
                onClick={handleNextPage}
                disabled={pagination.page >= pagination.totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
