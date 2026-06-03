import { PrismaClient } from '@prisma/client';
import { getPlayerByCitizenid, getVehiclesByCitizenid } from '../../common/utils/qbcore';
import { sendWarrantWebhook } from '../../common/utils/discord-webhook';
import { CreateCaseInput, UpdateCaseInput, IssueWarrantInput } from './dto/mdt.dto';

const prisma = new PrismaClient();

interface CitizenProfile {
  citizenid: string;
  cash: number;
  bank: number;
  charinfo: { firstname: string; lastname: string; birthdate: string; nationality: string; phone: string } | null;
  licenses: { driver: boolean; weapon: boolean } | null;
  job: { name: string; label: string; grade: number; gradeName: string } | null;
  vehicles: Array<{
    plate: string;
    vehicle: string;
    fuel: number;
    engine: number;
    body: number;
  }>;
  cases: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: Date;
  }>;
  warrants: Array<{
    id: string;
    reason: string;
    status: string;
    createdAt: Date;
  }>;
}

export class MdtService {
  // ─── Criminal Search ─────────────────────────────────────

  async searchByCitizenid(citizenid: string): Promise<CitizenProfile | null> {
    const player = await getPlayerByCitizenid(citizenid);
    if (!player) return null;

    const [vehicles, cases, warrants] = await Promise.all([
      getVehiclesByCitizenid(citizenid),
      prisma.incidentReport.findMany({
        where: { citizenid },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.warrant.findMany({
        where: { citizenid, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    let charinfo = null;
    try {
      const parsed = JSON.parse(player.charinfo);
      charinfo = {
        firstname: parsed.firstname || '',
        lastname: parsed.lastname || '',
        birthdate: parsed.birthdate || '',
        nationality: parsed.nationality || '',
        phone: parsed.phone || '',
      };
    } catch { /* ignore */ }

    let licenses = null;
    try {
      const parsed = JSON.parse(player.licenses);
      licenses = { driver: parsed.driver === true || parsed.driver === 1, weapon: parsed.weapon === true || parsed.weapon === 1 };
    } catch { licenses = { driver: false, weapon: false }; }

    let job = null;
    try {
      const parsed = JSON.parse(player.job);
      job = { name: parsed.name || '', label: parsed.label || '', grade: parsed.grade || 0, gradeName: parsed.gradeName || parsed.label || '' };
    } catch { /* ignore */ }

    return {
      citizenid: player.citizenid,
      cash: player.cash,
      bank: player.bank,
      charinfo,
      licenses,
      job,
      vehicles: vehicles.map((v) => ({
        plate: v.plate,
        vehicle: v.vehicle,
        fuel: v.fuel,
        engine: v.engine,
        body: v.body,
      })),
      cases: cases.map((c) => ({ id: c.id, title: c.title, status: c.status, createdAt: c.createdAt })),
      warrants: warrants.map((w) => ({ id: w.id, reason: w.reason, status: w.status, createdAt: w.createdAt })),
    };
  }

  async searchByName(name: string): Promise<CitizenProfile[]> {
    const players = await prisma.$queryRawUnsafe<Array<{ citizenid: string; charinfo: string }>>(
      'SELECT citizenid, charinfo FROM players WHERE LOWER(charinfo) LIKE ? LIMIT 20',
      [`%${name.toLowerCase()}%`],
    );

    const results: CitizenProfile[] = [];
    for (const p of players) {
      try {
        const parsed = JSON.parse(p.charinfo);
        const fullName = `${parsed.firstname || ''} ${parsed.lastname || ''}`.toLowerCase();
        if (fullName.includes(name.toLowerCase())) {
          const profile = await this.searchByCitizenid(p.citizenid);
          if (profile) results.push(profile);
        }
      } catch { /* skip */ }
    }
    return results;
  }

  async searchByPlate(plate: string): Promise<CitizenProfile | null> {
    const vehicles = await prisma.$queryRawUnsafe<Array<{ citizenid: string }>>(
      'SELECT citizenid FROM player_vehicles WHERE plate = ? LIMIT 1',
      [plate.toUpperCase()],
    );
    if (vehicles.length === 0) return null;
    return this.searchByCitizenid(vehicles[0].citizenid);
  }

  // ─── Case Management ─────────────────────────────────────

  async createCase(officerId: string, officerName: string, input: CreateCaseInput) {
    return prisma.incidentReport.create({
      data: {
        officerId,
        officerName,
        citizenid: input.citizenid || null,
        citizenName: input.citizenName || null,
        plate: input.plate || null,
        title: input.title,
        description: input.description,
        charges: JSON.stringify(input.charges),
        evidenceUrls: JSON.stringify(input.evidenceUrls),
        involvedParties: JSON.stringify(input.involvedParties),
        status: 'OPEN',
      },
    });
  }

  async getCase(caseId: string) {
    return prisma.incidentReport.findUnique({ where: { id: caseId } });
  }

  async listCases(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [cases, total] = await Promise.all([
      prisma.incidentReport.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.incidentReport.count(),
    ]);
    return { cases, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async updateCase(caseId: string, input: UpdateCaseInput) {
    const data: Record<string, any> = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.status !== undefined) data.status = input.status;
    if (input.charges !== undefined) data.charges = JSON.stringify(input.charges);
    if (input.evidenceUrls !== undefined) data.evidenceUrls = JSON.stringify(input.evidenceUrls);
    if (input.involvedParties !== undefined) data.involvedParties = JSON.stringify(input.involvedParties);

    return prisma.incidentReport.update({ where: { id: caseId }, data });
  }

  async deleteCase(caseId: string) {
    await prisma.incidentReport.delete({ where: { id: caseId } });
  }

  // ─── Warrant Management ─────────────────────────────────

  async issueWarrant(officerId: string, officerName: string, input: IssueWarrantInput) {
    const expiresAt = input.expiresInHours
      ? new Date(Date.now() + input.expiresInHours * 3600 * 1000)
      : null;

    const warrant = await prisma.warrant.create({
      data: {
        citizenid: input.citizenid,
        citizenName: input.citizenName || null,
        plate: input.plate || null,
        issuedBy: officerId,
        issuedByName: officerName,
        reason: input.reason,
        expiresAt,
      },
    });

    // Fire-and-forget Discord webhook for raid channel
    sendWarrantWebhook(
      input.citizenName || input.citizenid,
      input.citizenid,
      input.reason,
      officerName,
      input.plate,
    ).catch(() => {});

    return warrant;
  }

  async listActiveWarrants() {
    return prisma.warrant.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeWarrant(warrantId: string) {
    return prisma.warrant.update({
      where: { id: warrantId },
      data: { status: 'REVOKED' },
    });
  }

  async executeWarrant(warrantId: string) {
    return prisma.warrant.update({
      where: { id: warrantId },
      data: { status: 'EXECUTED' },
    });
  }
}

export const mdtService = new MdtService();
