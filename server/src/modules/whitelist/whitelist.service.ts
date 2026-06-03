import { PrismaClient } from '@prisma/client';
import { config } from '../../config';

const prisma = new PrismaClient();

export const PASS_THRESHOLD = 0.8; // 80% to pass (e.g., 8/10)
export const COOLDOWN_HOURS = 24;
export const MAX_QUESTIONS = 10;

export interface TestSession {
  testId: number;
  questions: Array<{
    id: number;
    question: string;
    options: string[];
  }>;
  totalQuestions: number;
}

export interface TestResult {
  passed: boolean;
  score: number;
  total: number;
  percentage: number;
  cooldownUntil: string | null;
  discordRoleAssigned: boolean;
  licenseActivated: boolean;
}

export interface CooldownStatus {
  isOnCooldown: boolean;
  remainingSeconds: number;
  cooldownUntil: string | null;
  message: string | null;
}

export class WhitelistService {
  // ─── Question Management (Admin) ──────────────────────────

  async getQuestions(includeInactive = false): Promise<any[]> {
    return prisma.whitelistQuestion.findMany({
      where: includeInactive ? {} : { active: true },
      orderBy: { id: 'asc' },
    });
  }

  async createQuestion(data: {
    question: string;
    options: string[];
    correctIndex: number;
  }): Promise<any> {
    return prisma.whitelistQuestion.create({
      data: {
        question: data.question,
        options: JSON.stringify(data.options),
        correctIndex: data.correctIndex,
      },
    });
  }

