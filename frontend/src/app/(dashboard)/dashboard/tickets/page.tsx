"use client";

import React, { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  type ColumnDef,
  type PaginationState,
  flexRender,
} from "@tanstack/react-table";
import { Ticket, Eye, ChevronLeft, ChevronRight, XCircle, UserPlus, CheckCircle2, Search } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { formatDate } from "@/lib/formatters";
import { useCompleteTicket, useTickets } from "@/hooks/useTickets";
import { useDebounce } from "@/hooks/useDebounce";
import { StatusBadge } from "@/components/tickets/StatusBadge";
import { CancelTicketModal } from "@/components/tickets/CancelTicketModal";
import { QuickAssignModal } from "@/components/dashboard/QuickAssignModal";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { useToast } from "@/components/ui/use-toast";

// ─── Types ──────────────────────────────────────────────────────────────────

interface TicketRow {
  id: string;
  nomorTiket: string;
  judul: string;
  status: string;
  tanggalBuat: string;
  tanggalAssign?: string;
  kategori?: string;
  lokasi?: string;
  divisiSatker?: string;
  creator?: { nama: string };
  creatorId?: string;
  padal?: { nama: string; id?: string } | null;
  padalId?: string | null;
}


// ─── Status Filter Options ──────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "ALL", label: "Semua Status" },
  { value: "PENDING", label: "Pending" },
  { value: "PROSES", label: "Proses" },
  { value: "SELESAI", label: "Selesai" },
  { value: "DIBATALKAN", label: "Dibatalkan" },
  { value: "DITOLAK", label: "Ditolak" },
];

// ─── Main Component ─────────────────────────────────────────────────────────

