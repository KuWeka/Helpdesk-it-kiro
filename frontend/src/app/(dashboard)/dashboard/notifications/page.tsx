"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Bell,
  BellOff,
  CheckCheck,
  Trash2,
  Mail,
  MailOpen,
  ChevronLeft,
  ChevronRight,
  Ticket,
  UserPlus,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useSocket } from "@/providers/SocketProvider";
import { notificationApi } from "@/lib/api";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Notification {
  id: string;
  type: "TICKET_CREATED" | "TICKET_ASSIGNED" | "TICKET_COMPLETED" | "TICKET_CANCELLED";
  ticketNumber: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getNotificationIcon(type: Notification["type"]) {
  switch (type) {
    case "TICKET_CREATED":
      return <Ticket className="h-5 w-5 text-blue-500" />;
    case "TICKET_ASSIGNED":
      return <UserPlus className="h-5 w-5 text-orange-500" />;
    case "TICKET_COMPLETED":
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case "TICKET_CANCELLED":
      return <XCircle className="h-5 w-5 text-red-500" />;
    default:
      return <Bell className="h-5 w-5 text-muted-foreground" />;
  }
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return "Baru saja";
  if (diffMinutes < 60) return `${diffMinutes} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays < 7) return `${diffDays} hari lalu`;

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { resetUnreadCount, onNotification } = useSocket();
  const { toast } = useToast();

  // State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async (page: number) => {
    try {
      setIsLoading(true);
      const response = await notificationApi.list({ page });
      const resData = response.data;

      setNotifications(resData.data || []);
      setPagination(resData.pagination || null);
      setUnreadCount(resData.unreadCount || 0);
    } catch {
      toast({
        title: "Error",
        description: "Gagal memuat notifikasi",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchNotifications(currentPage);
    }
  }, [currentPage, authLoading, user, fetchNotifications]);

  // Listen for real-time notifications via Socket.io
  useEffect(() => {
    const unsubscribe = onNotification((notification) => {
      // Prepend new notification to the list if on the first page
      if (currentPage === 1) {
        setNotifications((prev) => {
          const newNotification: Notification = {
            id: notification.id,
            type: notification.type as Notification["type"],
            ticketNumber: notification.ticketNumber,
            message: notification.message,
            isRead: notification.isRead,
            createdAt: notification.createdAt,
          };
          // Avoid duplicates
          if (prev.some((n) => n.id === newNotification.id)) {
            return prev;
          }
          // Prepend and keep max 50 items per page
          return [newNotification, ...prev].slice(0, 50);
        });
      }
      // Update unread count
      setUnreadCount((prev) => prev + 1);
      // Update pagination total
      setPagination((prev) =>
        prev ? { ...prev, totalItems: prev.totalItems + 1 } : prev
      );
    });

    return unsubscribe;
  }, [onNotification, currentPage]);

  // ─── Actions ────────────────────────────────────────────────────────────────

  const handleMarkAsRead = async (id: string) => {
    try {
      setActionLoading(id);
      await notificationApi.markAsRead(id);

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      resetUnreadCount();
    } catch {
      toast({
        title: "Error",
        description: "Gagal menandai notifikasi sebagai dibaca",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setActionLoading("mark-all");
      await notificationApi.markAllAsRead();

      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      resetUnreadCount();

      toast({
        title: "Berhasil",
        description: "Semua notifikasi ditandai sudah dibaca",
      });
    } catch {
      toast({
        title: "Error",
        description: "Gagal menandai semua notifikasi sebagai dibaca",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setActionLoading(id);
      await notificationApi.delete(id);

      // Find the notification before removing to check if it was unread
      const deletedNotification = notifications.find((n) => n.id === id);

      // Update local state
      setNotifications((prev) => prev.filter((n) => n.id !== id));

      if (deletedNotification && !deletedNotification.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
        resetUnreadCount();
      }

      toast({
        title: "Berhasil",
        description: "Notifikasi berhasil dihapus",
      });

      // If the page is now empty and not the first page, go back
      if (notifications.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
      }
    } catch {
      toast({
        title: "Error",
        description: "Gagal menghapus notifikasi",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Pagination Handlers ────────────────────────────────────────────────────

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (pagination && currentPage < pagination.totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  // ─── Loading State ──────────────────────────────────────────────────────────

  if (authLoading || (isLoading && notifications.length === 0)) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifikasi</h1>
          <p className="text-muted-foreground">
            Kelola notifikasi dan pemberitahuan Anda
          </p>
        </div>
        <LoadingSkeleton variant="list" />
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifikasi</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} notifikasi belum dibaca`
              : "Semua notifikasi sudah dibaca"}
          </p>
        </div>

        {/* Mark All as Read Button */}
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={actionLoading === "mark-all"}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Tandai Semua Dibaca
          </Button>
        )}
      </div>

      {/* Notification List */}
      <Card>
        <CardContent className="p-0">
          {notifications.length === 0 ? (
            <EmptyState
              icon={BellOff}
              title="Tidak Ada Notifikasi"
              description="Anda belum memiliki notifikasi. Notifikasi akan muncul saat ada pembaruan tiket."
            />
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-4 p-4 transition-colors ${
                    notification.isRead
                      ? "bg-background"
                      : "bg-primary/5 font-medium"
                  }`}
                >
                  {/* Notification Type Icon */}
                  <div className="mt-0.5 flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm ${
                        notification.isRead
                          ? "text-muted-foreground"
                          : "text-foreground font-semibold"
                      }`}
                    >
                      {notification.message}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">
                        {notification.ticketNumber}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(notification.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!notification.isRead && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 min-h-[44px] min-w-[44px] lg:min-h-[32px] lg:min-w-[32px]"
                        onClick={() => handleMarkAsRead(notification.id)}
                        disabled={actionLoading === notification.id}
                        title="Tandai sudah dibaca"
                        aria-label="Tandai sudah dibaca"
                      >
                        <MailOpen className="h-4 w-4" />
                      </Button>
                    )}
                    {notification.isRead && (
                      <div className="h-8 w-8 min-h-[44px] min-w-[44px] lg:min-h-[32px] lg:min-w-[32px] flex items-center justify-center">
                        <Mail className="h-4 w-4 text-muted-foreground/50" />
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 min-h-[44px] min-w-[44px] lg:min-h-[32px] lg:min-w-[32px] text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(notification.id)}
                      disabled={actionLoading === notification.id}
                      title="Hapus notifikasi"
                      aria-label="Hapus notifikasi"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Halaman {pagination.page} dari {pagination.totalPages} ({pagination.totalItems} notifikasi)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0"
              onClick={handlePreviousPage}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0"
              onClick={handleNextPage}
              disabled={currentPage >= pagination.totalPages}
            >
              Selanjutnya
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
