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

// ─── Menu Configuration ─────────────────────────────────────────────────────

function getMenuItems(role: Role, unreadCount?: number): MenuItem[] {
  const notificationItem: MenuItem = {
    label: "Notifikasi",
    href: "/dashboard/notifications",
    icon: <Bell className="h-5 w-5" />,
    badge: unreadCount && unreadCount > 0 ? unreadCount : undefined,
  };

  const settingsItem: MenuItem = {
    label: "Pengaturan",
    href: "/dashboard/settings",
    icon: <Settings className="h-5 w-5" />,
  };

  switch (role) {
    case "SATKER":
      return [
        {
          label: "Dashboard",
          href: "/dashboard",
          icon: <LayoutDashboard className="h-5 w-5" />,
        },
        {
          label: "Tiket Saya",
          href: "/dashboard/tickets",
          icon: <Ticket className="h-5 w-5" />,
        },
        {
          label: "Buat Tiket",
          href: "/dashboard/create-ticket",
          icon: <PlusCircle className="h-5 w-5" />,
        },
        notificationItem,
        settingsItem,
      ];

    case "BIDTEKKOM":
      return [
        {
          label: "Dashboard",
          href: "/dashboard",
          icon: <LayoutDashboard className="h-5 w-5" />,
        },
        {
          label: "Semua Tiket",
          href: "/dashboard/tickets",
          icon: <Ticket className="h-5 w-5" />,
        },
        {
          label: "Manajemen User",
          href: "/dashboard/staff",
          icon: <Users className="h-5 w-5" />,
        },
        {
          label: "Manajemen Tim",
          href: "/dashboard/teams",
          icon: <UsersRound className="h-5 w-5" />,
        },
        {
          label: "Laporan",
          href: "/dashboard/reports",
          icon: <FileText className="h-5 w-5" />,
        },
        {
          label: "Audit Log",
          href: "/dashboard/audit-log",
          icon: <Shield className="h-5 w-5" />,
        },
        notificationItem,
        {
          label: "Pengaturan Sistem",
          href: "/dashboard/system-settings",
          icon: <Cog className="h-5 w-5" />,
        },
        settingsItem,
      ];

    case "PADAL":
      return [
        {
          label: "Dashboard",
          href: "/dashboard",
          icon: <LayoutDashboard className="h-5 w-5" />,
        },
        {
          label: "Tiket Saya",
          href: "/dashboard/tickets",
          icon: <Ticket className="h-5 w-5" />,
        },
        {
          label: "Laporan",
          href: "/dashboard/reports",
          icon: <FileText className="h-5 w-5" />,
        },
        {
          label: "Tim Saya",
          href: "/dashboard/my-team",
          icon: <UsersRound className="h-5 w-5" />,
        },
        notificationItem,
        settingsItem,
      ];

    case "TEKNISI":
      return [
        {
          label: "Dashboard",
          href: "/dashboard",
          icon: <LayoutDashboard className="h-5 w-5" />,
        },
        {
          label: "Tiket",
          href: "/dashboard/tickets",
          icon: <Ticket className="h-5 w-5" />,
        },
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
      <SheetContent side="left" className="w-72 p-0 flex flex-col">
        {/* Header with app branding */}
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            {appLogo ? (
              <Image
                src={appLogo}
                alt={appName}
                width={32}
                height={32}
                className="rounded"
              />
            ) : (
              <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-sm font-bold">
                  {appName.charAt(0)}
                </span>
              </div>
            )}
            <span className="text-base font-semibold truncate">{appName}</span>
          </SheetTitle>
        </SheetHeader>

        {/* Navigation menu */}
        <nav className="flex-1 overflow-y-auto py-2" aria-label="Menu navigasi">
          <ul className="space-y-1 px-2">
            {menuItems.map((item) => {
              const isActive =
                currentPath === item.href ||
                (item.href !== "/dashboard" &&
                  currentPath.startsWith(item.href));

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={handleMenuClick}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {item.icon}
                    <span className="flex-1">{item.label}</span>
                    {item.badge !== undefined && (
                      <Badge
                        variant="destructive"
                        className="ml-auto h-5 min-w-[20px] px-1.5 text-xs"
                      >
                        {item.badge > 99 ? "99+" : item.badge}
                      </Badge>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User footer */}
        <div className="border-t p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              {user.foto && <AvatarImage src={user.foto} alt={user.nama} />}
              <AvatarFallback className="text-xs font-medium">
                {user.nama.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.nama}</p>
              <Badge variant="secondary" className="text-xs mt-0.5">
                {user.role}
              </Badge>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
