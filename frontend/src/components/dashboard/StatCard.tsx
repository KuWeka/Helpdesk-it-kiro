"use client";

import React from "react";
import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatCardVariant = "default" | "warning" | "success" | "danger" | "info";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  variant?: StatCardVariant;
}

const variantStyles: Record<StatCardVariant, { icon: string; iconBg: string; cardBg: string; cardBorder: string }> = {
  default: {
    icon: "text-teal-600 dark:text-teal-400",
    iconBg: "bg-teal-100 dark:bg-teal-900/30",
    cardBg: "bg-white dark:bg-card",
    cardBorder: "border",
  },
  warning: {
    icon: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
    cardBg: "bg-amber-50 dark:bg-amber-950/20",
    cardBorder: "border-amber-100 dark:border-amber-900/30",
  },
  info: {
    icon: "text-teal-600 dark:text-teal-400",
    iconBg: "bg-teal-100 dark:bg-teal-900/30",
    cardBg: "bg-teal-50 dark:bg-teal-950/20",
    cardBorder: "border-teal-100 dark:border-teal-900/30",
  },
  success: {
    icon: "text-green-600 dark:text-green-400",
    iconBg: "bg-green-100 dark:bg-green-900/30",
    cardBg: "bg-green-50 dark:bg-green-950/20",
    cardBorder: "border-green-100 dark:border-green-900/30",
  },
  danger: {
    icon: "text-red-600 dark:text-red-400",
    iconBg: "bg-red-100 dark:bg-red-900/30",
    cardBg: "bg-red-50 dark:bg-red-950/20",
    cardBorder: "border-red-100 dark:border-red-900/30",
  },
};

export function StatCard({ title, value, icon: Icon, variant = "default" }: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <Card className={cn("border", styles.cardBg, styles.cardBorder)}>
      <CardContent className="flex items-center gap-4 p-6">
        <div className={cn("flex size-12 shrink-0 items-center justify-center rounded-lg", styles.iconBg)}>
          <Icon className={cn("size-6", styles.icon)} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
