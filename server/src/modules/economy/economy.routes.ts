import { Router, Request, Response, NextFunction } from 'express';
import { economyController } from './economy.controller';
import { authenticate } from '../../middleware/auth.guard';

const router = Router();

function wrap(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res).catch(next);
  };
}

router.use(authenticate);

router.get('/properties', wrap(economyController.getProperties));
router.get('/properties/:id', wrap(economyController.getProperty));
router.get('/stats', wrap(economyController.getStats));

export default router;
