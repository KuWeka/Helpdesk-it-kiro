"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Ticket,
  PlusCircle,
  Bell,
  Settings,
  Users,
  UsersRound,
  FileText,
  Shield,
  Cog,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type Role = "SATKER" | "BIDTEKKOM" | "PADAL" | "TEKNISI";

interface MenuItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

export interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role;
  currentPath: string;
  appName: string;
  appLogo: string;
  user: { nama: string; role: Role; foto?: string };
  unreadCount?: number;
}

const ROLE_LABELS: Record<Role, string> = {
  SATKER: "Satker",
  BIDTEKKOM: "Bidtekkom",
  PADAL: "Padal",
  TEKNISI: "Teknisi",
};

// ─── Menu Configuration ─────────────────────────────────────────────────────

function getMenuItems(role: Role, unreadCount?: number): MenuItem[] {
  const notificationItem: MenuItem = {
    label: "Notifikasi",
    href: "/dashboard/notifications",
    icon: <Bell className="size-5" />,
    badge: unreadCount && unreadCount > 0 ? unreadCount : undefined,
  };

  const settingsItem: MenuItem = {
    label: "Pengaturan",
    href: "/dashboard/settings",
    icon: <Settings className="size-5" />,
  };

  switch (role) {
    case "SATKER":
      return [
        { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="size-5" /> },
        { label: "Tiket Saya", href: "/dashboard/tickets", icon: <Ticket className="size-5" /> },
        { label: "Buat Tiket", href: "/dashboard/create-ticket", icon: <PlusCircle className="size-5" /> },
        notificationItem,
        settingsItem,
      ];

    case "BIDTEKKOM":
      return [
        { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="size-5" /> },
        { label: "Semua Tiket", href: "/dashboard/tickets", icon: <Ticket className="size-5" /> },
        { label: "Manajemen User", href: "/dashboard/staff", icon: <Users className="size-5" /> },
        { label: "Manajemen Tim", href: "/dashboard/teams", icon: <UsersRound className="size-5" /> },
        { label: "Laporan", href: "/dashboard/reports", icon: <FileText className="size-5" /> },
        { label: "Audit Log", href: "/dashboard/audit-log", icon: <Shield className="size-5" /> },
        notificationItem,
        { label: "Pengaturan Sistem", href: "/dashboard/system-settings", icon: <Cog className="size-5" /> },
        settingsItem,
      ];

    case "PADAL":
      return [
        { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="size-5" /> },
        { label: "Tiket Saya", href: "/dashboard/tickets", icon: <Ticket className="size-5" /> },
        { label: "Laporan", href: "/dashboard/reports", icon: <FileText className="size-5" /> },
        { label: "Tim Saya", href: "/dashboard/my-team", icon: <UsersRound className="size-5" /> },
        notificationItem,
        settingsItem,
      ];

    case "TEKNISI":
      return [
        { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="size-5" /> },
        { label: "Tiket", href: "/dashboard/tickets", icon: <Ticket className="size-5" /> },
        notificationItem,
        settingsItem,
      ];

    default:
      return [];
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function MobileDrawer({
  isOpen,
  onClose,
  role,
  currentPath,
  appName,
  appLogo,
  user,
  unreadCount,
}: MobileDrawerProps) {
  const menuItems = getMenuItems(role, unreadCount);

  const handleMenuClick = () => {
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="left" className="w-72 p-0 flex flex-col bg-[#0f172a] border-r border-[#1e293b]">
        {/* Header with app branding */}
        <SheetHeader className="px-4 py-4 border-b border-[#1e293b]">
          <SheetTitle className="flex items-center gap-3">
            {appLogo ? (
              <Image
                src={appLogo}
                alt={appName}
                width={32}
                height={32}
                className="rounded"
              />
            ) : (
              <div className="size-8 rounded-lg bg-teal-600 flex items-center justify-center">
                <Shield className="size-5 text-white" />
              </div>
            )}
            <span className="text-base font-semibold text-white">SIGAP</span>
          </SheetTitle>
        </SheetHeader>

        {/* Navigation menu */}
        <nav className="flex-1 overflow-y-auto py-3" aria-label="Menu navigasi">
          <ul className="flex flex-col gap-1 px-3">
            {menuItems.map((item) => {
              const active =
                currentPath === item.href ||
                (item.href !== "/dashboard" &&
                  currentPath.startsWith(item.href));

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={handleMenuClick}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f172a]",
                      active
                        ? "relative bg-white/10 text-white border-l-2 border-teal-500 pl-[10px]"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    {item.icon}
                    <span className="flex-1">{item.label}</span>
                    {item.badge !== undefined && (
                      <span className="ml-auto flex size-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User footer */}
        <div className="border-t border-[#1e293b] p-4">
          <div className="flex items-center gap-3">
            <Avatar className="size-9">
              {user.foto && <AvatarImage src={user.foto} alt={user.nama} />}
              <AvatarFallback className="bg-teal-600 text-white text-sm font-medium">
                {user.nama.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <p className="text-sm font-medium truncate text-white">{user.nama}</p>
              <Badge className="w-fit bg-teal-900 text-teal-300 border-teal-800 text-xs px-1.5 py-0 hover:bg-teal-900">
                {ROLE_LABELS[user.role]}
              </Badge>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
