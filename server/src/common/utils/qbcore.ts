import { PrismaClient } from '@prisma/client';

/**
 * QBCORE DATABASE UTILITY
 *
 * Type-safe raw queries against existing qb-core tables.
 * All queries use parameterized binding to prevent SQL injection.
 * No schema changes are made to qb-core tables.
 */

const prisma = new PrismaClient();

// ─── Types ─────────────────────────────────────────────────

export interface QbPlayer {
  citizenid: string;
  cash: number;
  bank: number;
  charinfo: string;   // JSON
  licenses: string;   // JSON
  job: string;        // JSON
}

export interface QbVehicle {
  citizenid: string;
  plate: string;
  vehicle: string;    // vehicle model name
  hash: number;
  mods: string;       // JSON
  fuel: number;
  engine: number;     // engine health 0-1000
  body: number;       // body health 0-1000
  state: number;      // 0=out, 1=garaged
}

export interface QbPlayerMoney {
  citizenid: string;
  cash: number;
  bank: number;
}

// ─── Player Queries ────────────────────────────────────────

export async function getPlayerByCitizenid(citizenid: string): Promise<QbPlayer | null> {
  const players = await prisma.$queryRawUnsafe<QbPlayer[]>(
    'SELECT citizenid, cash, bank, charinfo, licenses, job FROM players WHERE citizenid = ? LIMIT 1',
    [citizenid],
  );
  return players.length > 0 ? players[0] : null;
}

export async function getPlayerMoney(citizenid: string): Promise<QbPlayerMoney | null> {
  const results = await prisma.$queryRawUnsafe<QbPlayerMoney[]>(
    'SELECT citizenid, cash, bank FROM players WHERE citizenid = ? LIMIT 1',
    [citizenid],
  );
  return results.length > 0 ? results[0] : null;
}

export async function updatePlayerBank(
  citizenid: string,
  newBank: number,
): Promise<void> {
  await prisma.$executeRawUnsafe(
    'UPDATE players SET bank = ? WHERE citizenid = ?',
    [newBank, citizenid],
  );
}

export async function updatePlayerCash(
  citizenid: string,
  newCash: number,
): Promise<void> {
  await prisma.$executeRawUnsafe(
    'UPDATE players SET cash = ? WHERE citizenid = ?',
    [newCash, citizenid],
  );
}

/**
 * Atomic bank-to-bank transfer using Prisma $transaction.
 * If any step fails, the entire operation is rolled back.
 * Prevents race conditions and duplication glitches.
 */
export async function atomicBankTransfer(
  fromCitizenid: string,
  toCitizenid: string,
  amount: number,
): Promise<{ fromNewBank: number; toNewBank: number }> {
  return prisma.$transaction(async (tx) => {
    // 1. Lock and read sender's balance
    const sender = await tx.$queryRawUnsafe<QbPlayerMoney[]>(
      'SELECT citizenid, cash, bank FROM players WHERE citizenid = ? LIMIT 1 FOR UPDATE',
      [fromCitizenid],
    );

    if (sender.length === 0) throw new Error('Sender not found');
    if (sender[0].bank < amount) throw new Error('Insufficient funds');

    // 2. Lock and read recipient's balance
    const recipient = await tx.$queryRawUnsafe<QbPlayerMoney[]>(
      'SELECT citizenid, cash, bank FROM players WHERE citizenid = ? LIMIT 1 FOR UPDATE',
      [toCitizenid],
    );

    if (recipient.length === 0) throw new Error('Recipient not found');

    // 3. Execute transfer
    const fromNewBank = sender[0].bank - amount;
    const toNewBank = recipient[0].bank + amount;

    await tx.$executeRawUnsafe(
      'UPDATE players SET bank = ? WHERE citizenid = ?',
      [fromNewBank, fromCitizenid],
    );

    await tx.$executeRawUnsafe(
      'UPDATE players SET bank = ? WHERE citizenid = ?',
      [toNewBank, toCitizenid],
    );

    return { fromNewBank, toNewBank };
  });
}

