import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { mdtService } from './mdt.service';
import {
  createCaseSchema,
  updateCaseSchema,
  issueWarrantSchema,
  searchSchema,
} from './dto/mdt.dto';

function getUser(req: Request) {
  return (req as any).user;
}

function getEffective(req: Request) {
  return (req as any).effectiveRole;
}

export class MdtController {
  // ─── Search ──────────────────────────────────────────────

  async search(req: Request, res: Response): Promise<void> {
    try {
      const { query, type } = searchSchema.parse({
        query: req.query.query as string,
        type: req.query.type as string,
      });

      switch (type) {
        case 'citizenid': {
          const result = await mdtService.searchByCitizenid(query);
          if (!result) { res.status(404).json({ error: 'NOT_FOUND', message: 'No citizen found' }); return; }
          res.json(result);
          return;
        }
        case 'name': {
          const results = await mdtService.searchByName(query);
          res.json(results);
          return;
        }
        case 'plate': {
          const result = await mdtService.searchByPlate(query);
          if (!result) { res.status(404).json({ error: 'NOT_FOUND', message: 'No vehicle found' }); return; }
          res.json(result);
          return;
        }
        default:
          res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Invalid search type' });
      }
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Invalid search parameters', details: error.errors });
        return;
      }
      throw error;
    }
  }

  // ─── Cases ───────────────────────────────────────────────

  async createCase(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    if (!user) { res.status(401).json({ error: 'UNAUTHORIZED', message: 'Auth required' }); return; }

    try {
      const input = createCaseSchema.parse(req.body);
      const report = await mdtService.createCase(user.discordId, user.username || 'Officer', input);
      res.status(201).json(report);
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Invalid case data', details: error.errors });
        return;
      }
      throw error;
    }
  }

  async getCase(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const report = await mdtService.getCase(id);
    if (!report) { res.status(404).json({ error: 'NOT_FOUND', message: 'Case not found' }); return; }
    res.json(report);
  }

  async listCases(req: Request, res: Response): Promise<void> {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await mdtService.listCases(page, limit);
    res.json(result);
  }

  async updateCase(req: Request, res: Response): Promise<void> {
    try {
      const input = updateCaseSchema.parse(req.body);
      const report = await mdtService.updateCase(req.params.id as string, input);
      res.json(report);
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Invalid update data', details: error.errors });
        return;
      }
      throw error;
    }
  }

  async deleteCase(req: Request, res: Response): Promise<void> {
    try {
      await mdtService.deleteCase(req.params.id as string);
      res.json({ message: 'Case deleted' });
    } catch (error: any) {
      if (error.message?.includes('Record to delete does not exist')) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Case not found' });
        return;
      }
      throw error;
    }
  }

  // ─── Warrants ────────────────────────────────────────────

  async issueWarrant(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    if (!user) { res.status(401).json({ error: 'UNAUTHORIZED', message: 'Auth required' }); return; }

    try {
      const input = issueWarrantSchema.parse(req.body);
      const warrant = await mdtService.issueWarrant(
        user.discordId,
        user.username || 'Officer',
        input,
      );
      res.status(201).json(warrant);
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Invalid warrant data', details: error.errors });
        return;
      }
      throw error;
    }
  }

  async listActiveWarrants(_req: Request, res: Response): Promise<void> {
    const warrants = await mdtService.listActiveWarrants();
    res.json(warrants);
  }

  async revokeWarrant(req: Request, res: Response): Promise<void> {
    try {
      const warrant = await mdtService.revokeWarrant(req.params.id as string);
      res.json(warrant);
    } catch {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Warrant not found' });
    }
  }

  async executeWarrant(req: Request, res: Response): Promise<void> {
    try {
      const warrant = await mdtService.executeWarrant(req.params.id as string);
      res.json(warrant);
    } catch {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Warrant not found' });
    }
  }
}

export const mdtController = new MdtController();
