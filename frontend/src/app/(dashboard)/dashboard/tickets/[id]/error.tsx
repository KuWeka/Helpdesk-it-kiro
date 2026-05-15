"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TicketDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Ticket detail error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md rounded-xl border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </div>
        <h1 className="text-xl font-semibold">Terjadi kesalahan</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Gagal memuat detail tiket. Silakan coba lagi.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button onClick={reset}>Coba Lagi</Button>
        </div>
      </div>
    </div>
  );
}
