import { PrismaClient } from '@prisma/client';
import { encryptToken, generateSignature } from '../../common/utils/crypto';
import { config } from '../../config';
import { SubmitAppealInput } from './dto/appeal.dto';

const prisma = new PrismaClient();

export class AppealService {
  /**
   * Submit a ban appeal with forced evidence.
   * If the player has an active ban record, this creates a BanAppeal
   * and automatically routes it to the ManagementLedger (encrypted).
   */
  async submitAppeal(
    discordId: string,
    citizenid: string,
    input: SubmitAppealInput,
  ): Promise<{ appeal: any; ledgerEntry?: any }> {
    // 1. Check if the player already has a pending appeal
    const existing = await prisma.banAppeal.findFirst({
      where: { citizenid, status: { in: ['PENDING', 'UNDER_REVIEW'] } },
    });

    if (existing) {
      throw new Error('You already have a pending appeal');
    }

    // 2. Create the appeal
    const appeal = await prisma.banAppeal.create({
      data: {
        citizenid,
        discordId,
        banReason: 'Anti-Cheat / Staff Action',
        banAdmin: 'System',
        banDuration: 'Permanent',
        videoUrl: input.videoUrl,
        statement: input.statement,
        status: 'PENDING',
      },
    });

    // 3. Route to ManagementLedger (encrypted)
    const ledgerContent = JSON.stringify({
      type: 'BAN_APPEAL',
      appealId: appeal.id,
      citizenid,
      discordId,
      videoUrl: input.videoUrl,
      statement: input.statement,
      submittedAt: appeal.createdAt.toISOString(),
    });

    const encrypted = encryptToken(ledgerContent, config.tokenEncryption.key);
    const signature = generateSignature(ledgerContent, config.tokenEncryption.key);

    const ledgerEntry = await prisma.managementLedger.create({
      data: {
        authorId: discordId,
        title: `Ban Appeal — ${citizenid}`,
        content: encrypted,
        signature,
        isEncrypted: true,
      },
    });

    return { appeal, ledgerEntry };
  }

  async getAppealStatus(citizenid: string) {
    return prisma.banAppeal.findFirst({
      where: { citizenid },
      orderBy: { createdAt: 'desc' },
    });
  }

  async reviewAppeal(appealId: number, reviewerDiscordId: string, status: string) {
    return prisma.banAppeal.update({
      where: { id: appealId },
      data: {
        status: status as any,
        reviewedBy: reviewerDiscordId,
        reviewedAt: new Date(),
      },
    });
  }

  async listAppeals(status?: string) {
    const where = status ? { status: status as any } : {};
    return prisma.banAppeal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const appealService = new AppealService();
