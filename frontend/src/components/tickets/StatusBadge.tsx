"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { STATUS_CONFIG, type TicketStatus } from "@/lib/status-config";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status as TicketStatus] ?? { label: status, className: "" };
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
