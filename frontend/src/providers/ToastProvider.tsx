"use client"

import { Toaster } from "@/components/ui/toaster"

/**
 * ToastProvider ensures the shadcn/ui Toaster component is mounted in the app.
 * Toast notifications are triggered via the useToast() hook or the toast() function
 * from "@/components/ui/use-toast" in any component.
 *
 * Usage in Socket.io notification events and API responses:
 *   import { useToast } from "@/components/ui/use-toast"
 *   const { toast } = useToast()
 *   toast({ title: "Notifikasi Baru", description: message })
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  )
}
