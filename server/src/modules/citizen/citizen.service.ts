import { getPlayerByCitizenid, getPlayerMoney, atomicBankTransfer } from '../../common/utils/qbcore';

export interface CitizenProfile {
  citizenid: string;
  cash: number;
  bank: number;
  charinfo: {
    firstname: string;
    lastname: string;
    birthdate: string;
    nationality: string;
    phone: string;
  } | null;
  licenses: {
    driver: boolean;
    weapon: boolean;
  } | null;
  job: {
    name: string;
    label: string;
    grade: number;
    gradeName: string;
  } | null;
}

export interface TransferResult {
  fromCitizenid: string;
  toCitizenid: string;
  amount: number;
  fromNewBank: number;
  toNewBank: number;
}

export class CitizenService {
  async getProfile(citizenid: string): Promise<CitizenProfile> {
    const player = await getPlayerByCitizenid(citizenid);

    if (!player) {
      throw new Error('Player not found');
    }

    let charinfo: CitizenProfile['charinfo'] = null;
    try {
      const parsed = JSON.parse(player.charinfo);
      charinfo = {
        firstname: parsed.firstname || '',
        lastname: parsed.lastname || '',
        birthdate: parsed.birthdate || '',
        nationality: parsed.nationality || '',
        phone: parsed.phone || '',
      };
    } catch {
      // charinfo may be in different format
    }

    let licenses: CitizenProfile['licenses'] = null;
    try {
      const parsed = JSON.parse(player.licenses);
      licenses = {
        driver: parsed.driver === true || parsed.driver === 1,
        weapon: parsed.weapon === true || parsed.weapon === 1,
      };
    } catch {
      licenses = { driver: false, weapon: false };
    }

    let job: CitizenProfile['job'] = null;
    try {
      const parsed = JSON.parse(player.job);
      job = {
        name: parsed.name || '',
        label: parsed.label || '',
        grade: parsed.grade || 0,
        gradeName: parsed.gradeName || parsed.label || '',
      };
    } catch {
      // job may not exist
    }

    return {
      citizenid: player.citizenid,
      cash: player.cash,
      bank: player.bank,
      charinfo,
      licenses,
      job,
    };
  }

  async transferFunds(
    fromCitizenid: string,
    targetCitizenid: string,
    amount: number,
  ): Promise<TransferResult> {
    if (fromCitizenid === targetCitizenid) {
      throw new Error('Cannot transfer to yourself');
    }

    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    if (amount > 10000000) {
      throw new Error('Amount exceeds maximum limit');
    }

    // Verify sender exists and has sufficient funds before transaction
    const sender = await getPlayerMoney(fromCitizenid);
    if (!sender) throw new Error('Sender not found');
    if (sender.bank < amount) throw new Error('Insufficient bank balance');

    // Verify recipient exists
    const recipient = await getPlayerMoney(targetCitizenid);
    if (!recipient) throw new Error('Recipient not found');

    // Execute atomic transfer with row-level locks
    const result = await atomicBankTransfer(fromCitizenid, targetCitizenid, amount);

    return {
      fromCitizenid,
      toCitizenid: targetCitizenid,
      amount,
      fromNewBank: result.fromNewBank,
      toNewBank: result.toNewBank,
    };
  }
}

export const citizenService = new CitizenService();
