"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ticketApi } from "@/lib/api";
import { Loader2 } from "lucide-react";

interface RejectTicketModalProps {
  open: boolean;
  onClose: () => void;
  ticketId: string;
  ticketNumber: string;
  onRejected: () => void;
  onOptimisticReject?: (alasanTolak: string) => void;
  onRejectError?: (message: string) => void;
}

export function RejectTicketModal({
  open,
  onClose,
  ticketId,
  ticketNumber,
  onRejected,
  onOptimisticReject,
  onRejectError,
}: RejectTicketModalProps) {
  const [alasanTolak, setAlasanTolak] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(value: boolean) {
    if (!value) {
      resetState();
      onClose();
    }
  }

  function resetState() {
    setAlasanTolak("");
    setError(null);
    setLoading(false);
  }

  function getValidationError(): string | null {
    if (!alasanTolak.trim()) {
      return "Alasan penolakan wajib diisi";
    }
    if (alasanTolak.length > 500) {
      return "Alasan penolakan tidak boleh lebih dari 500 karakter";
    }
    return null;
  }

  async function handleSubmit() {
    const validationError = getValidationError();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    const reason = alasanTolak.trim();

    if (onOptimisticReject) {
      onOptimisticReject(reason);
    }
    resetState();
    onClose();

    try {
      await ticketApi.reject(ticketId, {
        alasanTolak: reason,
      });
      onRejected();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Gagal menolak tiket. Silakan coba lagi.";
      if (onRejectError) {
        onRejectError(message);
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tolak Tiket</DialogTitle>
          <DialogDescription>
            Anda akan menolak tiket <span className="font-semibold">{ticketNumber}</span>.
            Mohon isi alasan penolakan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="alasanTolak">Alasan Penolakan</Label>
            <Textarea
              id="alasanTolak"
              placeholder="Masukkan alasan penolakan tiket..."
              value={alasanTolak}
              onChange={(e) => setAlasanTolak(e.target.value)}
              maxLength={500}
              rows={3}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground text-right">
              {alasanTolak.length}/500
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Kembali
            </Button>
            <Button
              variant="destructive"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Tolak Tiket
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
