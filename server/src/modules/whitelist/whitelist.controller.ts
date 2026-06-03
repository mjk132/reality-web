import { Request, Response } from 'express';
import { whitelistService, CooldownStatus } from './whitelist.service';

function getUser(req: Request) {
  return (req as any).user;
}

export class WhitelistController {
  // ─── Admin: Question Management ──────────────────────────

  async getQuestions(req: Request, res: Response): Promise<void> {
    const includeInactive = req.query.all === 'true';
    const questions = await whitelistService.getQuestions(includeInactive);
    res.json(questions);
  }

  async createQuestion(req: Request, res: Response): Promise<void> {
    const { question, options, correctIndex } = req.body;

    if (correctIndex < 0 || correctIndex >= options.length) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'correctIndex must be within options array bounds',
      });
      return;
    }

    const created = await whitelistService.createQuestion({
      question,
      options,
      correctIndex,
    });

    const parsed = {
      ...created,
      options: JSON.parse(created.options),
    };

    res.status(201).json(parsed);
  }

  async updateQuestion(req: Request, res: Response): Promise<void> {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Invalid question ID' });
      return;
    }

    const updated = await whitelistService.updateQuestion(id, req.body);

    res.json({
      ...updated,
      options: JSON.parse(updated.options),
    });
  }

  async deleteQuestion(req: Request, res: Response): Promise<void> {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Invalid question ID' });
      return;
    }

    await whitelistService.deleteQuestion(id);
    res.json({ message: 'Question deactivated' });
  }

  // ─── Player: Test Flow ───────────────────────────────────

  async startTest(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    if (!user) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Auth required' });
      return;
    }

    const { citizenid } = req.body as { citizenid?: string };
    if (!citizenid) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'citizenid is required',
      });
      return;
    }

    try {
      const session = await whitelistService.startTest(user.discordId, citizenid);
      res.json(session);
    } catch (error: any) {
      if (error.message?.startsWith('COOLDOWN_ACTIVE:')) {
        const seconds = parseInt(error.message.split(':')[1], 10);
        res.status(429).json({
          error: 'COOLDOWN_ACTIVE',
          message: 'Cooldown active',
          remainingSeconds: seconds,
        });
        return;
      }
      if (error.message === 'No active questions available') {
        res.status(503).json({
          error: 'NO_QUESTIONS',
          message: 'No active questions available — contact staff',
        });
        return;
      }
      throw error;
    }
  }

  async submitTest(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    if (!user) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Auth required' });
      return;
    }

    const testId = parseInt(String(req.params.testId), 10);
    if (isNaN(testId)) {
      res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Invalid test ID' });
      return;
    }

    const { answers } = req.body as { answers?: number[] };
    if (!answers || !Array.isArray(answers)) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'answers array is required',
      });
      return;
    }

    const result = await whitelistService.submitTest(user.discordId, testId, answers);
    res.json(result);
  }

  async checkCooldown(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    if (!user) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Auth required' });
      return;
    }

    const status: CooldownStatus = await whitelistService.checkCooldown(user.discordId);
    res.json(status);
  }

  async getHistory(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    if (!user) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Auth required' });
      return;
    }

    const history = await whitelistService.getTestHistory(user.discordId);
    res.json(history);
  }
}

export const whitelistController = new WhitelistController();
