'use client';

import { Shield } from 'lucide-react';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { AuthProvider } from '@/providers/AuthProvider';
import { Toaster } from '@/components/ui/toaster';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="flex min-h-screen">
          {/* Left branding panel — hidden on mobile, visible on desktop */}
          <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center bg-[#0f172a] relative overflow-hidden">
            {/* Decorative dot grid background */}
            <div
              className="absolute inset-0 opacity-5"
              style={{
                backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            />
            <div className="relative z-10 flex flex-col items-center gap-6 text-center px-12">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-teal-600">
                <Shield className="size-9 text-white" />
              </div>
              <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-bold text-white tracking-tight">SIGAP</h1>
                <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
                  Sistem Informasi Gangguan dan Aduan Polri — Polda Kalimantan Selatan
                </p>
              </div>
              <div className="mt-4 flex flex-col items-center gap-1">
                <div className="h-px w-24 bg-teal-600/40" />
                <p className="text-xs text-slate-500 mt-2">Bidang Teknologi dan Komunikasi</p>
              </div>
            </div>
          </div>

          {/* Right form panel */}
          <div className="flex w-full lg:w-1/2 flex-col items-center justify-center min-h-screen bg-white dark:bg-[#111827] px-6 py-12">
            {/* Mobile-only logo */}
            <div className="flex flex-col items-center mb-8 lg:hidden">
              <div className="flex size-12 items-center justify-center rounded-xl bg-teal-600 mb-3">
                <Shield className="size-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">SIGAP</h1>
              <p className="text-xs text-slate-500 mt-1 text-center max-w-xs">
                Sistem Informasi Gangguan dan Aduan Polri
              </p>
            </div>

            <div className="w-full max-w-sm">
              {children}
            </div>
          </div>
        </div>
        <Toaster />
      </AuthProvider>
    </ThemeProvider>
  );
}
