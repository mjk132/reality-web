import { Request, Response } from 'express';
import { economyService } from './economy.service';

export class EconomyController {
  async getProperties(_req: Request, res: Response): Promise<void> {
    const properties = await economyService.getProperties();
    res.json(properties);
  }

  async getProperty(req: Request, res: Response): Promise<void> {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Invalid property ID' });
      return;
    }

    const property = await economyService.getProperty(id);
    if (!property) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Property not found' });
      return;
    }

    res.json(property);
  }

  async getStats(_req: Request, res: Response): Promise<void> {
    const stats = await economyService.getStats();
    res.json(stats);
  }
}

export const economyController = new EconomyController();
