import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { appealService } from './appeal.service';
import { submitAppealSchema, reviewAppealSchema } from './dto/appeal.dto';

function getUser(req: Request) {
  return (req as any).user;
}

export class AppealController {
  /**
   * Submit a ban appeal.
   * Only accessible to players who can see the /appeal page
   * (gated by ban check in the frontend).
   */
  async submitAppeal(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    if (!user) { res.status(401).json({ error: 'UNAUTHORIZED', message: 'Auth required' }); return; }

    const citizenid = user.citizenid;
    if (!citizenid) {
      res.status(400).json({ error: 'LINK_REQUIRED', message: 'Character must be linked' });
      return;
    }

    try {
      const input = submitAppealSchema.parse(req.body);
      const result = await appealService.submitAppeal(user.discordId, citizenid, input);
      res.status(201).json({
        message: 'Appeal submitted and routed to High-Management',
        appealId: result.appeal.id,
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'A valid video URL (YouTube/Medal) and a statement (50+ chars) are required',
          details: error.errors,
        });
        return;
      }
      if (error.message === 'You already have a pending appeal') {
        res.status(409).json({ error: 'DUPLICATE', message: error.message });
        return;
      }
      throw error;
    }
  }

  async getAppealStatus(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    if (!user?.citizenid) { res.status(401).json({ error: 'UNAUTHORIZED', message: 'Auth required' }); return; }

    const appeal = await appealService.getAppealStatus(user.citizenid);
    if (!appeal) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'No appeal found' });
      return;
    }
    res.json(appeal);
  }

  async listAppeals(req: Request, res: Response): Promise<void> {
    const status = req.query.status as string | undefined;
    const appeals = await appealService.listAppeals(status);
    res.json(appeals);
  }

  async reviewAppeal(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    if (!user) { res.status(401).json({ error: 'UNAUTHORIZED', message: 'Auth required' }); return; }

    try {
      const { status } = reviewAppealSchema.parse(req.body);
      const appeal = await appealService.reviewAppeal(
        parseInt(req.params.id as string, 10),
        user.discordId,
        status,
      );
      res.json(appeal);
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Invalid review data', details: error.errors });
        return;
      }
      throw error;
    }
  }
}

export const appealController = new AppealController();
