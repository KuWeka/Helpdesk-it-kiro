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

interface CancelTicketModalProps {
  open: boolean;
  onClose: () => void;
  ticketId: string;
  ticketNumber: string;
  onCancelled: () => void;
  onOptimisticCancel?: (alasanBatal?: string) => void;
  onCancelError?: (message: string) => void;
}

export function CancelTicketModal({
  open,
  onClose,
  ticketId,
  ticketNumber,
  onCancelled,
  onOptimisticCancel,
  onCancelError,
}: CancelTicketModalProps) {
  const [alasanBatal, setAlasanBatal] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(value: boolean) {
    if (!value) {
      resetState();
      onClose();
    }
  }

  function resetState() {
    setAlasanBatal("");
    setError(null);
    setLoading(false);
  }

  function getValidationError(): string | null {
    if (alasanBatal.length > 0 && alasanBatal.length > 500) {
      return "Alasan pembatalan tidak boleh lebih dari 500 karakter";
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

    const reason = alasanBatal.trim() || undefined;

    // Optimistic update: immediately update parent state
    if (onOptimisticCancel) {
      onOptimisticCancel(reason);
    }
    resetState();
    onClose();

    try {
      await ticketApi.cancel(ticketId, {
        alasanBatal: reason,
      });
      onCancelled();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Gagal membatalkan tiket. Silakan coba lagi.";
      if (onCancelError) {
        onCancelError(message);
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Batalkan Tiket</DialogTitle>
          <DialogDescription>
            Apakah Anda yakin ingin membatalkan tiket{" "}
            <span className="font-semibold">{ticketNumber}</span>? Tindakan ini
            tidak dapat dibatalkan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="alasanBatal">
              Alasan Pembatalan{" "}
              <span className="text-muted-foreground text-xs">(opsional)</span>
            </Label>
            <Textarea
              id="alasanBatal"
              placeholder="Masukkan alasan pembatalan tiket..."
              value={alasanBatal}
              onChange={(e) => setAlasanBatal(e.target.value)}
              maxLength={500}
              rows={3}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground text-right">
              {alasanBatal.length}/500
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
              Batalkan Tiket
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
