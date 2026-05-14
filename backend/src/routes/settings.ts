import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { systemLogo } from '../middleware/upload';
import { Role } from '@prisma/client';
import {
  getSettingsHandler,
  updateSettingsHandler,
  uploadLogoHandler,
  getLogoHandler,
} from '../controllers/settingsController';

const router = Router();

// GET /api/settings - authenticated, any role can read
router.get('/', authenticate, getSettingsHandler);

// GET /api/settings/logo - serve logo file (authenticated)
router.get('/logo', authenticate, getLogoHandler);

// PATCH /api/settings - Bidtekkom only, update appName
router.patch('/', authenticate, authorize(Role.BIDTEKKOM), updateSettingsHandler);

// POST /api/settings/logo - Bidtekkom only, upload logo
router.post(
  '/logo',
  authenticate,
  authorize(Role.BIDTEKKOM),
  systemLogo.single('logo'),
  uploadLogoHandler
);

export default router;
