import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Role, Prisma } from '@prisma/client';
import { AppError } from '../utils/AppError';
import * as auditService from './auditService';
import { invalidateCachedUser } from '../lib/authCache';


/**
 * Pagination parameters for staff queries.
 */
export interface StaffPaginationParams {
  page?: number;
  pageSize?: number;
}

/**
 * Filters for listing users.
 */
export interface UserFilters {
  role?: Role;
  status?: 'active' | 'inactive';
  search?: string;
}

/**
 * Paginated result format.
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

/**
 * User data returned from list queries.
 */
export interface UserListItem {
  id: string;
  nama: string;
  email: string;
  nomorWhatsApp: string;
  role: Role;
  divisi: string | null;
  deletedAt: Date | null;
  createdAt: Date;
}

/**
 * Padal team with associated Teknisi members.
 */
export interface PadalTeam {
  id: string;
  nama: string;
  email: string;
  teamMembers: {
    id: string;
    nama: string;
    email: string;
    nomorWhatsApp: string;
  }[];
}

/**
 * Generate a temporary password of at least 12 characters
 * containing uppercase, lowercase, and numeric characters.
 */
function generateTemporaryPassword(): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const allChars = uppercase + lowercase + numbers;

  // Ensure at least one of each required type
  let password = '';
  password += uppercase[crypto.randomInt(uppercase.length)];
  password += lowercase[crypto.randomInt(lowercase.length)];
  password += numbers[crypto.randomInt(numbers.length)];

  // Fill remaining characters (9 more for total of 12)
  for (let i = 0; i < 9; i++) {
    password += allChars[crypto.randomInt(allChars.length)];
  }

  // Shuffle the password to avoid predictable positions
  const shuffled = password
    .split('')
    .sort(() => crypto.randomInt(3) - 1)
    .join('');

  return shuffled;
}

/**
 * List all registered users with pagination and optional filters.
 * Displays up to 20 users per page.
 *
 * Requirements: 11.1
 */
export async function listUsers(
  pagination: StaffPaginationParams = {},
  filters: UserFilters = {}
): Promise<PaginatedResult<UserListItem>> {
  const page = pagination.page && pagination.page > 0 ? pagination.page : 1;
  const pageSize = pagination.pageSize && pagination.pageSize > 0 ? Math.min(pagination.pageSize, 20) : 20;
  const skip = (page - 1) * pageSize;

  // Build where clause
  const where: Prisma.UserWhereInput = {};

  // Filter by role
  if (filters.role) {
    where.role = filters.role;
  }

  // Filter by status (active/inactive)
  if (filters.status === 'active') {
    where.deletedAt = null;
  } else if (filters.status === 'inactive') {
    where.deletedAt = { not: null };
  }

  // Search by nama or email
  if (filters.search) {
    where.OR = [
      { nama: { contains: filters.search } },
      { email: { contains: filters.search } },
    ];
  }

  const [totalItems, data] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      select: {
        id: true,
        nama: true,
        email: true,
        nomorWhatsApp: true,
        role: true,
        divisi: true,
        deletedAt: true,
        createdAt: true,
      },
    }),
  ]);

  const totalPages = Math.ceil(totalItems / pageSize);

  return {
    data,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages,
    },
  };
}

/**
 * Change a user's role to one of the valid roles.
 * Records audit log with previous and new role.
 *
 * Requirements: 11.2
 */
export async function changeRole(
  targetUserId: string,
  newRole: Role,
  actorId: string
): Promise<void> {
  // Find target user
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!targetUser) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User tidak ditemukan');
  }

  if (targetUser.deletedAt !== null) {
    throw new AppError(400, 'USER_INACTIVE', 'User sudah tidak aktif');
  }

  const oldRole = targetUser.role;

  // Validate new role is different
  if (oldRole === newRole) {
    throw new AppError(400, 'SAME_ROLE', 'Role baru sama dengan role saat ini');
  }

  // Update role
  await prisma.user.update({
    where: { id: targetUserId },
    data: { role: newRole },
  });

  // Get actor info for audit log
  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    select: { nama: true },
  });

  // Record audit log
  await auditService.log({
    eventType: 'ROLE_CHANGE',
    actorId,
    actorNama: actor?.nama ?? 'Unknown',
    targetEntityId: targetUserId,
    metadata: {
      oldRole,
      newRole,
      targetNama: targetUser.nama,
    },
  });
}

