import { PrismaClient } from '@prisma/client';
import { config } from '../../config';
import { encryptToken, decryptToken, generateSignature, verifySignature } from '../../common/utils/crypto';

const prisma = new PrismaClient();

const ENCRYPTION_KEY = config.tokenEncryption.key;
const SIGNING_SECRET = config.jwt.secret;

export interface LedgerEntry {
  id: number;
  title: string;
  content: string;
  isEncrypted: boolean;
  pinned: boolean;
  authorId: string;
  signature: string;
  createdAt: string;
  updatedAt: string;
}

export class ManagementService {
  // ─── Create Entry ──────────────────────────────────────────

  async createEntry(authorId: string, title: string, content: string): Promise<LedgerEntry> {
    // Encrypt content with AES-256-GCM before storage
    const encryptedContent = encryptToken(content, ENCRYPTION_KEY);

    // Create a data string for signing
    const signData = `${authorId}:${title}:${content}:${Date.now()}`;
    const signature = generateSignature(signData, SIGNING_SECRET);

    const entry = await prisma.managementLedger.create({
      data: {
        authorId,
        title,
        content: encryptedContent,
        signature,
        isEncrypted: true,
      },
    });

    return {
      id: entry.id,
      title: entry.title,
      content: '', // Content never sent back in list; use decrypt endpoint
      isEncrypted: entry.isEncrypted,
      pinned: entry.pinned,
      authorId: entry.authorId,
      signature: entry.signature,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    };
  }

  // ─── Read & Decrypt Entry ─────────────────────────────────

  async getEntry(id: number, requesterId: string): Promise<LedgerEntry | null> {
    const entry = await prisma.managementLedger.findUnique({ where: { id } });

    if (!entry) return null;

    // Decrypt content
    let decryptedContent = '';
    try {
      decryptedContent = decryptToken(entry.content, ENCRYPTION_KEY);
    } catch {
      decryptedContent = '[DECRYPTION FAILED — Data may be corrupted]';
    }

    // Verify signature
    const signData = `${entry.authorId}:${entry.title}:${decryptedContent}:${entry.createdAt.getTime()}`;
    const isValid = verifySignature(signData, entry.signature, SIGNING_SECRET);

    return {
      id: entry.id,
      title: entry.title,
      content: decryptedContent,
      isEncrypted: entry.isEncrypted,
      pinned: entry.pinned,
      authorId: entry.authorId,
      signature: isValid ? entry.signature : '[SIGNATURE MISMATCH — Tampered]',
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    };
  }

  // ─── List Entries ─────────────────────────────────────────

  async listEntries(includePinnedOnly = false): Promise<LedgerEntry[]> {
    const entries = await prisma.managementLedger.findMany({
      where: includePinnedOnly ? { pinned: true } : {},
      orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
    });

    return entries.map((entry) => ({
      id: entry.id,
      title: entry.title,
      content: '', // Content not sent — must call decrypt endpoint
      isEncrypted: entry.isEncrypted,
      pinned: entry.pinned,
      authorId: entry.authorId,
      signature: entry.signature,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    }));
  }

  // ─── Update Entry ─────────────────────────────────────────

  async updateEntry(
    id: number,
    authorId: string,
    data: { title?: string; content?: string; pinned?: boolean },
  ): Promise<LedgerEntry> {
    const updateData: any = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.pinned !== undefined) updateData.pinned = data.pinned;

    if (data.content !== undefined) {
      // Re-encrypt with new content
      updateData.content = encryptToken(data.content, ENCRYPTION_KEY);

      // Re-sign
      const signData = `${authorId}:${data.title || ''}:${data.content}:${Date.now()}`;
      updateData.signature = generateSignature(signData, SIGNING_SECRET);
    }

    const entry = await prisma.managementLedger.update({
      where: { id },
      data: updateData,
    });

    return {
      id: entry.id,
      title: entry.title,
      content: '',
      isEncrypted: entry.isEncrypted,
      pinned: entry.pinned,
      authorId: entry.authorId,
      signature: entry.signature,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    };
  }

  // ─── Delete Entry ─────────────────────────────────────────

  async deleteEntry(id: number): Promise<void> {
    await prisma.managementLedger.delete({ where: { id } });
  }

  // ─── Toggle Pin ───────────────────────────────────────────

  async togglePin(id: number): Promise<LedgerEntry> {
    const existing = await prisma.managementLedger.findUnique({ where: { id } });
    if (!existing) throw new Error('Entry not found');

    return this.updateEntry(id, existing.authorId, { pinned: !existing.pinned });
  }

  // ─── Verify All Signatures ────────────────────────────────

  async verifyIntegrity(): Promise<Array<{ id: number; valid: boolean; message: string }>> {
    const entries = await prisma.managementLedger.findMany();

    const results: Array<{ id: number; valid: boolean; message: string }> = [];

    for (const entry of entries) {
      try {
        const decrypted = decryptToken(entry.content, ENCRYPTION_KEY);
        const signData = `${entry.authorId}:${entry.title}:${decrypted}:${entry.createdAt.getTime()}`;
        const isValid = verifySignature(signData, entry.signature, SIGNING_SECRET);

        results.push({
          id: entry.id,
          valid: isValid,
          message: isValid
            ? 'Signature valid'
            : 'SIGNATURE MISMATCH — Entry may be tampered',
        });
      } catch {
        results.push({
          id: entry.id,
          valid: false,
          message: 'DECRYPTION FAILED — Entry may be corrupted',
        });
      }
    }

    return results;
  }
}

export const managementService = new ManagementService();
