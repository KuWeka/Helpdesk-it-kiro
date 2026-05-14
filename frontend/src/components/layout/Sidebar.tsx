"use client";

import React from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  PlusCircle,
  Ticket,
  Bell,
  Settings,
  Users,
  FileText,
  ClipboardList,
  Shield,
  Wrench,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

type Role = "SATKER" | "BIDTEKKOM" | "PADAL" | "TEKNISI";

interface MenuItem {
  label: string;
  href: string;
  icon: React.ElementType;
  showBadge?: boolean;
}

export interface SidebarProps {
  role: Role;
  currentPath: string;
  appName: string;
  appLogo?: string | null;
  user: {
    nama: string;
    role: Role;
    foto?: string | null;
  };
  unreadCount: number;
}

const MENU_ITEMS: Record<Role, MenuItem[]> = {
  SATKER: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Buat Tiket", href: "/dashboard/create-ticket", icon: PlusCircle },
    { label: "Tiket Saya", href: "/dashboard/tickets", icon: Ticket },
    { label: "Notifikasi", href: "/dashboard/notifications", icon: Bell, showBadge: true },
    { label: "Pengaturan", href: "/dashboard/settings", icon: Settings },
  ],
  BIDTEKKOM: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Semua Tiket", href: "/dashboard/tickets", icon: Ticket },
    { label: "Manajemen User", href: "/dashboard/staff", icon: Users },
    { label: "Manajemen Tim", href: "/dashboard/teams", icon: UsersRound },
    { label: "Laporan", href: "/dashboard/reports", icon: FileText },
    { label: "Audit Log", href: "/dashboard/audit-log", icon: ClipboardList },
    { label: "Notifikasi", href: "/dashboard/notifications", icon: Bell, showBadge: true },
    { label: "Pengaturan Sistem", href: "/dashboard/system-settings", icon: Wrench },
    { label: "Pengaturan", href: "/dashboard/settings", icon: Settings },
  ],
  PADAL: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Tiket Saya", href: "/dashboard/tickets", icon: Ticket },
    { label: "Tim Saya", href: "/dashboard/my-team", icon: UsersRound },
    { label: "Laporan", href: "/dashboard/reports", icon: FileText },
    { label: "Notifikasi", href: "/dashboard/notifications", icon: Bell, showBadge: true },
    { label: "Pengaturan", href: "/dashboard/settings", icon: Settings },
  ],
  TEKNISI: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Tiket", href: "/dashboard/tickets", icon: Ticket },
    { label: "Notifikasi", href: "/dashboard/notifications", icon: Bell, showBadge: true },
    { label: "Pengaturan", href: "/dashboard/settings", icon: Settings },
  ],
};

const ROLE_LABELS: Record<Role, string> = {
  SATKER: "Satker",
  BIDTEKKOM: "Bidtekkom",
  PADAL: "Padal",
  TEKNISI: "Teknisi",
};

function getInitials(nama: string): string {
  return nama.charAt(0).toUpperCase();
}

function isActive(currentPath: string, href: string): boolean {
  if (href === "/dashboard") {
    return currentPath === "/dashboard";
  }
  return currentPath.startsWith(href);
}

export function Sidebar({
  role,
  currentPath,
  appName,
  appLogo,
  user,
  unreadCount,
}: SidebarProps) {
  const menuItems = MENU_ITEMS[role] || [];

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      {/* App branding */}
      <div className="flex h-16 items-center gap-3 border-b px-4">
        {appLogo ? (
          <img
            src={appLogo}
            alt={appName}
            className="h-8 w-8 rounded object-contain"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded bg-primary">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
        )}
        <span className="text-sm font-semibold truncate">{appName}</span>
      </div>

      {/* Navigation menu */}
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Menu navigasi utama">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const active = isActive(currentPath, item.href);
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                  {item.showBadge && unreadCount > 0 && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User footer */}
      <div className="border-t px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            {user.foto && <AvatarImage src={user.foto} alt={user.nama} />}
            <AvatarFallback className="bg-muted text-sm font-medium">
              {getInitials(user.nama)}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">{user.nama}</span>
            <Badge variant="secondary" className="w-fit text-[10px] px-1.5 py-0">
              {ROLE_LABELS[user.role]}
            </Badge>
          </div>
        </div>
      </div>
    </aside>
  );
}
