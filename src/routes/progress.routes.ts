import { Router } from 'express';
import ProgressController from '../controllers/ProgressController';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/:userId/progress', ProgressController.getProgress);

export default router;
