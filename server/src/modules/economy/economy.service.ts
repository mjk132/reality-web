import { PrismaClient } from '@prisma/client';
import { getPlayerByCitizenid } from '../../common/utils/qbcore';

const prisma = new PrismaClient();

export interface PropertyInfo {
  id: number;
  label: string;
  type: 'house' | 'business' | 'shop';
  price: number;
  owner: { citizenid: string; name: string } | null;
  position: { x: number; y: number; z: number };
}

export class EconomyService {
  async getProperties(): Promise<PropertyInfo[]> {
    const properties = await prisma.economyProperty.findMany({
      orderBy: { label: 'asc' },
    });

    return properties.map((p) => ({
      id: p.id,
      label: p.label,
      type: p.type as PropertyInfo['type'],
      price: p.price,
      owner: p.ownerCitizenid ? { citizenid: p.ownerCitizenid, name: p.ownerName || 'Unknown' } : null,
      position: JSON.parse(p.position) as { x: number; y: number; z: number },
    }));
  }

  async getProperty(id: number): Promise<PropertyInfo | null> {
    const p = await prisma.economyProperty.findUnique({ where: { id } });
    if (!p) return null;

    return {
      id: p.id,
      label: p.label,
      type: p.type as PropertyInfo['type'],
      price: p.price,
      owner: p.ownerCitizenid ? { citizenid: p.ownerCitizenid, name: p.ownerName || 'Unknown' } : null,
      position: JSON.parse(p.position) as { x: number; y: number; z: number },
    };
  }

  async getStats(): Promise<{
    totalProperties: number;
    ownedProperties: number;
    unownedProperties: number;
    totalValue: number;
    propertyTypes: Record<string, number>;
  }> {
    const properties = await prisma.economyProperty.findMany();

    const totalProperties = properties.length;
    const ownedProperties = properties.filter((p) => p.ownerCitizenid).length;
    const unownedProperties = totalProperties - ownedProperties;
    const totalValue = properties.reduce((sum, p) => sum + p.price, 0);
    const propertyTypes: Record<string, number> = {};

    for (const p of properties) {
      propertyTypes[p.type] = (propertyTypes[p.type] || 0) + 1;
    }

    return { totalProperties, ownedProperties, unownedProperties, totalValue, propertyTypes };
  }
}

export const economyService = new EconomyService();
