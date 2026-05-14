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
import { AlertTriangle, Loader2 } from "lucide-react";

interface ActiveTicketWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  activeTicketCount: number;
  userName: string;
}

export function ActiveTicketWarningModal({
  isOpen,
  onClose,
  onConfirm,
  activeTicketCount,
  userName,
}: ActiveTicketWarningModalProps) {
  const [loading, setLoading] = useState(false);

  function handleOpenChange(value: boolean) {
    if (!value && !loading) {
      onClose();
    }
  }

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500 dark:text-amber-400" />
            Peringatan Tiket Aktif
          </DialogTitle>
          <DialogDescription>
            User <span className="font-semibold">{userName}</span> memiliki{" "}
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              {activeTicketCount}
            </span>{" "}
            tiket aktif (PENDING atau PROSES). Apakah Anda yakin ingin tetap
            menonaktifkan akun ini?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Menonaktifkan akun dengan tiket aktif dapat menyebabkan tiket
              tersebut tidak dapat diproses lebih lanjut.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Hapus Tetap
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
