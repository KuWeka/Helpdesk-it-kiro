"use client";

import React, { useMemo, useState } from "react";
import { Users, Search, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { useAuth } from "@/providers/AuthProvider";
import { useChangeRole, useSoftDelete, useStaffUsers } from "@/hooks/useStaff";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { ActiveTicketWarningModal } from "@/components/staff/ActiveTicketWarningModal";
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
import { useToast } from "@/components/ui/use-toast";

// ─── Types ──────────────────────────────────────────────────────────────────

type Role = "SATKER" | "BIDTEKKOM" | "PADAL" | "TEKNISI";

interface StaffUser {
  id: string;
  nama: string;
  email: string;
  nomorWhatsApp: string;
  role: Role;
  divisi: string | null;
  deletedAt: string | null;
  createdAt: string;
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

const VALID_ROLES: Role[] = ["SATKER", "BIDTEKKOM", "PADAL", "TEKNISI"];

const ROLE_LABELS: Record<Role, string> = {
  SATKER: "Satker",
  BIDTEKKOM: "Bidtekkom",
  PADAL: "Padal",
  TEKNISI: "Teknisi",
};

const ROLE_BADGE_COLORS: Record<Role, string> = {
  SATKER: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  BIDTEKKOM: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  PADAL: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  TEKNISI: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

// ─── Main Component ─────────────────────────────────────────────────────────

export default function StaffManagementPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  // Filter + pagination state
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Role change confirmation state
  const [roleChangeModal, setRoleChangeModal] = useState<{
    open: boolean;
    userId: string;
    userName: string;
    currentRole: Role;
    newRole: Role;
  }>({
    open: false,
    userId: "",
    userName: "",
    currentRole: "SATKER",
    newRole: "SATKER",
  });

  // Delete confirmation state
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    open: boolean;
    userId: string;
    userName: string;
  }>({
    open: false,
    userId: "",
    userName: "",
  });

  // Active ticket warning modal state
  const [activeTicketWarning, setActiveTicketWarning] = useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
    activeTicketCount: number;
  }>({
    isOpen: false,
    userId: "",
    userName: "",
    activeTicketCount: 0,
  });

  const queryParams = useMemo(() => {
    const params: Record<string, string | number> = {
      page: currentPage,
      pageSize: 20,
    };

    if (appliedSearch.trim()) params.search = appliedSearch.trim();
    if (roleFilter !== "all") params.role = roleFilter;
    if (statusFilter !== "all") params.status = statusFilter;

    return params;
  }, [appliedSearch, currentPage, roleFilter, statusFilter]);

  const {
    data: staffResult,
    isLoading,
    error,
    refetch,
  } = useStaffUsers(queryParams, {
    enabled: !authLoading && !!user,
    staleTime: 30_000,
  });

  const users = (staffResult?.data as StaffUser[] | undefined) ?? [];
  const pagination: PaginationInfo =
    (staffResult?.pagination as PaginationInfo | undefined) ?? {
      page: currentPage,
      pageSize: 20,
      totalItems: 0,
      totalPages: 0,
    };

  const changeRoleMutation = useChangeRole();
  const softDeleteMutation = useSoftDelete();

  // ─── Role Change Handlers ───────────────────────────────────────────────────

  const handleRoleSelect = (
    userId: string,
    userName: string,
    currentRole: Role,
    newRole: string
  ) => {
    if (newRole === currentRole) return;

    setRoleChangeModal({
      open: true,
      userId,
      userName,
      currentRole,
      newRole: newRole as Role,
    });
  };

  const handleConfirmRoleChange = async () => {
    try {
      await changeRoleMutation.mutateAsync({
        userId: roleChangeModal.userId,
        role: roleChangeModal.newRole,
      });

      toast({
        title: "Berhasil",
        description: `Role ${roleChangeModal.userName} berhasil diubah dari ${ROLE_LABELS[roleChangeModal.currentRole]} menjadi ${ROLE_LABELS[roleChangeModal.newRole]}.`,
      });

      setRoleChangeModal((prev) => ({ ...prev, open: false }));
      refetch();
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { message?: string } };
      };
      toast({
        title: "Gagal",
        description:
          axiosError.response?.data?.message || "Gagal mengubah role user.",
        variant: "destructive",
      });
    }
  };

  // ─── Delete Handlers ──────────────────────────────────────────────────────

  const handleDeleteClick = (userId: string, userName: string) => {
    setDeleteConfirmModal({ open: true, userId, userName });
  };

  const handleConfirmDelete = async () => {
    try {
      await softDeleteMutation.mutateAsync({ userId: deleteConfirmModal.userId });

      toast({
        title: "Berhasil",
        description: `Akun ${deleteConfirmModal.userName} berhasil dinonaktifkan.`,
      });

      setDeleteConfirmModal((prev) => ({ ...prev, open: false }));
      refetch();
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { code?: string; message?: string; details?: { activeTicketCount?: number } } };
      };

      if (axiosError.response?.data?.code === "HAS_ACTIVE_TICKETS") {
        const activeTicketCount =
          axiosError.response.data.details?.activeTicketCount || 0;

        setDeleteConfirmModal((prev) => ({ ...prev, open: false }));
        setActiveTicketWarning({
          isOpen: true,
          userId: deleteConfirmModal.userId,
          userName: deleteConfirmModal.userName,
          activeTicketCount,
        });
      } else {
        toast({
          title: "Gagal",
          description:
            axiosError.response?.data?.message ||
            "Gagal menonaktifkan akun user.",
          variant: "destructive",
        });
      }
    }
  };

  const handleForceDelete = async () => {
    try {
      await softDeleteMutation.mutateAsync({
        userId: activeTicketWarning.userId,
        forceDelete: true,
      });

      toast({
        title: "Berhasil",
        description: `Akun ${activeTicketWarning.userName} berhasil dinonaktifkan.`,
      });

      setActiveTicketWarning((prev) => ({ ...prev, isOpen: false }));
      refetch();
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { message?: string } };
      };
      toast({
        title: "Gagal",
        description:
          axiosError.response?.data?.message ||
          "Gagal menonaktifkan akun user.",
        variant: "destructive",
      });
    }
  };

  // ─── Pagination Handlers ────────────────────────────────────────────────────

  const handlePrevPage = () => {
    if (pagination.page > 1) {
      setCurrentPage((prev) => Math.max(1, prev - 1));
    }
  };

  const handleNextPage = () => {
    if (pagination.page < pagination.totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  // ─── Search Handler ─────────────────────────────────────────────────────────

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    setAppliedSearch(searchQuery);
  };

  // ─── Column Definitions ─────────────────────────────────────────────────────

  const columns: ColumnDef<StaffUser>[] = useMemo(
    () => [
      {
        accessorKey: "nama",
        header: "Nama",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.nama}</span>
        ),
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => row.original.email,
      },
      {
        accessorKey: "nomorWhatsApp",
        header: "No. WhatsApp",
        cell: ({ row }) => row.original.nomorWhatsApp,
      },
      {
        accessorKey: "divisi",
        header: "Divisi",
        cell: ({ row }) => row.original.divisi || "-",
      },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => {
          const staffUser = row.original;
          if (staffUser.id === user?.userId) {
            return (
              <Badge
                className={`${ROLE_BADGE_COLORS[staffUser.role]} border-0`}
              >
                {ROLE_LABELS[staffUser.role]}
              </Badge>
            );
          }
          return (
            <Select
              value={staffUser.role}
              onValueChange={(newRole) =>
                handleRoleSelect(
                  staffUser.id,
                  staffUser.nama,
                  staffUser.role,
                  newRole
                )
              }
              disabled={!!staffUser.deletedAt}
            >
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VALID_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        },
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const staffUser = row.original;
          return (
            <Badge
              variant={staffUser.deletedAt ? "destructive" : "secondary"}
              className={
                !staffUser.deletedAt
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-0"
                  : ""
              }
            >
              {staffUser.deletedAt ? "Nonaktif" : "Aktif"}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: () => <span className="text-right block">Aksi</span>,
        cell: ({ row }) => {
          const staffUser = row.original;
          return (
            <div className="text-right">
              {staffUser.id !== user?.userId && !staffUser.deletedAt && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 lg:h-8 lg:w-8 min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0"
                  onClick={() =>
                    handleDeleteClick(staffUser.id, staffUser.nama)
                  }
                  title="Nonaktifkan akun"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [user?.userId]
  );

  // ─── TanStack Table Instance ────────────────────────────────────────────────

  const table = useReactTable({
    data: users,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: pagination.totalPages,
  });

  // ─── Loading State ──────────────────────────────────────────────────────────

  if (authLoading || (isLoading && users.length === 0)) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manajemen Staff</h1>
          <p className="text-muted-foreground">
            Kelola pengguna dan role dalam sistem
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
        ?.message || "Gagal memuat data staff";

    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manajemen Staff</h1>
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
        <h1 className="text-2xl font-bold tracking-tight">Manajemen Staff</h1>
        <p className="text-muted-foreground">
          Kelola pengguna dan role dalam sistem
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari nama atau email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Cari
          </Button>
        </form>

        <div className="flex gap-2">
          <Select
            value={roleFilter}
            onValueChange={(value) => {
              setCurrentPage(1);
              setRoleFilter(value);
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Semua Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Role</SelectItem>
              {VALID_ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {ROLE_LABELS[role]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setCurrentPage(1);
              setStatusFilter(value);
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="active">Aktif</SelectItem>
              <SelectItem value="inactive">Nonaktif</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Staff Table */}
      {users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Tidak Ada Data"
          description="Tidak ada pengguna yang ditemukan dengan filter yang dipilih."
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
              Menampilkan {(pagination.page - 1) * pagination.pageSize + 1} -{" "}
              {Math.min(pagination.page * pagination.pageSize, pagination.totalItems)}{" "}
              dari {pagination.totalItems} pengguna
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

      {/* Role Change Confirmation Modal */}
      <ConfirmModal
        open={roleChangeModal.open}
        onOpenChange={(open) =>
          setRoleChangeModal((prev) => ({ ...prev, open }))
        }
        title="Konfirmasi Perubahan Role"
        description={
          <span>
            Apakah Anda yakin ingin mengubah role{" "}
            <span className="font-semibold">{roleChangeModal.userName}</span>{" "}
            dari{" "}
            <span className="font-semibold">
              {ROLE_LABELS[roleChangeModal.currentRole]}
            </span>{" "}
            menjadi{" "}
            <span className="font-semibold">
              {ROLE_LABELS[roleChangeModal.newRole]}
            </span>
            ? Perubahan ini akan mempengaruhi akses pengguna dalam sistem.
          </span>
        }
        confirmLabel="Ya, Ubah Role"
        onConfirm={handleConfirmRoleChange}
        isLoading={changeRoleMutation.isPending}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={deleteConfirmModal.open}
        onOpenChange={(open) =>
          setDeleteConfirmModal((prev) => ({ ...prev, open }))
        }
        title="Konfirmasi Nonaktifkan Akun"
        description={
          <span>
            Apakah Anda yakin ingin menonaktifkan akun{" "}
            <span className="font-semibold">
              {deleteConfirmModal.userName}
            </span>
            ? Akun yang dinonaktifkan tidak dapat login ke sistem.
          </span>
        }
        confirmLabel="Ya, Nonaktifkan"
        onConfirm={handleConfirmDelete}
        isLoading={softDeleteMutation.isPending}
        variant="destructive"
      />

      {/* Active Ticket Warning Modal */}
      <ActiveTicketWarningModal
        isOpen={activeTicketWarning.isOpen}
        onClose={() =>
          setActiveTicketWarning((prev) => ({ ...prev, isOpen: false }))
        }
        onConfirm={handleForceDelete}
        activeTicketCount={activeTicketWarning.activeTicketCount}
        userName={activeTicketWarning.userName}
      />
    </div>
  );
}