  async updateQuestion(
    id: number,
    data: Partial<{
      question: string;
      options: string[];
      correctIndex: number;
      active: boolean;
    }>,
  ): Promise<any> {
    const updateData: any = {};
    if (data.question !== undefined) updateData.question = data.question;
    if (data.options !== undefined) updateData.options = JSON.stringify(data.options);
    if (data.correctIndex !== undefined) updateData.correctIndex = data.correctIndex;
    if (data.active !== undefined) updateData.active = data.active;

    return prisma.whitelistQuestion.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteQuestion(id: number): Promise<void> {
    await prisma.whitelistQuestion.update({
      where: { id },
      data: { active: false },
    });
  }

  // ─── Test Engine ──────────────────────────────────────────

  async startTest(discordId: string, citizenid: string): Promise<TestSession> {
    // Enforce cooldown check (server-side mandatory)
    const cooldown = await this.checkCooldown(discordId);
    if (cooldown.isOnCooldown) {
      throw new Error(`COOLDOWN_ACTIVE:${cooldown.remainingSeconds}`);
    }

    // Check for existing pending test
    const existingPending = await prisma.whitelistTest.findFirst({
      where: { discordId, status: 'PENDING' },
    });

    if (existingPending) {
      // Resume existing test — fetch the question set
      const questions = await this.getActiveQuestions();
      return {
        testId: existingPending.id,
        questions: questions.map((q) => ({
          id: q.id,
          question: q.question,
          options: JSON.parse(q.options),
        })),
        totalQuestions: questions.length,
      };
    }

    // Fetch random active questions
    const questions = await this.getActiveQuestions(MAX_QUESTIONS);

    if (questions.length < 1) {
      throw new Error('No active questions available');
    }

    // Create test record
    const test = await prisma.whitelistTest.create({
      data: {
        citizenid,
        discordId,
        status: 'PENDING',
      },
    });

    return {
      testId: test.id,
      questions: questions.map((q) => ({
        id: q.id,
        question: q.question,
        options: JSON.parse(q.options),
      })),
      totalQuestions: questions.length,
    };
  }

  async submitTest(
    discordId: string,
    testId: number,
    answers: number[],
  ): Promise<TestResult> {
    // Verify test belongs to user and is pending
    const test = await prisma.whitelistTest.findFirst({
      where: { id: testId, discordId, status: 'PENDING' },
    });

    if (!test) {
      throw new Error('Test not found or already completed');
    }

    // Fetch correct answers
    const questions = await this.getActiveQuestions();
    const total = questions.length;

    if (answers.length !== total) {
      throw new Error(`Must answer all ${total} questions`);
    }

    // Calculate score
    let correct = 0;
    for (let i = 0; i < questions.length; i++) {
      if (answers[i] === questions[i].correctIndex) {
        correct++;
      }
    }

    const percentage = total > 0 ? correct / total : 0;
    const passed = percentage >= PASS_THRESHOLD;

    const now = new Date();

    if (passed) {
      // ── PASSED ──────────────────────────────────────────────
      await prisma.whitelistTest.update({
        where: { id: testId },
        data: {
          status: 'PASSED',
          score: correct,
          passedAt: now,
        },
      });

      // Activate license in qb-core player record
      await this.activatePlayerLicense(test.citizenid);

      // Assign Discord "Citizen" role via Bot API
      const roleAssigned = await this.assignDiscordCitizenRole(discordId);

      return {
        passed: true,
        score: correct,
        total,
        percentage: Math.round(percentage * 100),
        cooldownUntil: null,
        discordRoleAssigned: roleAssigned,
        licenseActivated: true,
      };
    } else {
      // ── FAILED ──────────────────────────────────────────────
      const cooldownUntil = new Date(now.getTime() + COOLDOWN_HOURS * 60 * 60 * 1000);

      await prisma.whitelistTest.update({
        where: { id: testId },
        data: {
          status: 'FAILED',
          score: correct,
          cooldownUntil,
        },
      });

      return {
        passed: false,
        score: correct,
        total,
        percentage: Math.round(percentage * 100),
        cooldownUntil: cooldownUntil.toISOString(),
        discordRoleAssigned: false,
        licenseActivated: false,
      };
    }
  }

  // ─── Cooldown Enforcement ────────────────────────────────

  async checkCooldown(discordId: string): Promise<CooldownStatus> {
    const latestTest = await prisma.whitelistTest.findFirst({
      where: { discordId, status: 'FAILED' },
      orderBy: { createdAt: 'desc' },
      select: { cooldownUntil: true },
    });

    if (!latestTest || !latestTest.cooldownUntil) {
      return {
        isOnCooldown: false,
        remainingSeconds: 0,
        cooldownUntil: null,
        message: null,
      };
    }

    const now = new Date();
    const cooldownEnd = new Date(latestTest.cooldownUntil);

    if (now >= cooldownEnd) {
      return {
        isOnCooldown: false,
        remainingSeconds: 0,
        cooldownUntil: null,
        message: null,
      };
    }

    const remainingMs = cooldownEnd.getTime() - now.getTime();
    const remainingSeconds = Math.ceil(remainingMs / 1000);

    return {
      isOnCooldown: true,
      remainingSeconds,
      cooldownUntil: cooldownEnd.toISOString(),
      message: `Cooldown active — ${this.formatDuration(remainingSeconds)} remaining`,
    };
  }

  async getTestHistory(discordId: string): Promise<any[]> {
    return prisma.whitelistTest.findMany({
      where: { discordId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  // ─── Private Helpers ─────────────────────────────────────

  private async getActiveQuestions(limit?: number): Promise<any[]> {
    const query: any = {
      where: { active: true },
      orderBy: { id: 'asc' },
    };
    if (limit) query.take = limit;
    return prisma.whitelistQuestion.findMany(query);
  }

  private async activatePlayerLicense(citizenid: string): Promise<void> {
    // Update qb-core players table to mark as whitelisted
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE players SET whitelist = 1 WHERE citizenid = ?`,
        [citizenid],
      );
    } catch (error) {
      console.error(`[Whitelist] License activation failed for ${citizenid}:`, error);
    }
  }

  private async assignDiscordCitizenRole(discordId: string): Promise<boolean> {
    try {
      const botToken = config.discord.botToken;
      const guildId = config.discord.guildId;

      if (!botToken || !guildId) {
        console.warn('[Whitelist] Discord bot not configured — skipping role assignment');
        return false;
      }

      // Fetch Discord guild roles to find the "Citizen" role
      const rolesResponse = await fetch(
        `https://discord.com/api/guilds/${guildId}/roles`,
        { headers: { Authorization: `Bot ${botToken}` } },
      );

      if (!rolesResponse.ok) {
        console.error('[Whitelist] Failed to fetch guild roles');
        return false;
      }

      const roles = await rolesResponse.json() as Array<{
        id: string;
        name: string;
        permissions: string;
      }>;

      const citizenRole = roles.find(
        (r) => r.name.toLowerCase() === 'citizen',
      );

      if (!citizenRole) {
        console.error('[Whitelist] Citizen role not found in Discord guild');
        return false;
      }

      // Assign role to member
      const assignResponse = await fetch(
        `https://discord.com/api/guilds/${guildId}/members/${discordId}/roles/${citizenRole.id}`,
        {
          method: 'PUT',
          headers: { Authorization: `Bot ${botToken}` },
        },
      );

      if (!assignResponse.ok) {
        console.error(`[Whitelist] Role assignment failed: ${assignResponse.status}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[Whitelist] Discord role assignment error:', error);
      return false;
    }
  }

  private formatDuration(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);

    return parts.join(' ');
  }
}

export const whitelistService = new WhitelistService();
