import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { garageService } from './garage.service';
import { listForSaleSchema, buyVehicleSchema, cancelListingSchema } from './dto/garage.dto';

function getUser(req: Request) {
  return (req as any).user;
}

export class GarageController {
  async getVehicles(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    if (!user) { res.status(401).json({ error: 'UNAUTHORIZED', message: 'Auth required' }); return; }

    const citizenid = user.citizenid || (req.query.citizenid as string);
    if (!citizenid) {
      res.status(400).json({ error: 'LINK_REQUIRED', message: 'Link your Discord to a FiveM character' });
      return;
    }

    const vehicles = await garageService.getVehicles(citizenid);
    res.json(vehicles);
  }

  async listForSale(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    if (!user) { res.status(401).json({ error: 'UNAUTHORIZED', message: 'Auth required' }); return; }

    const citizenid = user.citizenid;
    if (!citizenid) {
      res.status(400).json({ error: 'LINK_REQUIRED', message: 'Link your Discord to a FiveM character' });
      return;
    }

    try {
      const { plate, price } = listForSaleSchema.parse(req.body);
      await garageService.listForSale(citizenid, plate, price);
      res.json({ message: 'Vehicle listed for sale', plate, price });
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Invalid listing payload',
          details: error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
        });
        return;
      }
      if (error.message.includes('not found') || error.message.includes('belong')) {
        res.status(400).json({ error: 'INVALID_REQUEST', message: error.message });
        return;
      }
      throw error;
    }
  }

  async buyVehicle(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    if (!user) { res.status(401).json({ error: 'UNAUTHORIZED', message: 'Auth required' }); return; }

    const buyerCitizenid = user.citizenid;
    if (!buyerCitizenid) {
      res.status(400).json({ error: 'LINK_REQUIRED', message: 'Link your Discord to a FiveM character' });
      return;
    }

    try {
      const { plate } = buyVehicleSchema.parse(req.body);
      await garageService.buyVehicle(buyerCitizenid, plate);
      res.json({ message: 'Vehicle purchased successfully', plate });
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Invalid purchase payload',
          details: error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
        });
        return;
      }
      if (error.message.includes('not listed') || error.message.includes('own vehicle')) {
        res.status(400).json({ error: 'PURCHASE_FAILED', message: error.message });
        return;
      }
      if (error.message === 'Insufficient funds') {
        res.status(400).json({ error: 'INSUFFICIENT_FUNDS', message: 'Insufficient bank balance' });
        return;
      }
      throw error;
    }
  }

  async getMarketplace(_req: Request, res: Response): Promise<void> {
    const listings = await garageService.getMarketplace();
    res.json(listings);
  }

  async cancelListing(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    if (!user) { res.status(401).json({ error: 'UNAUTHORIZED', message: 'Auth required' }); return; }

    const citizenid = user.citizenid;
    if (!citizenid) {
      res.status(400).json({ error: 'LINK_REQUIRED', message: 'Link your Discord to a FiveM character' });
      return;
    }

    try {
      const { plate } = cancelListingSchema.parse(req.body);
      await garageService.cancelListing(citizenid, plate);
      res.json({ message: 'Listing cancelled', plate });
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Invalid payload',
          details: error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
        });
        return;
      }
      if (error.message === 'Listing not found' || error.message === 'Not your listing') {
        res.status(400).json({ error: 'INVALID_REQUEST', message: error.message });
        return;
      }
      throw error;
    }
  }
}

export const garageController = new GarageController();
