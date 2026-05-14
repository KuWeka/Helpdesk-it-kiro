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

const variantStyles: Record<StatCardVariant, { icon: string; bg: string }> = {
  default: {
    icon: "text-primary",
    bg: "bg-primary/10",
  },
  warning: {
    icon: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-900/30",
  },
  success: {
    icon: "text-green-600 dark:text-green-400",
    bg: "bg-green-100 dark:bg-green-900/30",
  },
  danger: {
    icon: "text-red-600 dark:text-red-400",
    bg: "bg-red-100 dark:bg-red-900/30",
  },
  info: {
    icon: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-900/30",
  },
};

export function StatCard({ title, value, icon: Icon, variant = "default" }: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-lg", styles.bg)}>
          <Icon className={cn("h-6 w-6", styles.icon)} />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground truncate">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
