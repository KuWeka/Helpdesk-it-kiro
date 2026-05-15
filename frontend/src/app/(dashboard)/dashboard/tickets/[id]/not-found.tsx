"use client";

import Link from "next/link";
import { FileX2 } from "lucide-react";

export default function TicketNotFoundPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md rounded-xl border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <FileX2 className="h-7 w-7 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-semibold">Tiket tidak ditemukan</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tiket yang Anda akses tidak tersedia atau sudah dihapus.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link
            href="/dashboard/tickets"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Kembali ke Daftar Tiket
          </Link>
        </div>
      </div>
    </div>
  );
}
