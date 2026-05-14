"use client";

import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface DivisiRequiredBannerProps {
  message?: string;
  redirectTo?: string;
}

export function DivisiRequiredBanner({
  message = "Anda belum mengisi divisi. Lengkapi profil Anda terlebih dahulu.",
  redirectTo = "/dashboard/settings",
}: DivisiRequiredBannerProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Alert className="max-w-lg border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        <AlertTitle className="text-amber-800 dark:text-amber-300">
          Divisi Belum Diisi
        </AlertTitle>
        <AlertDescription className="text-amber-700 dark:text-amber-400">
          {message}
        </AlertDescription>
      </Alert>
      <Button
        className="mt-4"
        onClick={() => router.push(redirectTo)}
      >
        Lengkapi Profil
      </Button>
    </div>
  );
}
