"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface UnratedTicketsBannerProps {
  count: number;
}

export function UnratedTicketsBanner({ count }: UnratedTicketsBannerProps) {
  if (count <= 0) return null;

  return (
    <Alert className="border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30">
      <AlertTriangle className="h-4 w-4 !text-amber-600 dark:!text-amber-400" />
      <AlertTitle className="text-amber-800 dark:text-amber-200">
        Tiket Belum Dinilai
      </AlertTitle>
      <AlertDescription className="text-amber-700 dark:text-amber-300">
        Anda memiliki {count} tiket selesai yang belum diberi rating. Harap beri
        penilaian sebelum membuat tiket baru.
      </AlertDescription>
    </Alert>
  );
}
