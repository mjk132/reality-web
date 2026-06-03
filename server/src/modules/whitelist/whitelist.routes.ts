import { Router, Request, Response, NextFunction } from 'express';
import { whitelistController } from './whitelist.controller';
import { authenticate } from '../../middleware/auth.guard';
import { requireRole } from '../../middleware/rbac.guard';
import { Role } from '../../common/enums/role.enum';

const router = Router();

function wrap(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res).catch(next);
  };
}

// ─── Admin Routes (High-Management) ──────────────────────────

router.get('/questions',
  authenticate,
  requireRole(Role.OWNER, Role.HIGH_MANAGEMENT, Role.DEV_DIRECTOR, Role.DIRECTOR, Role.ORGANIZER, Role.STAFF),
  wrap(whitelistController.getQuestions),
);

router.post('/questions',
  authenticate,
  requireRole(Role.OWNER, Role.HIGH_MANAGEMENT),
  wrap(whitelistController.createQuestion),
);

router.put('/questions/:id',
  authenticate,
  requireRole(Role.OWNER, Role.HIGH_MANAGEMENT),
  wrap(whitelistController.updateQuestion),
);

router.delete('/questions/:id',
  authenticate,
  requireRole(Role.OWNER, Role.HIGH_MANAGEMENT),
  wrap(whitelistController.deleteQuestion),
);

// ─── Player Routes (Authenticated) ───────────────────────────

router.post('/start',
  authenticate,
  wrap(whitelistController.startTest),
);

router.post('/submit/:testId',
  authenticate,
  wrap(whitelistController.submitTest),
);

router.get('/cooldown',
  authenticate,
  wrap(whitelistController.checkCooldown),
);

router.get('/history',
  authenticate,
  wrap(whitelistController.getHistory),
);

export default router;
