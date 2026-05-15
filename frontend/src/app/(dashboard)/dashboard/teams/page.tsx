"use client";

import React, { useState } from "react";
import { Users, UserPlus, UserMinus, Phone } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import {
  useAddTeknisiToTeam,
  useAvailableTeknisi,
  useRemoveTeknisiFromTeam,
  useTeams,
} from "@/hooks/useStaff";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { useToast } from "@/components/ui/use-toast";

// ─── Types ──────────────────────────────────────────────────────────────────

interface TeknisiMember {
  id: string;
  nama: string;
  email: string;
  nomorWhatsApp: string;
}

interface PadalTeam {
  id: string;
  nama: string;
  email: string;
  teamMembers: TeknisiMember[];
}

interface AvailableTeknisi {
  id: string;
  nama: string;
  email: string;
  nomorWhatsApp: string;
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function TeamManagementPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  // Add Teknisi state (per Padal)
  const [selectedTeknisi, setSelectedTeknisi] = useState<Record<string, string>>({});

  // Remove confirmation dialog state
  const [removeDialog, setRemoveDialog] = useState<{
    open: boolean;
    padalId: string;
    teknisiId: string;
    teknisiNama: string;
    padalNama: string;
  }>({
    open: false,
    padalId: "",
    teknisiId: "",
    teknisiNama: "",
    padalNama: "",
  });

  const teamsQuery = useTeams({
    enabled: !authLoading && !!user,
    staleTime: 30_000,
  });

  const availableTeknisiQuery = useAvailableTeknisi({
    enabled: !authLoading && !!user,
    staleTime: 30_000,
  });

  const addTeknisiMutation = useAddTeknisiToTeam();
  const removeTeknisiMutation = useRemoveTeknisiFromTeam();

  const teams = (teamsQuery.data as PadalTeam[] | undefined) ?? [];
  const availableTeknisi =
    (availableTeknisiQuery.data as AvailableTeknisi[] | undefined) ?? [];

  // ─── Add Teknisi Handler ────────────────────────────────────────────────────

