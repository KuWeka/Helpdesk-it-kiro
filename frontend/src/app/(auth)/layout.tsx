'use client';

import { Card } from '@/components/ui/card';
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
        <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4 py-8">
          <div className="w-full max-w-md">
            {/* App Logo and Name */}
            <div className="flex flex-col items-center mb-6">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-8 w-8 text-primary"
                >
                  <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-foreground">
                PoldaHelp Kalsel
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Sistem Helpdesk IT Internal
              </p>
            </div>

            {/* Card Container for Auth Forms */}
            <Card className="p-6">
              {children}
            </Card>
          </div>
        </div>
        <Toaster />
      </AuthProvider>
    </ThemeProvider>
  );
}
