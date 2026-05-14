"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  type ColumnDef,
  type PaginationState,
  flexRender,
} from "@tanstack/react-table";
import { Ticket, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { ticketApi, type PaginatedResult } from "@/lib/api";
import { StatusBadge } from "@/components/tickets/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

interface TicketRow {
  id: string;
  nomorTiket: string;
  judul: string;
  status: string;
  tanggalBuat: string;
  kategori?: string;
  lokasi?: string;
  creator?: { nama: string };
  padal?: { nama: string } | null;
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

// ─── Column Definitions ─────────────────────────────────────────────────────

function getColumns(onViewDetail: (id: string) => void): ColumnDef<TicketRow>[] {
  return [
    {
      accessorKey: "nomorTiket",
      header: "No. Tiket",
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.nomorTiket}</span>
      ),
    },
    {
      accessorKey: "judul",
      header: "Judul",
      cell: ({ row }) => (
        <span className="max-w-[200px] truncate block">
          {row.original.judul}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "tanggalBuat",
      header: "Tanggal Buat",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatDate(row.original.tanggalBuat)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Aksi",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetail(row.original.id);
          }}
        >
          <Eye className="mr-1 h-4 w-4" />
          Detail
        </Button>
      ),
    },
  ];
}

// ─── Status Filter Options ──────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "ALL", label: "Semua Status" },
  { value: "PENDING", label: "Pending" },
  { value: "PROSES", label: "Proses" },
  { value: "SELESAI", label: "Selesai" },
  { value: "DIBATALKAN", label: "Dibatalkan" },
];

// ─── Main Component ─────────────────────────────────────────────────────────

export default function TicketListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();

  // State
  const [data, setData] = useState<TicketRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>(
    searchParams.get("status") || "ALL"
  );

  // Pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  // Check for unrated query param (from UnratedTicketsBanner)
  const unratedFilter = searchParams.get("unrated") === "true";

  // Fetch tickets
  useEffect(() => {
    async function fetchTickets() {
      try {
        setIsLoading(true);
        setError(null);

        const params: Record<string, string | number> = {
          page: pagination.pageIndex + 1,
          pageSize: pagination.pageSize,
        };

        if (statusFilter && statusFilter !== "ALL") {
          params.status = statusFilter;
        }

        if (unratedFilter) {
          params.unrated = "true";
        }

        const response = await ticketApi.list(params);
        const resData = response.data;

        // Handle response format: { status, data: [...], pagination: { totalItems } }
        const tickets = Array.isArray(resData.data) ? resData.data : [];
        const total = resData.pagination?.totalItems ?? tickets.length;

        setData(tickets);
        setTotalRows(total);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Gagal memuat daftar tiket";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }

    if (!authLoading && user) {
      fetchTickets();
    }
  }, [pagination.pageIndex, pagination.pageSize, statusFilter, unratedFilter, authLoading, user]);

  // Navigate to ticket detail
  const handleViewDetail = (id: string) => {
    router.push(`/dashboard/tickets/${id}`);
  };

  // Column definitions
  const columns = useMemo(() => getColumns(handleViewDetail), []);

  // Total pages calculation
  const pageCount = Math.ceil(totalRows / pagination.pageSize);

  // TanStack Table instance
  const table = useReactTable({
    data,
    columns,
    pageCount,
    state: {
      pagination,
    },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  // ─── Loading State ──────────────────────────────────────────────────────────

  if (authLoading || (isLoading && data.length === 0)) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daftar Tiket</h1>
          <p className="text-muted-foreground">
            Kelola dan pantau tiket bantuan IT
          </p>
        </div>
        <LoadingSkeleton variant="table" />
      </div>
    );
  }

  // ─── Error State ────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daftar Tiket</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Daftar Tiket</h1>
        <p className="text-muted-foreground">
          {unratedFilter
            ? "Tiket selesai yang belum diberi rating"
            : "Kelola dan pantau tiket bantuan IT"}
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value);
            setPagination((prev) => ({ ...prev, pageIndex: 0 }));
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={String(pagination.pageSize)}
          onValueChange={(value) => {
            setPagination({ pageIndex: 0, pageSize: Number(value) });
          }}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 / halaman</SelectItem>
            <SelectItem value="25">25 / halaman</SelectItem>
            <SelectItem value="50">50 / halaman</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {data.length === 0 && !isLoading ? (
            <EmptyState
              icon={Ticket}
              title="Tidak Ada Tiket"
              description={
                unratedFilter
                  ? "Tidak ada tiket selesai yang belum diberi rating."
                  : "Belum ada tiket yang tersedia."
              }
            />
          ) : (
            <div className="overflow-x-auto">
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
                    <TableRow
                      key={row.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleViewDetail(row.original.id)}
                      tabIndex={0}
                      role="link"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleViewDetail(row.original.id);
                        }
                      }}
                    >
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
          )}
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {data.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Menampilkan {pagination.pageIndex * pagination.pageSize + 1} -{" "}
            {Math.min(
              (pagination.pageIndex + 1) * pagination.pageSize,
              totalRows
            )}{" "}
            dari {totalRows} tiket
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Sebelumnya
            </Button>
            <span className="text-sm text-muted-foreground">
              Halaman {pagination.pageIndex + 1} dari {pageCount || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Selanjutnya
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