// ─── Vehicle Queries ───────────────────────────────────────

export async function getVehiclesByCitizenid(citizenid: string): Promise<QbVehicle[]> {
  return prisma.$queryRawUnsafe<QbVehicle[]>(
    'SELECT citizenid, plate, vehicle, hash, mods, fuel, engine, body, state FROM player_vehicles WHERE citizenid = ? ORDER BY vehicle ASC',
    [citizenid],
  );
}

export async function getVehicleByPlate(plate: string): Promise<QbVehicle | null> {
  const vehicles = await prisma.$queryRawUnsafe<QbVehicle[]>(
    'SELECT citizenid, plate, vehicle, hash, mods, fuel, engine, body, state FROM player_vehicles WHERE plate = ? LIMIT 1',
    [plate],
  );
  return vehicles.length > 0 ? vehicles[0] : null;
}

export async function getMarketplaceVehicles(): Promise<QbVehicle[]> {
  return prisma.$queryRawUnsafe<QbVehicle[]>(
    `SELECT pv.citizenid, pv.plate, pv.vehicle, pv.hash, pv.mods, pv.fuel, pv.engine, pv.body, pv.state
     FROM player_vehicles pv
     INNER JOIN reality_vehicle_listings rvl ON rvl.plate = pv.plate
     WHERE rvl.status = 'ACTIVE'`,
  );
}

/**
 * Atomic vehicle ownership transfer.
 * Updates player_vehicles.citizenid and removes the marketplace listing
 * in a single database transaction.
 */
export async function atomicVehicleTransfer(
  plate: string,
  newOwnerCitizenid: string,
  price: number,
  buyerCitizenid: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // 1. Verify the vehicle listing exists and is ACTIVE
    const listing = await tx.$queryRawUnsafe<Array<{ id: number; citizenid: string; price: number; status: string }>>(
      'SELECT id, citizenid, price, status FROM reality_vehicle_listings WHERE plate = ? AND status = "ACTIVE" LIMIT 1 FOR UPDATE',
      [plate],
    );

    if (listing.length === 0) throw new Error('Vehicle not listed for sale');

    if (listing[0].citizenid === buyerCitizenid) {
      throw new Error('Cannot buy your own vehicle');
    }

    // 2. Verify buyer has enough funds
    const buyer = await tx.$queryRawUnsafe<QbPlayerMoney[]>(
      'SELECT citizenid, cash, bank FROM players WHERE citizenid = ? LIMIT 1 FOR UPDATE',
      [buyerCitizenid],
    );

    if (buyer.length === 0) throw new Error('Buyer not found');
    if (buyer[0].bank < price) throw new Error('Insufficient funds');

    // 3. Verify seller exists for payout
    const seller = await tx.$queryRawUnsafe<QbPlayerMoney[]>(
      'SELECT citizenid, cash, bank FROM players WHERE citizenid = ? LIMIT 1 FOR UPDATE',
      [listing[0].citizenid],
    );

    if (seller.length === 0) throw new Error('Seller not found');

    // 4. Transfer ownership
    await tx.$executeRawUnsafe(
      'UPDATE player_vehicles SET citizenid = ? WHERE plate = ?',
      [newOwnerCitizenid, plate],
    );

    // 5. Transfer funds (buyer -> seller)
    await tx.$executeRawUnsafe(
      'UPDATE players SET bank = bank - ? WHERE citizenid = ?',
      [price, buyerCitizenid],
    );

    await tx.$executeRawUnsafe(
      'UPDATE players SET bank = bank + ? WHERE citizenid = ?',
      [price, listing[0].citizenid],
    );

    // 6. Mark listing as SOLD
    await tx.$executeRawUnsafe(
      'UPDATE reality_vehicle_listings SET status = "SOLD" WHERE plate = ?',
      [plate],
    );
  });
}