/**
 * Reset a user's password by generating a temporary password.
 * Returns the plaintext temporary password once for the Bidtekkom to communicate.
 *
 * Requirements: 11.3
 */
export async function resetPassword(
  targetUserId: string,
  actorId: string
): Promise<{ temporaryPassword: string }> {
  // Find target user
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!targetUser) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User tidak ditemukan');
  }

  // Generate temporary password (12+ chars, upper+lower+number)
  const temporaryPassword = generateTemporaryPassword();

  // Hash the temporary password
  const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

  // Update user's password
  await prisma.user.update({
    where: { id: targetUserId },
    data: {
      password: hashedPassword,
      // Clear any existing reset tokens
      passwordResetToken: null,
      passwordResetExpires: null,
    },
  });

  // Get actor info for audit log
  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    select: { nama: true },
  });

  // Record audit log
  await auditService.log({
    eventType: 'PASSWORD_RESET',
    actorId,
    actorNama: actor?.nama ?? 'Unknown',
    targetEntityId: targetUserId,
    metadata: {
      targetNama: targetUser.nama,
      targetEmail: targetUser.email,
    },
  });

  return { temporaryPassword };
}

/**
 * Soft delete a user account (mark as inactive).
 * Checks for active tickets and requires forceDelete if they exist.
 *
 * Requirements: 11.4, 11.9
 */
export async function softDelete(
  targetUserId: string,
  actorId: string,
  forceDelete?: boolean
): Promise<void> {
  // Find target user
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!targetUser) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User tidak ditemukan');
  }

  if (targetUser.deletedAt !== null) {
    throw new AppError(400, 'ALREADY_DELETED', 'User sudah dinonaktifkan');
  }

  // Check for active tickets (PENDING or PROSES)
  const activeTicketCount = await prisma.ticket.count({
    where: {
      OR: [
        { creatorId: targetUserId },
        { padalId: targetUserId },
      ],
      status: { in: ['PENDING', 'PROSES'] },
    },
  });

  if (activeTicketCount > 0 && !forceDelete) {
    throw new AppError(400, 'HAS_ACTIVE_TICKETS', `User memiliki ${activeTicketCount} tiket aktif`, {
      activeTicketCount,
      requiresConfirmation: true,
    });
  }

  // Perform soft delete
  await prisma.user.update({
    where: { id: targetUserId },
    data: { deletedAt: new Date() },
  });

  // Invalidate auth cache so user cannot make further authenticated requests
  invalidateCachedUser(targetUserId);

  // Get actor info for audit log
  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    select: { nama: true },
  });

  // Record audit log
  await auditService.log({
    eventType: 'USER_SOFT_DELETE',
    actorId,
    actorNama: actor?.nama ?? 'Unknown',
    targetEntityId: targetUserId,
    metadata: {
      targetNama: targetUser.nama,
      targetEmail: targetUser.email,
      activeTicketsAtDeletion: activeTicketCount,
    },
  });
}

/**
 * Check if a user has active tickets (PENDING or PROSES).
 *
 * Requirements: 11.9
 */
export async function checkActiveTickets(
  userId: string
): Promise<{ hasActiveTickets: boolean; activeTicketCount: number }> {
  const activeTicketCount = await prisma.ticket.count({
    where: {
      OR: [
        { creatorId: userId },
        { padalId: userId },
      ],
      status: { in: ['PENDING', 'PROSES'] },
    },
  });

  return {
    hasActiveTickets: activeTicketCount > 0,
    activeTicketCount,
  };
}

/**
 * Add a Teknisi to a Padal team.
 * Validates that the Teknisi is not already assigned to another team (409 CONFLICT).
 *
 * Requirements: 11.5, 11.6
 */
