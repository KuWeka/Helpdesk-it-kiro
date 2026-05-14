"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { staffApi, ticketApi } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface PadalUser {
  id: string;
  nama: string;
}

interface QuickAssignModalProps {
  open: boolean;
  onClose: () => void;
  ticketId: string;
  ticketNumber: string;
  onAssigned: () => void;
  onOptimisticAssign?: (ticketId: string, padalId: string, padalNama: string) => void;
  onAssignError?: (ticketId: string) => void;
}

export function QuickAssignModal({
  open,
  onClose,
  ticketId,
  ticketNumber,
  onAssigned,
  onOptimisticAssign,
  onAssignError,
}: QuickAssignModalProps) {
  const { toast } = useToast();
  const [padalList, setPadalList] = useState<PadalUser[]>([]);
  const [selectedPadalId, setSelectedPadalId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedPadalId("");
      setError(null);
      fetchPadalUsers();
    }
  }, [open]);

  async function fetchPadalUsers() {
    setFetching(true);
    try {
      const res = await staffApi.listUsers({ role: "PADAL", pageSize: 100 });
      const data = res.data?.data || res.data;
      // Filter only active Padal users
      const users = (Array.isArray(data) ? data : []).filter(
        (u: { deletedAt?: string | null }) => !u.deletedAt
      );
      setPadalList(users);
    } catch {
      setPadalList([]);
    } finally {
      setFetching(false);
    }
  }

  async function handleAssign() {
    if (!selectedPadalId) return;
    setLoading(true);
    setError(null);

    // Find selected Padal name for optimistic update
    const selectedPadal = padalList.find((p) => p.id === selectedPadalId);
    const padalNama = selectedPadal?.nama || "";

    // Optimistic update: immediately update parent table
    if (onOptimisticAssign) {
      onOptimisticAssign(ticketId, selectedPadalId, padalNama);
    }
    onClose();

    try {
      await ticketApi.assign(ticketId, { padalId: selectedPadalId });
      onAssigned();
      toast({
        title: "Tiket Diassign",
        description: `Tiket ${ticketNumber} berhasil diassign ke ${padalNama}.`,
      });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Gagal assign tiket. Silakan coba lagi.";
      // Revert optimistic update
      if (onAssignError) {
        onAssignError(ticketId);
      }
      toast({
        title: "Gagal",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Tiket</DialogTitle>
          <DialogDescription>
            Pilih Padal untuk tiket <span className="font-semibold">{ticketNumber}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {fetching ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Memuat daftar Padal...</span>
            </div>
          ) : padalList.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Tidak ada Padal aktif yang tersedia.
            </p>
          ) : (
            <Select value={selectedPadalId} onValueChange={setSelectedPadalId}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih Padal..." />
              </SelectTrigger>
              <SelectContent>
                {padalList.map((padal) => (
                  <SelectItem key={padal.id} value={padal.id}>
                    {padal.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Batal
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedPadalId || loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
