// Single source of truth for ticket status display config.
// Import this in StatusBadge and any dashboard component that needs status colors.

export type TicketStatus = 'PENDING' | 'PROSES' | 'SELESAI' | 'DIBATALKAN' | 'DITOLAK';

export const STATUS_CONFIG: Record<TicketStatus, {
  label: string;
  className: string;
}> = {
  PENDING: {
    label: 'Pending',
    className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800',
  },
  PROSES: {
    label: 'Proses',
    className: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/30 dark:text-teal-300 dark:border-teal-800',
  },
  SELESAI: {
    label: 'Selesai',
    className: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800',
  },
  DIBATALKAN: {
    label: 'Dibatalkan',
    className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800',
  },
  DITOLAK: {
    label: 'Ditolak',
    className: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800',
  },
};