export default function TicketListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  // State
  const [statusFilter, setStatusFilter] = useState<string>(
    searchParams.get("status") || "ALL"
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  // Check for unrated query param (from UnratedTicketsBanner)
  const unratedFilter = searchParams.get("unrated") === "true";

  // Cancel modal state
  const [cancelModal, setCancelModal] = useState<{
    open: boolean;
    ticketId: string;
    ticketNumber: string;
  }>({ open: false, ticketId: "", ticketNumber: "" });

  // Assign modal state
  const [assignModal, setAssignModal] = useState<{
    open: boolean;
    ticketId: string;
    ticketNumber: string;
  }>({ open: false, ticketId: "", ticketNumber: "" });

  // Complete (Selesai) modal state
  const [completeModal, setCompleteModal] = useState<{
    open: boolean;
    ticketId: string;
    ticketNumber: string;
  }>({ open: false, ticketId: "", ticketNumber: "" });
  const ticketsQueryParams = useMemo(() => {
    const params: Record<string, string | number> = {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
    };

    if (statusFilter && statusFilter !== "ALL") {
      params.status = statusFilter;
    }

    if (debouncedSearch.trim()) {
      params.search = debouncedSearch.trim();
    }

    if (unratedFilter) {
      params.unrated = "true";
    }

    if (startDate) {
      params.startDate = startDate;
    }

    if (endDate) {
      params.endDate = endDate;
    }

    return params;
  }, [
    endDate,
    pagination.pageIndex,
    pagination.pageSize,
    debouncedSearch,
    startDate,
    statusFilter,
    unratedFilter,
  ]);

  const {
    data: ticketsResult,
    isLoading,
    error,
    refetch,
  } = useTickets(ticketsQueryParams, {
    enabled: !authLoading && !!user,
    staleTime: 30_000,
  });

  const completeTicketMutation = useCompleteTicket();
  const data = ticketsResult?.data ?? [];
  const totalRows = ticketsResult?.pagination?.totalItems ?? data.length;

  // Navigate to ticket detail
  const handleViewDetail = (id: string) => {
    router.push(`/dashboard/tickets/${id}`);
  };

  // ─── Action Handlers ────────────────────────────────────────────────────────

  const handleCancelClick = (ticket: TicketRow) => {
    setCancelModal({ open: true, ticketId: ticket.id, ticketNumber: ticket.nomorTiket });
  };

  const handleAssignClick = (ticket: TicketRow) => {
    setAssignModal({ open: true, ticketId: ticket.id, ticketNumber: ticket.nomorTiket });
  };

  const handleCompleteClick = (ticket: TicketRow) => {
    setCompleteModal({ open: true, ticketId: ticket.id, ticketNumber: ticket.nomorTiket });
  };

  const handleConfirmComplete = async () => {
    try {
      await completeTicketMutation.mutateAsync(completeModal.ticketId);
      toast({
        title: "Berhasil",
        description: `Tiket ${completeModal.ticketNumber} berhasil diselesaikan.`,
      });
      setCompleteModal({ open: false, ticketId: "", ticketNumber: "" });
      refetch();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Gagal menyelesaikan tiket.";
      toast({
        title: "Gagal",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleCancelled = () => {
    refetch();
  };

  const handleAssigned = () => {
    refetch();
  };

  // ─── Column Definitions (Role-Specific) ──────────────────────────────────

  const columns: ColumnDef<TicketRow>[] = useMemo(() => {
    const role = user?.role;

    const baseColumns: ColumnDef<TicketRow>[] = [
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
    ];

    // Role-specific columns inserted after judul
    const roleColumns: ColumnDef<TicketRow>[] = [];

    if (role === "BIDTEKKOM") {
      // Req 26.2: namaSatker (from creator.nama) and divisiSatker
      roleColumns.push(
        {
          id: "namaSatker",
          header: "Nama Satker",
          cell: ({ row }) => (
            <span>{row.original.creator?.nama || "-"}</span>
          ),
        },
        {
          accessorKey: "divisiSatker",
          header: "Divisi Satker",
          cell: ({ row }) => (
            <span>{row.original.divisiSatker || "-"}</span>
          ),
        }
      );
    }

    if (role === "PADAL") {
      // Req 26.3: namaSatker, lokasi
      roleColumns.push(
        {
          id: "namaSatker",
          header: "Nama Satker",
          cell: ({ row }) => (
            <span>{row.original.creator?.nama || "-"}</span>
          ),
        },
        {
          accessorKey: "lokasi",
          header: "Lokasi",
          cell: ({ row }) => (
            <span>{row.original.lokasi || "-"}</span>
          ),
        }
      );
    }

    if (role === "TEKNISI") {
      // Req 26.4: namaSatker, lokasi
      roleColumns.push(
        {
          id: "namaSatker",
          header: "Nama Satker",
          cell: ({ row }) => (
            <span>{row.original.creator?.nama || "-"}</span>
          ),
        },
        {
          accessorKey: "lokasi",
          header: "Lokasi",
          cell: ({ row }) => (
            <span>{row.original.lokasi || "-"}</span>
          ),
        }
      );
    }

    if (role === "SATKER") {
      // Req 26.1: kategori
      roleColumns.push({
        accessorKey: "kategori",
        header: "Kategori",
        cell: ({ row }) => (
          <span>{row.original.kategori || "-"}</span>
        ),
      });
    }

    // Status column
    const statusColumn: ColumnDef<TicketRow> = {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    };

    // Date column: Padal and Teknisi use tanggalAssign, others use tanggalBuat
    const dateColumn: ColumnDef<TicketRow> =
      role === "PADAL" || role === "TEKNISI"
        ? {
            id: "tanggalAssign",
            header: "Tanggal Assign",
            cell: ({ row }) => (
              <span className="text-muted-foreground">
                {row.original.tanggalAssign
                  ? formatDate(row.original.tanggalAssign)
                  : "-"}
              </span>
            ),
          }
        : {
            accessorKey: "tanggalBuat",
            header: "Tanggal Buat",
            cell: ({ row }) => (
              <span className="text-muted-foreground">
                {formatDate(row.original.tanggalBuat)}
              </span>
            ),
          };

    // Actions column
    const actionsColumn: ColumnDef<TicketRow> = {
      id: "actions",
      header: "Aksi",
      cell: ({ row }) => {
        const ticket = row.original;
        const userRole = user?.role;
        const userId = user?.userId;

        const canCancel =
          userRole === "SATKER" &&
          (ticket.status === "PENDING" || ticket.status === "PROSES") &&
          (ticket.creatorId === userId || ticket.creator?.nama === user?.nama);

        const canAssign =
          userRole === "BIDTEKKOM" && ticket.status === "PENDING";

        const canComplete =
          userRole === "PADAL" &&
          ticket.status === "PROSES" &&
          (ticket.padalId === userId || ticket.padal?.id === userId);

        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0"
              onClick={(e) => {
                e.stopPropagation();
                handleViewDetail(ticket.id);
              }}
              title="Lihat Detail"
            >
              <Eye className="h-4 w-4" />
            </Button>

            {canCancel && (
              <Button
                variant="ghost"
                size="sm"
                className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancelClick(ticket);
                }}
                title="Batalkan Tiket"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            )}

            {canAssign && (
              <Button
                variant="ghost"
                size="sm"
                className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:text-purple-300 dark:hover:bg-purple-900/20"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAssignClick(ticket);
                }}
                title="Assign Tiket"
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            )}

            {canComplete && (
              <Button
                variant="ghost"
                size="sm"
                className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/20"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCompleteClick(ticket);
                }}
                title="Selesaikan Tiket"
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      },
    };

    return [
      ...baseColumns,
      ...roleColumns,
      statusColumn,
      dateColumn,
      actionsColumn,
    ];
  }, [user?.role, user?.userId, user?.nama]);

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
    const errorMessage =
      (error as { response?: { data?: { message?: string } } })?.response?.data
        ?.message || "Gagal memuat daftar tiket";

    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daftar Tiket</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <p className="text-destructive">{errorMessage}</p>
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
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nomor tiket atau judul..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <Input 
            type="date" 
            value={startDate} 
            onChange={(e) => {
              setStartDate(e.target.value);
              setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }}
            className="w-[140px] text-sm"
          />
          <span className="text-sm text-muted-foreground">-</span>
          <Input 
            type="date" 
            value={endDate} 
            onChange={(e) => {
              setEndDate(e.target.value);
              setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }}
            className="w-[140px] text-sm"
          />
        </div>

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

      {/* Cancel Ticket Modal */}
      <CancelTicketModal
        open={cancelModal.open}
        onClose={() => setCancelModal({ open: false, ticketId: "", ticketNumber: "" })}
        ticketId={cancelModal.ticketId}
        ticketNumber={cancelModal.ticketNumber}
        userRole={user?.role}
        onCancelled={handleCancelled}
      />

      {/* Quick Assign Modal */}
      {assignModal.open && (
        <QuickAssignModal
          open={assignModal.open}
          onClose={() => setAssignModal({ open: false, ticketId: "", ticketNumber: "" })}
          ticketId={assignModal.ticketId}
          ticketNumber={assignModal.ticketNumber}
          onAssigned={handleAssigned}
        />
      )}

      {/* Complete Confirmation Modal */}
      <ConfirmModal
        open={completeModal.open}
        onOpenChange={(open) => {
          if (!open) setCompleteModal({ open: false, ticketId: "", ticketNumber: "" });
        }}
        title="Konfirmasi Selesai"
        description={
          <span>
            Apakah Anda yakin ingin menandai tiket{" "}
            <span className="font-semibold">{completeModal.ticketNumber}</span>{" "}
            sebagai selesai? Tindakan ini tidak dapat dibatalkan.
          </span>
        }
        confirmLabel="Ya, Selesaikan"
        onConfirm={handleConfirmComplete}
        isLoading={completeTicketMutation.isPending}
      />
    </div>
  );
}
