import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { profilePhoto } from '../middleware/upload';
import {
  getProfileHandler,
  updateProfileHandler,
  changePasswordHandler,
  uploadPhotoHandler,
  getPhotoHandler,
} from '../controllers/profileController';

const router = Router();

// GET /api/profile - get authenticated user's profile
router.get('/', authenticate, getProfileHandler);

// PATCH /api/profile - update profile (nama, nomorWhatsApp, divisi)
router.patch('/', authenticate, updateProfileHandler);

// PATCH /api/profile/password - change password
router.patch('/password', authenticate, changePasswordHandler);

// POST /api/profile/photo - upload profile photo
router.post('/photo', authenticate, profilePhoto.single('photo'), uploadPhotoHandler);

// GET /api/profile/photo/:userId - serve profile photo file
router.get('/photo/:userId', authenticate, getPhotoHandler);

export default router;
