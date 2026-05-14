// Shared constants for PoldaHelp Kalsel IT Helpdesk

import { Role, TicketStatus, TicketCategory } from '../types';

export const ROLE_LABELS: Record<Role, string> = {
  [Role.SATKER]: 'Satker',
  [Role.BIDTEKKOM]: 'Bidtekkom',
  [Role.PADAL]: 'Padal',
  [Role.TEKNISI]: 'Teknisi',
};

export const STATUS_LABELS: Record<TicketStatus, string> = {
  [TicketStatus.PENDING]: 'Pending',
  [TicketStatus.PROSES]: 'Proses',
  [TicketStatus.SELESAI]: 'Selesai',
  [TicketStatus.DIBATALKAN]: 'Dibatalkan',
};

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  [TicketCategory.HARDWARE]: 'Hardware',
  [TicketCategory.SOFTWARE]: 'Software',
  [TicketCategory.JARINGAN]: 'Jaringan',
  [TicketCategory.EMAIL]: 'Email',
  [TicketCategory.WEBSITE]: 'Website',
  [TicketCategory.LAINNYA]: 'Lainnya',
};
