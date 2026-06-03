import { PrismaClient } from '@prisma/client';
import {
  getVehiclesByCitizenid,
  getVehicleByPlate,
  getMarketplaceVehicles,
  atomicVehicleTransfer,
} from '../../common/utils/qbcore';

const prisma = new PrismaClient();

export interface VehicleInfo {
  plate: string;
  vehicle: string;
  hash: number;
  fuel: number;
  engine: number;
  body: number;
  state: 'garaged' | 'out';
  mods: Record<string, any>;
}

export interface MarketplaceListing {
  id: number;
  plate: string;
  vehicle: string;
  price: number;
  sellerCitizenid: string;
  engine: number;
  body: number;
  fuel: number;
  listedAt: string;
}

export class GarageService {
  async getVehicles(citizenid: string): Promise<VehicleInfo[]> {
    const vehicles = await getVehiclesByCitizenid(citizenid);

    return vehicles.map((v) => ({
      plate: v.plate,
      vehicle: v.vehicle,
      hash: v.hash,
      fuel: v.fuel,
      engine: v.engine,
      body: v.body,
      state: v.state === 1 ? 'garaged' : 'out' as 'garaged' | 'out',
      mods: this.parseMods(v.mods),
    }));
  }

  async listForSale(citizenid: string, plate: string, price: number): Promise<void> {
    // Verify vehicle belongs to this player
    const vehicle = await getVehicleByPlate(plate);
    if (!vehicle) throw new Error('Vehicle not found');
    if (vehicle.citizenid !== citizenid) throw new Error('Vehicle does not belong to you');

    // Check if already listed
    const existing = await prisma.vehicleListing.findUnique({ where: { plate } });
    if (existing && existing.status === 'ACTIVE') {
      throw new Error('Vehicle is already listed for sale');
    }

    // Create or reactivate listing
    await prisma.vehicleListing.upsert({
      where: { plate },
      update: { price, status: 'ACTIVE', citizenid },
      create: { citizenid, plate, vehicle: vehicle.vehicle, price },
    });
  }

  async buyVehicle(buyerCitizenid: string, plate: string): Promise<void> {
    await atomicVehicleTransfer(plate, buyerCitizenid, 0, buyerCitizenid);
  }

  async getMarketplace(): Promise<MarketplaceListing[]> {
    const listings = await prisma.vehicleListing.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });

    const vehicles = await getMarketplaceVehicles();
    const vehicleMap = new Map(vehicles.map((v) => [v.plate, v]));

    return listings.map((l) => {
      const v = vehicleMap.get(l.plate);
      return {
        id: l.id,
        plate: l.plate,
        vehicle: l.vehicle,
        price: l.price,
        sellerCitizenid: l.citizenid,
        engine: v?.engine ?? 1000,
        body: v?.body ?? 1000,
        fuel: v?.fuel ?? 100,
        listedAt: l.createdAt.toISOString(),
      };
    });
  }

  async cancelListing(citizenid: string, plate: string): Promise<void> {
    const listing = await prisma.vehicleListing.findUnique({ where: { plate } });
    if (!listing) throw new Error('Listing not found');
    if (listing.citizenid !== citizenid) throw new Error('Not your listing');

    await prisma.vehicleListing.update({
      where: { plate },
      data: { status: 'CANCELLED' },
    });
  }

  private parseMods(modsJson: string): Record<string, any> {
    try {
      return JSON.parse(modsJson);
    } catch {
      return {};
    }
  }
}

export const garageService = new GarageService();
