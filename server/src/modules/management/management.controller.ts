import { Request, Response } from 'express';
import { managementService } from './management.service';

function getUser(req: Request) {
  return (req as any).user;
}

export class ManagementController {
  async createEntry(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    if (!user) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Auth required' });
      return;
    }

    const { title, content } = req.body as { title?: string; content?: string };

    if (!title || !content) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'title and content are required',
      });
      return;
    }

    const entry = await managementService.createEntry(user.discordId, title, content);
    res.status(201).json(entry);
  }

  async getEntry(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    if (!user) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Auth required' });
      return;
    }

    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Invalid entry ID' });
      return;
    }

    const entry = await managementService.getEntry(id, user.discordId);

    if (!entry) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Entry not found' });
      return;
    }

    res.json(entry);
  }

  async listEntries(req: Request, res: Response): Promise<void> {
    const pinnedOnly = req.query.pinned === 'true';
    const entries = await managementService.listEntries(pinnedOnly);
    res.json(entries);
  }

  async updateEntry(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    if (!user) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Auth required' });
      return;
    }

    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Invalid entry ID' });
      return;
    }

    const entry = await managementService.updateEntry(id, user.discordId, req.body);
    res.json(entry);
  }

  async deleteEntry(req: Request, res: Response): Promise<void> {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Invalid entry ID' });
      return;
    }

    await managementService.deleteEntry(id);
    res.json({ message: 'Entry deleted' });
  }

  async togglePin(req: Request, res: Response): Promise<void> {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Invalid entry ID' });
      return;
    }

    const entry = await managementService.togglePin(id);
    res.json(entry);
  }

  async verifyIntegrity(req: Request, res: Response): Promise<void> {
    const results = await managementService.verifyIntegrity();
    res.json(results);
  }
}

export const managementController = new ManagementController();
