import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { citizenController } from './citizen.controller';
import { authenticate } from '../../middleware/auth.guard';

const router = Router();

function wrap(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res).catch(next);
  };
}

const transferLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'RATE_LIMITED',
    message: 'Too many transfer attempts — please slow down',
  },
});

router.use(authenticate);

router.get('/profile', wrap(citizenController.getProfile));
router.post('/transfer', transferLimiter, wrap(citizenController.transferFunds));

export default router;
