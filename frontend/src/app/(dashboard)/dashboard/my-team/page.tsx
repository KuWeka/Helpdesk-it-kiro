"use client";

import React, { useEffect, useState, useCallback } from "react";
import { UsersRound, Phone, Info } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { dashboardApi } from "@/lib/api";
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

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Fetch Data ─────────────────────────────────────────────────────────────

  const fetchTeamData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await dashboardApi.getPadal();
      const data = response.data.data || response.data;
      setTeamMembers(data.teamMembers || []);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Gagal memuat data tim";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      fetchTeamData();
    }
  }, [authLoading, user, fetchTeamData]);

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

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tim Saya</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <p className="text-destructive">{error}</p>
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
            {teamMembers.map((member) => (
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
