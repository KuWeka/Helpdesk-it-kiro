import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import {
  listUsers,
  changeRole,
  resetPassword,
  softDelete,
  getPadalTeams,
  addTeknisiToPadal,
  removeTeknisiFromPadal,
  getAvailableTeknisi,
} from '../controllers/staffController';

const router = Router();

// All staff routes require authentication + BIDTEKKOM role
const bidtekkomOnly = [authenticate, authorize(Role.BIDTEKKOM)];

// --- User Management ---

// GET /api/staff/users - List all users (paginated, filterable)
router.get('/users', ...bidtekkomOnly, listUsers);

// PATCH /api/staff/users/:id/role - Change user role
router.patch('/users/:id/role', ...bidtekkomOnly, changeRole);

// POST /api/staff/users/:id/reset-password - Reset user password
router.post('/users/:id/reset-password', ...bidtekkomOnly, resetPassword);

// DELETE /api/staff/users/:id - Soft delete user
router.delete('/users/:id', ...bidtekkomOnly, softDelete);

// --- Team Management ---

// GET /api/staff/teams - Get all Padal teams with members
router.get('/teams', ...bidtekkomOnly, getPadalTeams);

// POST /api/staff/teams/:padalId/members - Add Teknisi to Padal team
router.post('/teams/:padalId/members', ...bidtekkomOnly, addTeknisiToPadal);

// DELETE /api/staff/teams/:padalId/members/:teknisiId - Remove Teknisi from team
router.delete('/teams/:padalId/members/:teknisiId', ...bidtekkomOnly, removeTeknisiFromPadal);

// --- Available Teknisi ---

// GET /api/staff/available-teknisi - Get unassigned Teknisi
router.get('/available-teknisi', ...bidtekkomOnly, getAvailableTeknisi);

export default router;
