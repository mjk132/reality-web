import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { garageController } from './garage.controller';
import { authenticate } from '../../middleware/auth.guard';

const router = Router();

function wrap(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res).catch(next);
  };
}

const marketplaceLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'RATE_LIMITED', message: 'Too many marketplace operations' },
});

router.use(authenticate);

router.get('/vehicles', wrap(garageController.getVehicles));
router.get('/marketplace', wrap(garageController.getMarketplace));
router.post('/list', marketplaceLimiter, wrap(garageController.listForSale));
router.post('/buy', marketplaceLimiter, wrap(garageController.buyVehicle));
router.post('/cancel-listing', marketplaceLimiter, wrap(garageController.cancelListing));

export default router;
