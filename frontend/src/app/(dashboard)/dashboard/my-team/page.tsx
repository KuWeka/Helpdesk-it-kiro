"use client";

import React from "react";
import { UsersRound, Phone, Info } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useTeams } from "@/hooks/useStaff";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

// ─── Types ──────────────────────────────────────────────────────────────────

interface TeamMember {
  id: string;
  nama: string;
  nomorWhatsApp: string;
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function MyTeamPage() {
  const { user, isLoading: authLoading } = useAuth();

  const {
    data: teamMembers = [],
    isLoading,
    isError,
    error,
  } = useTeams({
    mode: "mine",
    enabled: !authLoading && !!user,
    staleTime: 30_000,
  });

  const errorMessage = isError
    ? ((error as { response?: { data?: { message?: string } } })?.response?.data
        ?.message ||
      (error as Error)?.message ||
      "Gagal memuat data tim")
    : null;

  // ─── Loading State ──────────────────────────────────────────────────────────

  if (authLoading || isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tim Saya</h1>
          <p className="text-muted-foreground">
            Daftar Teknisi yang ditugaskan dalam tim Anda
          </p>
        </div>
        <LoadingSkeleton variant="list" />
      </div>
    );
  }

  // ─── Error State ────────────────────────────────────────────────────────────

  if (errorMessage) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tim Saya</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <p className="text-destructive">{errorMessage}</p>
        </div>
      </div>
    );
  }

  // ─── Empty State ────────────────────────────────────────────────────────────

  if (teamMembers.length === 0) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tim Saya</h1>
          <p className="text-muted-foreground">
            Daftar Teknisi yang ditugaskan dalam tim Anda
          </p>
        </div>
        <EmptyState
          icon={UsersRound}
          title="Belum ada anggota tim yang ditugaskan"
          description="Hubungi Bidtekkom untuk menambahkan Teknisi ke dalam tim Anda."
        />
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Pengelolaan anggota tim dilakukan oleh Bidtekkom melalui menu Manajemen Tim.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tim Saya</h1>
        <p className="text-muted-foreground">
          Daftar Teknisi yang ditugaskan dalam tim Anda ({teamMembers.length} anggota)
        </p>
      </div>

      {/* Team Members Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UsersRound className="h-5 w-5 text-primary" />
            Anggota Tim
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(teamMembers as TeamMember[]).map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {member.nama}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    <span>{member.nomorWhatsApp}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
