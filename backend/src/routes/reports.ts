import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { Role } from '@prisma/client';
import {
  getMonthlyReportHandler,
  getMonthlyReportPDFHandler,
  getMonthlyReportExcelHandler,
} from '../controllers/reportController';

const router = Router();

// All report routes require authentication + BIDTEKKOM or PADAL role
// GET /api/reports/monthly - JSON report data
router.get('/monthly', authenticate, authorize(Role.BIDTEKKOM, Role.PADAL), getMonthlyReportHandler);

// GET /api/reports/monthly/pdf - Download PDF report
router.get('/monthly/pdf', authenticate, authorize(Role.BIDTEKKOM, Role.PADAL), getMonthlyReportPDFHandler);

// GET /api/reports/monthly/excel - Download Excel report
router.get('/monthly/excel', authenticate, authorize(Role.BIDTEKKOM, Role.PADAL), getMonthlyReportExcelHandler);

export default router;
