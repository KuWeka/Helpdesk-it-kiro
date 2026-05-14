import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { Role } from '@prisma/client';
import { getAuditLogsHandler } from '../controllers/auditController';

const router = Router();

// GET /api/audit - Bidtekkom only, paginated audit logs with search/filter
router.get('/', authenticate, authorize(Role.BIDTEKKOM), getAuditLogsHandler);

export default router;