export async function addTeknisiToPadal(
  teknisiId: string,
  padalId: string,
  actorId: string
): Promise<void> {
  // Validate Teknisi exists and has TEKNISI role
  const teknisi = await prisma.user.findUnique({
    where: { id: teknisiId },
  });

  if (!teknisi || teknisi.role !== 'TEKNISI') {
    throw new AppError(400, 'BUSINESS_RULE_ERROR', 'User yang dipilih bukan Teknisi');
  }

  if (teknisi.deletedAt !== null) {
    throw new AppError(400, 'USER_INACTIVE', 'Teknisi sudah tidak aktif');
  }

  // CRITICAL: Teknisi can only belong to one team at a time
  if (teknisi.padalId !== null) {
    throw new AppError(
      409,
      'CONFLICT',
      'Teknisi ini sudah tergabung dalam tim Padal lain. Lepaskan dari tim saat ini sebelum menambahkan ke tim baru.'
    );
  }

  // Validate Padal exists and has PADAL role
  const padal = await prisma.user.findUnique({
    where: { id: padalId },
  });

  if (!padal || padal.role !== 'PADAL') {
    throw new AppError(400, 'BUSINESS_RULE_ERROR', 'Padal tidak ditemukan atau bukan Padal');
  }

  if (padal.deletedAt !== null) {
    throw new AppError(400, 'BUSINESS_RULE_ERROR', 'Padal tidak ditemukan atau tidak aktif');
  }

  // Create team association
  await prisma.user.update({
    where: { id: teknisiId },
    data: { padalId },
  });

  // Get actor info for audit log
  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    select: { nama: true },
  });

  // Record audit log
  await auditService.log({
    eventType: 'TEAM_ASSIGNMENT',
    actorId,
    actorNama: actor?.nama ?? 'Unknown',
    targetEntityId: teknisiId,
    metadata: {
      padalId,
      teknisiNama: teknisi.nama,
      padalNama: padal.nama,
    },
  });
}

/**
 * Remove a Teknisi from a Padal team.
 * Clears the padalId association.
 *
 * Requirements: 11.7
 */
export async function removeTeknisiFromPadal(
  teknisiId: string,
  padalId: string,
  actorId: string
): Promise<void> {
  // Validate Teknisi exists and is assigned to the specified Padal
  const teknisi = await prisma.user.findUnique({
    where: { id: teknisiId },
  });

  if (!teknisi || teknisi.role !== 'TEKNISI') {
    throw new AppError(400, 'BUSINESS_RULE_ERROR', 'User yang dipilih bukan Teknisi');
  }

  if (teknisi.padalId !== padalId) {
    throw new AppError(400, 'BUSINESS_RULE_ERROR', 'Teknisi tidak tergabung dalam tim Padal ini');
  }

  // Validate Padal exists
  const padal = await prisma.user.findUnique({
    where: { id: padalId },
    select: { id: true, nama: true, role: true },
  });

  if (!padal || padal.role !== 'PADAL') {
    throw new AppError(400, 'BUSINESS_RULE_ERROR', 'Padal tidak ditemukan');
  }

  // Clear team association
  await prisma.user.update({
    where: { id: teknisiId },
    data: { padalId: null },
  });

  // Get actor info for audit log
  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    select: { nama: true },
  });

  // Record audit log
  await auditService.log({
    eventType: 'TEAM_REMOVAL',
    actorId,
    actorNama: actor?.nama ?? 'Unknown',
    targetEntityId: teknisiId,
    metadata: {
      padalId,
      teknisiNama: teknisi.nama,
      padalNama: padal.nama,
    },
  });
}

/**
 * Get all Padal users with their associated Teknisi team members.
 *
 * Requirements: 11.8
 */
export async function getPadalTeams(): Promise<PadalTeam[]> {
  const padals = await prisma.user.findMany({
    where: {
      role: 'PADAL',
      deletedAt: null,
    },
    orderBy: { nama: 'asc' },
    select: {
      id: true,
      nama: true,
      email: true,
      teamMembers: {
        where: {
          role: 'TEKNISI',
          deletedAt: null,
        },
        select: {
          id: true,
          nama: true,
          email: true,
          nomorWhatsApp: true,
        },
        orderBy: { nama: 'asc' },
      },
    },
  });

  return padals;
}

/**
 * Get all Teknisi users that are not assigned to any Padal team (padalId === null).
 *
 * Requirements: 11.5 (for dropdown selection)
 */
export async function getAvailableTeknisi(): Promise<UserListItem[]> {
  const teknisis = await prisma.user.findMany({
    where: {
      role: 'TEKNISI',
      padalId: null,
      deletedAt: null,
    },
    orderBy: { nama: 'asc' },
    select: {
      id: true,
      nama: true,
      email: true,
      nomorWhatsApp: true,
      role: true,
      divisi: true,
      deletedAt: true,
      createdAt: true,
    },
  });

  return teknisis;
}