  const handleAddTeknisi = async (padalId: string) => {
    const teknisiId = selectedTeknisi[padalId];
    if (!teknisiId) return;

    try {
      await addTeknisiMutation.mutateAsync({ padalId, teknisiId });
      toast({
        title: "Berhasil",
        description: "Teknisi berhasil ditambahkan ke tim.",
      });
      setSelectedTeknisi((prev) => ({ ...prev, [padalId]: "" }));
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { status?: number; data?: { message?: string } };
      };
      if (axiosError.response?.status === 409) {
        toast({
          title: "Konflik",
          description:
            axiosError.response.data?.message ||
            "Teknisi sudah tergabung dalam tim lain.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Gagal",
          description:
            axiosError.response?.data?.message ||
            "Gagal menambahkan Teknisi ke tim.",
          variant: "destructive",
        });
      }
    }
  };

  // ─── Remove Teknisi Handler ─────────────────────────────────────────────────

  const openRemoveDialog = (
    padalId: string,
    teknisiId: string,
    teknisiNama: string,
    padalNama: string
  ) => {
    setRemoveDialog({
      open: true,
      padalId,
      teknisiId,
      teknisiNama,
      padalNama,
    });
  };

  const handleRemoveTeknisi = async () => {
    try {
      await removeTeknisiMutation.mutateAsync({
        padalId: removeDialog.padalId,
        teknisiId: removeDialog.teknisiId,
      });
      toast({
        title: "Berhasil",
        description: `${removeDialog.teknisiNama} berhasil dilepas dari tim.`,
      });
      setRemoveDialog((prev) => ({ ...prev, open: false }));
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      toast({
        title: "Gagal",
        description:
          axiosError.response?.data?.message ||
          "Gagal melepas Teknisi dari tim.",
        variant: "destructive",
      });
    }
  };

  // ─── Loading State ──────────────────────────────────────────────────────────

  if (
    authLoading ||
    (teamsQuery.isLoading && teams.length === 0) ||
    availableTeknisiQuery.isLoading
  ) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manajemen Tim</h1>
          <p className="text-muted-foreground">
            Kelola komposisi tim Padal dan Teknisi
          </p>
        </div>
        <LoadingSkeleton variant="card" />
        <LoadingSkeleton variant="list" />
      </div>
    );
  }

  // ─── Error State ────────────────────────────────────────────────────────────

  if (teamsQuery.error || availableTeknisiQuery.error) {
    const teamsErrorMessage =
      (teamsQuery.error as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
    const teknisiErrorMessage =
      (availableTeknisiQuery.error as {
        response?: { data?: { message?: string } };
      })?.response?.data?.message;

    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manajemen Tim</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <p className="text-destructive">
            {teamsErrorMessage || teknisiErrorMessage || "Gagal memuat data tim"}
          </p>
        </div>
      </div>
    );
  }

  // ─── Empty State ────────────────────────────────────────────────────────────

  if (teams.length === 0) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manajemen Tim</h1>
          <p className="text-muted-foreground">
            Kelola komposisi tim Padal dan Teknisi
          </p>
        </div>
        <EmptyState
          icon={Users}
          title="Belum Ada Tim"
          description="Belum ada Padal yang terdaftar. Tambahkan user dengan role Padal terlebih dahulu."
        />
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Manajemen Tim</h1>
        <p className="text-muted-foreground">
          Kelola komposisi tim Padal dan Teknisi
        </p>
      </div>

      {/* Team Cards */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {teams.map((padal) => (
          <Card key={padal.id}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-primary" />
                {padal.nama}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{padal.email}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Team Members List */}
              {padal.teamMembers.length === 0 ? (
                <div className="rounded-md border border-dashed p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Belum ada Teknisi dalam tim ini.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {padal.teamMembers.map((teknisi) => (
                    <div
                      key={teknisi.id}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {teknisi.nama}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          <span>{teknisi.nomorWhatsApp}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0 min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0"
                        onClick={() =>
                          openRemoveDialog(
                            padal.id,
                            teknisi.id,
                            teknisi.nama,
                            padal.nama
                          )
                        }
                      >
                        <UserMinus className="h-4 w-4 mr-1" />
                        Lepas
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Teknisi Section */}
              <div className="flex items-center gap-2 pt-2 border-t">
                <Select
                  value={selectedTeknisi[padal.id] || ""}
                  onValueChange={(value) =>
                    setSelectedTeknisi((prev) => ({
                      ...prev,
                      [padal.id]: value,
                    }))
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Pilih Teknisi..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTeknisi.length === 0 ? (
                      <SelectItem value="__none" disabled>
                        Tidak ada Teknisi tersedia
                      </SelectItem>
                    ) : (
                      availableTeknisi.map((teknisi) => (
                        <SelectItem key={teknisi.id} value={teknisi.id}>
                          {teknisi.nama}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0"
                  disabled={
                    !selectedTeknisi[padal.id] ||
                    addTeknisiMutation.isPending
                  }
                  onClick={() => handleAddTeknisi(padal.id)}
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  {addTeknisiMutation.isPending ? "Menambahkan..." : "Tambah"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Remove Confirmation Dialog */}
      <ConfirmModal
        open={removeDialog.open}
        onOpenChange={(open) =>
          setRemoveDialog((prev) => ({ ...prev, open }))
        }
        title="Lepas Teknisi dari Tim"
        description={
          <span>
            Apakah Anda yakin ingin melepas{" "}
            <span className="font-semibold">{removeDialog.teknisiNama}</span>{" "}
            dari tim{" "}
            <span className="font-semibold">{removeDialog.padalNama}</span>?
            Teknisi ini tidak akan bisa melihat tiket tim setelah dilepas.
          </span>
        }
        confirmLabel="Ya, Lepas"
        cancelLabel="Batal"
        onConfirm={handleRemoveTeknisi}
        isLoading={removeTeknisiMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
