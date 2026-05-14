import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { Role } from '@prisma/client';
import {
  getSatkerDashboardHandler,
  getBidtekkomDashboardHandler,
  getPadalDashboardHandler,
  getTeknisiDashboardHandler,
} from '../controllers/dashboardController';

const router = Router();

// GET /api/dashboard/satker - Satker only
router.get('/satker', authenticate, authorize(Role.SATKER), getSatkerDashboardHandler);

// GET /api/dashboard/bidtekkom - Bidtekkom only
router.get('/bidtekkom', authenticate, authorize(Role.BIDTEKKOM), getBidtekkomDashboardHandler);

// GET /api/dashboard/padal - Padal only
router.get('/padal', authenticate, authorize(Role.PADAL), getPadalDashboardHandler);

// GET /api/dashboard/teknisi - Teknisi only
router.get('/teknisi', authenticate, authorize(Role.TEKNISI), getTeknisiDashboardHandler);

export default router;
