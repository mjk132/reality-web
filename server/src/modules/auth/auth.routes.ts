import { Router, Request, Response, NextFunction } from 'express';
import { authController } from './auth.controller';
import { authenticate } from '../../middleware/auth.guard';

const router = Router();

function wrap(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res).catch(next);
  };
}

router.get('/login', wrap(authController.loginRedirect));
router.get('/callback', wrap(authController.callback));
router.post('/demo-login', wrap(authController.demoLogin));

router.get('/me', authenticate, wrap(authController.getMe));
router.post('/refresh', authenticate, wrap(authController.refreshSession));
router.post('/logout', authenticate, wrap(authController.logout));

export default router;
