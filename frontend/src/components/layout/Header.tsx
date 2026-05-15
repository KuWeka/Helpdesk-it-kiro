'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Bell, User, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import { useAuth } from '@/providers/AuthProvider';

// ─── Page Title Mapping ──────────────────────────────────────────────────────

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/tickets': 'Tiket',
  '/dashboard/create-ticket': 'Buat Tiket',
  '/dashboard/staff': 'Manajemen User',
  '/dashboard/teams': 'Manajemen Tim',
  '/dashboard/my-team': 'Tim Saya',
  '/dashboard/reports': 'Laporan',
  '/dashboard/audit-log': 'Audit Log',
  '/dashboard/notifications': 'Notifikasi',
  '/dashboard/settings': 'Pengaturan',
  '/dashboard/system-settings': 'Pengaturan Sistem',
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface HeaderUser {
  nama: string;
  role: string;
  foto?: string | null;
}

interface HeaderProps {
  onMenuToggle: () => void;
  user: HeaderUser;
  unreadCount: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Get initials from a full name (first letter of first and last word).
 */
function getInitials(nama: string): string {
  const parts = nama.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// ─── Component ──────────────────────────────────────────────────────────────

export function Header({ onMenuToggle, user, unreadCount }: HeaderProps) {
  const { logout } = useAuth();
  const pathname = usePathname();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white dark:bg-[#111827] px-4 lg:px-6 shadow-sm backdrop-blur-sm">
      {/* Left side: hamburger (mobile) + page title (desktop) */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuToggle}
          aria-label="Toggle menu"
        >
          <Menu className="size-5" />
        </Button>
        <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-100 hidden lg:block">
          {PAGE_TITLES[pathname] ?? 'Dashboard'}
        </h1>
      </div>

      {/* Right side: notification bell + user dropdown */}
      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          asChild
        >
          <Link href="/dashboard/notifications" aria-label="Notifications">
            <Bell className="size-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex size-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>
        </Button>

        {/* User dropdown menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative size-9 rounded-full" aria-label="User menu">
              <Avatar className="size-9">
                {user.foto && <AvatarImage src={user.foto} alt={user.nama} />}
                <AvatarFallback className="bg-teal-600 text-white text-xs">
                  {getInitials(user.nama)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium leading-none">{user.nama}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.role}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings" className="flex items-center gap-2 cursor-pointer">
                <User className="size-4" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings?tab=preferences" className="flex items-center gap-2 cursor-pointer">
                <Settings className="size-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
              onClick={() => setShowLogoutConfirm(true)}
            >
              <LogOut className="size-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <ConfirmModal
          open={showLogoutConfirm}
          onOpenChange={setShowLogoutConfirm}
          onConfirm={logout}
          onCancel={() => setShowLogoutConfirm(false)}
          title="Keluar dari Aplikasi?"
          description="Anda akan keluar dari sesi ini."
          confirmLabel="Keluar"
          cancelLabel="Batal"
          variant="destructive"
        />
      </div>
    </header>
  );
}
