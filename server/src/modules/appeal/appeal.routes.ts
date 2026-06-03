import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { appealController } from './appeal.controller';
import { authenticate } from '../../middleware/auth.guard';
import { requireMinimumRole } from '../../middleware/rbac.guard';
import { Role } from '../../common/enums/role.enum';

const router = Router();

function wrap(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res).catch(next);
  };
}

const appealLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,                    // max 3 appeals per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'RATE_LIMITED', message: 'Too many appeal attempts' },
});

router.use(authenticate);

// Player-facing
router.post('/submit', appealLimiter, wrap(appealController.submitAppeal));
router.get('/status', wrap(appealController.getAppealStatus));

// High-Management review
router.get('/list', requireMinimumRole(Role.HIGH_MANAGEMENT), wrap(appealController.listAppeals));
router.patch('/:id/review', requireMinimumRole(Role.HIGH_MANAGEMENT), wrap(appealController.reviewAppeal));

export default router;
