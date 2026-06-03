import { Router, Request, Response, NextFunction } from 'express';
import { rbacController } from './rbac.controller';
import { authenticate } from '../../middleware/auth.guard';
import { requireRole } from '../../middleware/rbac.guard';
import { Role } from '../../common/enums/role.enum';

const router = Router();

function wrap(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res).catch(next);
  };
}

router.use(authenticate);

// ─── Self-service ─────────────────────────────────────────

router.get('/profile', wrap(rbacController.getProfile));
router.get('/effective-role', wrap(rbacController.getEffectiveRole));
router.post('/sync', wrap(rbacController.syncRoles));

// ─── OWNER-only: Manual Role Override ─────────────────────
//
// PATCH /api/rbac/override
// Payload: { targetDiscordId, assignedRole, customPermissions[] }
// Zod-validated to prevent privilege escalation.
//
router.patch('/override',
  requireRole(Role.OWNER),
  wrap(rbacController.overrideRole),
);

// ─── High-Management: Role/Permission Management ──────────

router.post('/assign',
  requireRole(Role.OWNER, Role.HIGH_MANAGEMENT),
  wrap(rbacController.assignRole),
);

router.post('/permissions/add',
  requireRole(Role.OWNER, Role.HIGH_MANAGEMENT),
  wrap(rbacController.addPermissions),
);

router.post('/permissions/remove',
  requireRole(Role.OWNER, Role.HIGH_MANAGEMENT),
  wrap(rbacController.removePermissions),
);

router.get('/users',
  requireRole(Role.OWNER, Role.HIGH_MANAGEMENT, Role.DEV_DIRECTOR),
  wrap(rbacController.getAllUsers),
);

export default router;
