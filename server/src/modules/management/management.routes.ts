import { Router, Request, Response, NextFunction } from 'express';
import { managementController } from './management.controller';
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
router.use(requireRole(Role.OWNER, Role.HIGH_MANAGEMENT));

router.get('/entries', wrap(managementController.listEntries));
router.get('/entries/:id', wrap(managementController.getEntry));
router.post('/entries', wrap(managementController.createEntry));
router.put('/entries/:id', wrap(managementController.updateEntry));
router.delete('/entries/:id', wrap(managementController.deleteEntry));
router.post('/entries/:id/toggle-pin', wrap(managementController.togglePin));
router.get('/verify', wrap(managementController.verifyIntegrity));

export default router;
