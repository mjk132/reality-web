import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { mdtController } from './mdt.controller';
import { authenticate } from '../../middleware/auth.guard';
import { requireMinimumRole } from '../../middleware/rbac.guard';
import { requirePoliceJob, requireDirectorOrHigher } from '../../middleware/mdt.guard';
import { Role } from '../../common/enums/role.enum';

const router = Router();

function wrap(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res).catch(next);
  };
}

const mdtLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'RATE_LIMITED', message: 'Too many MDT requests' },
});

router.use(authenticate);
router.use(requirePoliceJob());
router.use(mdtLimiter);

// Search
router.get('/search', wrap(mdtController.search));

// Cases (any officer can create/read, only Director+ can edit/delete)
router.post('/cases', wrap(mdtController.createCase));
router.get('/cases', wrap(mdtController.listCases));
router.get('/cases/:id', wrap(mdtController.getCase));
router.patch('/cases/:id', requireDirectorOrHigher, wrap(mdtController.updateCase));
router.delete('/cases/:id', requireDirectorOrHigher, wrap(mdtController.deleteCase));

// Warrants
router.post('/warrants', wrap(mdtController.issueWarrant));
router.get('/warrants', wrap(mdtController.listActiveWarrants));
router.patch('/warrants/:id/revoke', requireMinimumRole(Role.STAFF), wrap(mdtController.revokeWarrant));
router.patch('/warrants/:id/execute', wrap(mdtController.executeWarrant));

export default router;
