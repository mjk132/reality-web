import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { citizenService } from './citizen.service';
import { transferSchema } from './dto/citizen.dto';

function getUser(req: Request) {
  return (req as any).user;
}

export class CitizenController {
  async getProfile(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    if (!user) { res.status(401).json({ error: 'UNAUTHORIZED', message: 'Auth required' }); return; }

    // citizenid can come from JWT or query param
    const citizenid = (req.query.citizenid as string) || user.citizenid;

    if (!citizenid) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'citizenid is required — link your Discord to a FiveM character first',
      });
      return;
    }

    try {
      const profile = await citizenService.getProfile(citizenid);
      res.json(profile);
    } catch (error: any) {
      if (error.message === 'Player not found') {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Player not found in database' });
        return;
      }
      throw error;
    }
  }

  async transferFunds(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    if (!user) { res.status(401).json({ error: 'UNAUTHORIZED', message: 'Auth required' }); return; }

    const fromCitizenid = user.citizenid;
    if (!fromCitizenid) {
      res.status(400).json({
        error: 'LINK_REQUIRED',
        message: 'Your Discord account must be linked to a FiveM character',
      });
      return;
    }

    try {
      const { targetCitizenid, amount } = transferSchema.parse(req.body);

      const result = await citizenService.transferFunds(fromCitizenid, targetCitizenid, amount);
      res.json(result);
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Invalid transfer payload',
          details: error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
        });
        return;
      }
      if (error.message === 'Insufficient bank balance') {
        res.status(400).json({ error: 'INSUFFICIENT_FUNDS', message: 'Insufficient bank balance' });
        return;
      }
      if (error.message === 'Recipient not found' || error.message === 'Sender not found') {
        res.status(404).json({ error: 'PLAYER_NOT_FOUND', message: error.message });
        return;
      }
      if (error.message.includes('Cannot transfer')) {
        res.status(400).json({ error: 'INVALID_TRANSFER', message: error.message });
        return;
      }
      throw error;
    }
  }
}

export const citizenController = new CitizenController();
