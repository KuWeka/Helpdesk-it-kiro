/**
 * Centralized formatting utilities for dates, times, and file sizes.
 * Prevents duplication across pages and ensures consistent formatting.
 */

/**
 * Format a date string as "DD MMM YYYY" (e.g., "15 Jan 2024")
 * Locale: Indonesian
 * 
 * @param dateStr - ISO date string or null/undefined
 * @returns Formatted date or "—" if input is null/undefined
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format a date string with time as "DD MMMM YYYY HH:MM" (e.g., "15 Januari 2024 14:30")
 * Locale: Indonesian
 * 
 * @param dateStr - ISO date string or null/undefined
 * @returns Formatted date-time or "—" if input is null/undefined
 */
export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a date string as a human-readable relative time (e.g., "5 menit lalu", "2 jam lalu")
 * Falls back to full date format for dates older than 7 days.
 * 
 * @param dateStr - ISO date string
 * @returns Relative time description
 */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'Baru saja';
  if (diffMinutes < 60) return `${diffMinutes} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays < 7) return `${diffDays} hari lalu`;

  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format file size in bytes to human-readable format (B, KB, MB)
 * 
 * @param bytes - File size in bytes
 * @returns Formatted file size (e.g., "1.5 KB", "2.3 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Format a timestamp for audit logs as "DD MMM YYYY HH:MM"
 * Alias for formatDateTime for semantic clarity in audit log context.
 * 
 * @param dateStr - ISO date string
 * @returns Formatted timestamp
 */
export function formatTimestamp(dateStr: string): string {
  return formatDateTime(dateStr);
}

/**
 * Extract file extension from filename
 * 
 * @param filename - Full filename with extension
 * @returns File extension in lowercase (e.g., "pdf", "jpg")
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

/**
 * Extract user initials from name
 * Returns the first character of the name in uppercase
 * 
 * @param nama - User's full name
 * @returns Single character initial
 */
export function getInitials(nama: string): string {
  return nama.charAt(0).toUpperCase();
}

/**
 * Format metadata object for display in audit logs
 * Converts metadata key-value pairs to readable string format
 * 
 * @param metadata - Metadata object or null
 * @returns Formatted metadata string or empty string
 */
export function formatMetadata(metadata: Record<string, unknown> | null): string {
  if (!metadata || Object.keys(metadata).length === 0) return '';
  return Object.entries(metadata)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join(', ');
}
