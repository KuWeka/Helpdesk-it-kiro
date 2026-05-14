"use client";

import React, { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { staffApi } from "@/lib/api";
import { Loader2, Copy, Check, AlertTriangle } from "lucide-react";

interface TempPasswordModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

type ModalStep = "confirm" | "display";

export function TempPasswordModal({
  open,
  onClose,
  userId,
  userName,
}: TempPasswordModalProps) {
  const [step, setStep] = useState<ModalStep>("confirm");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localPassword, setLocalPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleClose = useCallback(() => {
    // Clear password from memory on close
    setLocalPassword(null);
    setStep("confirm");
    setError(null);
    setLoading(false);
    setCopied(false);
    onClose();
  }, [onClose]);

  async function handleConfirmReset() {
    setLoading(true);
    setError(null);
    try {
      const res = await staffApi.resetPassword(userId);
      const tempPassword =
        res.data?.data?.temporaryPassword ||
        res.data?.temporaryPassword ||
        "";
      setLocalPassword(tempPassword);
      setStep("display");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Gagal mereset password. Silakan coba lagi.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!localPassword) return;
    try {
      await navigator.clipboard.writeText(localPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = localPassword;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        {step === "confirm" && (
          <>
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
              <DialogDescription>
                Apakah Anda yakin ingin mereset password untuk{" "}
                <span className="font-semibold">{userName}</span>?
              </DialogDescription>
            </DialogHeader>

            <p className="text-sm text-muted-foreground">
              Password baru akan digenerate secara otomatis. Pastikan Anda
              menyalin dan menyampaikan password tersebut kepada pengguna.
            </p>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Batal
              </Button>
              <Button
                onClick={handleConfirmReset}
                disabled={loading}
                variant="destructive"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reset Password
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "display" && (
          <>
            <DialogHeader>
              <DialogTitle>Password Sementara</DialogTitle>
              <DialogDescription>
                Password baru untuk{" "}
                <span className="font-semibold">{userName}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  value={localPassword || ""}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  title="Salin password"
                  aria-label="Salin password"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Password ini hanya ditampilkan sekali. Pastikan Anda menyalin
                  dan menyampaikannya kepada pengguna sebelum menutup dialog ini.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="mr-2 h-4 w-4 text-green-600 dark:text-green-400" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                Salin
              </Button>
              <Button onClick={handleClose}>
                Tutup
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
