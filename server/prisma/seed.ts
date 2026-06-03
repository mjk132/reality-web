import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MOCK_PLAYERS = [
  {
    citizenid: 'DEMO001',
    charinfo: JSON.stringify({ firstname: 'Victor', lastname: 'Blackwood', birthdate: '1988-03-15', nationality: 'American', phone: '555-0101' }),
    cash: 25000,
    bank: 45000000,
    job: JSON.stringify({ name: 'police', label: 'Los Santos Police Department', grade: 6, gradeName: 'Chief of Police', isboss: true }),
    licenses: JSON.stringify({ driver: true, weapon: true }),
  },
  {
    citizenid: 'DEMO002',
    charinfo: JSON.stringify({ firstname: 'Marcus', lastname: 'Steele', birthdate: '1992-07-22', nationality: 'American', phone: '555-0102' }),
    cash: 12000,
    bank: 18500000,
    job: JSON.stringify({ name: 'police', label: 'Los Santos Police Department', grade: 4, gradeName: 'Captain', isboss: false }),
    licenses: JSON.stringify({ driver: true, weapon: true }),
  },
  {
    citizenid: 'DEMO003',
    charinfo: JSON.stringify({ firstname: 'Tony', lastname: 'Rizzo', birthdate: '1995-11-08', nationality: 'Italian', phone: '555-0103' }),
    cash: 8900,
    bank: 1250000,
    job: JSON.stringify({ name: 'unemployed', label: 'Unemployed', grade: 0, gradeName: 'Freelancer', isboss: false }),
    licenses: JSON.stringify({ driver: true, weapon: false }),
  },
  {
    citizenid: 'DEMO004',
    charinfo: JSON.stringify({ firstname: 'Sarah', lastname: 'Chen', birthdate: '1990-05-30', nationality: 'American', phone: '555-0104' }),
    cash: 45000,
    bank: 8200000,
    job: JSON.stringify({ name: 'sheriff', label: 'Blaine County Sheriff Office', grade: 5, gradeName: 'Undersheriff', isboss: true }),
    licenses: JSON.stringify({ driver: true, weapon: true }),
  },
  {
    citizenid: 'DEMO005',
    charinfo: JSON.stringify({ firstname: 'James', lastname: 'Wilson', birthdate: '1985-09-12', nationality: 'British', phone: '555-0105' }),
    cash: 3400,
    bank: 980000,
    job: JSON.stringify({ name: 'mechanic', label: 'LS Customs', grade: 3, gradeName: 'Senior Mechanic', isboss: false }),
    licenses: JSON.stringify({ driver: true, weapon: false }),
  },
  {
    citizenid: 'DEMO006',
    charinfo: JSON.stringify({ firstname: 'Elena', lastname: 'Rodriguez', birthdate: '1993-12-25', nationality: 'Mexican', phone: '555-0106' }),
    cash: 6700,
    bank: 3400000,
    job: JSON.stringify({ name: 'ambulance', label: 'EMS', grade: 2, gradeName: 'Paramedic', isboss: false }),
    licenses: JSON.stringify({ driver: true, weapon: false }),
  },
];

const MOCK_VEHICLES = [
  { citizenid: 'DEMO001', plate: '1KNG666', vehicle: 'Entity XF', hash: 1909184136, mods: '{}', fuel: 85, engine: 920, body: 880, state: 1 },
  { citizenid: 'DEMO001', plate: 'CH1EF', vehicle: 'Buffalo STX', hash: 1565973101, mods: '{"color":2}', fuel: 72, engine: 950, body: 940, state: 1 },
  { citizenid: 'DEMO001', plate: 'KNG001', vehicle: 'Adder', hash: 307820129, mods: '{}', fuel: 45, engine: 880, body: 760, state: 0 },
  { citizenid: 'DEMO002', plate: 'STL001', vehicle: 'Buffalo', hash: 1475775103, mods: '{}', fuel: 63, engine: 780, body: 720, state: 1 },
  { citizenid: 'DEMO002', plate: 'STL002', vehicle: 'Sultan RS', hash: 970598228, mods: '{}', fuel: 91, engine: 850, body: 810, state: 1 },
  { citizenid: 'DEMO003', plate: 'RIZ001', vehicle: 'Faggio', hash: 55647833, mods: '{}', fuel: 30, engine: 320, body: 280, state: 1 },
  { citizenid: 'DEMO003', plate: 'RIZ002', vehicle: 'Blista', hash: 1311878324, mods: '{}', fuel: 55, engine: 480, body: 410, state: 1 },
  { citizenid: 'DEMO004', plate: 'CHN001', vehicle: 'Granger', hash: 251923855, mods: '{}', fuel: 78, engine: 820, body: 900, state: 1 },
  { citizenid: 'DEMO005', plate: 'WLS001', vehicle: 'Sultan', hash: 970385532, mods: '{}', fuel: 92, engine: 960, body: 950, state: 1 },
  { citizenid: 'DEMO006', plate: 'ELN001', vehicle: 'Stanier', hash: 1717532765, mods: '{}', fuel: 67, engine: 710, body: 690, state: 1 },
];

const MOCK_CASES = [
  { officerId: 'demo_owner_discord', officerName: 'Victor Blackwood', citizenid: 'DEMO003', citizenName: 'Tony Rizzo', plate: 'RIZ001', title: 'Suspicious Activity — Vespucci Beach', description: 'Subject observed loitering near parked vehicles in the early morning hours. Two prior warnings on file.', charges: ['Loitering', 'Suspicious Behavior'], status: 'OPEN' as const },
  { officerId: 'demo_high_mgmt_discord', officerName: 'Marcus Steele', citizenid: 'DEMO003', citizenName: 'Tony Rizzo', title: 'Petty Theft — Convenience Store', description: 'Suspect identified from CCTV footage stealing snacks and energy drinks. Total value under $50.', charges: ['Petty Theft'], status: 'CLOSED' as const },
  { officerId: 'demo_owner_discord', officerName: 'Victor Blackwood', citizenid: 'DEMO005', citizenName: 'James Wilson', title: 'Traffic Violation — Speeding', description: 'Clock at 95mph in a 45mph zone on the interstate. Vehicle impounded.', charges: ['Reckless Driving', 'Speeding'], evidenceUrls: ['https://youtube.com/watch?v=demo1'], status: 'OPEN' as const },
  { officerId: 'demo_high_mgmt_discord', officerName: 'Marcus Steele', citizenid: 'DEMO006', citizenName: 'Elena Rodriguez', title: 'Disturbing the Peace', description: 'Loud music complaint at 3 AM. Verbal warning issued.', charges: ['Noise Violation'], status: 'CLOSED' as const },
];

const MOCK_WARRANTS = [
  { citizenid: 'DEMO003', citizenName: 'Tony Rizzo', issuedBy: 'demo_owner_discord', issuedByName: 'Victor Blackwood', reason: 'Failure to appear in court — outstanding traffic violations', expiresAt: new Date(Date.now() + 72 * 3600 * 1000) },
  { citizenid: 'DEMO005', citizenName: 'James Wilson', issuedBy: 'demo_high_mgmt_discord', issuedByName: 'Marcus Steele', reason: 'Suspected involvement in stolen vehicle ring', expiresAt: new Date(Date.now() + 168 * 3600 * 1000) },
];

const MOCK_PROPERTIES = [
  { label: 'Rockford Hills Estate', type: 'house', price: 4500000, ownerCitizenid: 'DEMO001', ownerName: 'Victor Blackwood', position: JSON.stringify({ x: -756.43, y: 321.78, z: 212.45 }) },
  { label: 'Vespucci Beach Apartment', type: 'house', price: 850000, ownerCitizenid: 'DEMO002', ownerName: 'Marcus Steele', position: JSON.stringify({ x: -1213.56, y: -112.34, z: 42.78 }) },
  { label: 'LS Customs — Downtown', type: 'business', price: 2200000, ownerCitizenid: 'DEMO005', ownerName: 'James Wilson', position: JSON.stringify({ x: -342.12, y: -134.56, z: 38.90 }) },
  { label: '24/7 Supermarket — Sandy Shores', type: 'shop', price: 1200000, ownerCitizenid: null, ownerName: null, position: JSON.stringify({ x: 1834.45, y: 3678.90, z: 33.78 }) },
  { label: 'Paleto Bay Motel', type: 'business', price: 980000, ownerCitizenid: null, ownerName: null, position: JSON.stringify({ x: 112.34, y: 6543.21, z: 31.45 }) },
  { label: 'Mirror Park Penthouse', type: 'house', price: 3200000, ownerCitizenid: 'DEMO001', ownerName: 'Victor Blackwood', position: JSON.stringify({ x: 945.67, y: -456.78, z: 48.12 }) },
  { label: 'Ammu-Nation — Rockford', type: 'shop', price: 1750000, ownerCitizenid: null, ownerName: null, position: JSON.stringify({ x: -662.34, y: -945.67, z: 21.56 }) },
  { label: 'Bean Machine Coffee', type: 'business', price: 450000, ownerCitizenid: 'DEMO006', ownerName: 'Elena Rodriguez', position: JSON.stringify({ x: -627.89, y: 234.56, z: 81.23 }) },
];

const MOCK_LISTINGS = [
  { citizenid: 'DEMO002', plate: 'STL002', vehicle: 'Sultan RS', price: 85000 },
  { citizenid: 'DEMO006', plate: 'ELN001', vehicle: 'Stanier', price: 32000 },
];

async function main() {
  console.log('\n═══════════════════════════════════════════');
  console.log('  REALITY DEMO — Seeding Database');
  console.log('═══════════════════════════════════════════\n');

  // 1. Seed qb-core players table (raw SQL — non-destructive upsert)
  console.log('[1/7] Seeding mock players...');
  for (const p of MOCK_PLAYERS) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO players (citizenid, charinfo, cash, bank, job, licenses)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         charinfo = VALUES(charinfo),
         cash = VALUES(cash),
         bank = VALUES(bank),
         job = VALUES(job),
         licenses = VALUES(licenses)`,
      [p.citizenid, p.charinfo, p.cash, p.bank, p.job, p.licenses],
    );
  }
  console.log(`  ✓ ${MOCK_PLAYERS.length} players inserted`);

  // 2. Seed qb-core player_vehicles
  console.log('[2/7] Seeding mock vehicles...');
  for (const v of MOCK_VEHICLES) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO player_vehicles (citizenid, plate, vehicle, hash, mods, fuel, engine, body, state)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         citizenid = VALUES(citizenid),
         vehicle = VALUES(vehicle),
         fuel = VALUES(fuel),
         engine = VALUES(engine),
         body = VALUES(body),
         state = VALUES(state)`,
      [v.citizenid, v.plate, v.vehicle, v.hash, v.mods, v.fuel, v.engine, v.body, v.state],
    );
  }
  console.log(`  ✓ ${MOCK_VEHICLES.length} vehicles inserted`);

  // 3. Seed reality_vehicle_listings
  console.log('[3/7] Seeding marketplace listings...');
  for (const l of MOCK_LISTINGS) {
    await prisma.vehicleListing.upsert({
      where: { plate: l.plate },
      update: { price: l.price, status: 'ACTIVE' },
      create: { citizenid: l.citizenid, plate: l.plate, vehicle: l.vehicle, price: l.price, status: 'ACTIVE' },
    });
  }
  console.log(`  ✓ ${MOCK_LISTINGS.length} listings inserted`);

  // 4. Seed incident reports
  console.log('[4/7] Seeding incident reports...');
  for (const c of MOCK_CASES) {
    await prisma.incidentReport.create({
      data: {
        officerId: c.officerId,
        officerName: c.officerName,
        citizenid: c.citizenid,
        citizenName: c.citizenName,
        plate: c.plate,
        title: c.title,
        description: c.description,
        charges: JSON.stringify(c.charges),
        evidenceUrls: c.evidenceUrls ? JSON.stringify(c.evidenceUrls) : '[]',
        involvedParties: '[]',
        status: c.status,
      },
    });
  }
  console.log(`  ✓ ${MOCK_CASES.length} reports inserted`);

  // 5. Seed warrants
  console.log('[5/7] Seeding active warrants...');
  for (const w of MOCK_WARRANTS) {
    await prisma.warrant.create({
      data: {
        citizenid: w.citizenid,
        citizenName: w.citizenName,
        issuedBy: w.issuedBy,
        issuedByName: w.issuedByName,
        reason: w.reason,
        expiresAt: w.expiresAt,
        status: 'ACTIVE',
      },
    });
  }
  console.log(`  ✓ ${MOCK_WARRANTS.length} warrants inserted`);

  // 6. Seed economy properties
  console.log('[6/7] Seeding economy properties...');
  for (const p of MOCK_PROPERTIES) {
    await prisma.economyProperty.create({
      data: {
        label: p.label,
        type: p.type,
        price: p.price,
        ownerCitizenid: p.ownerCitizenid,
        ownerName: p.ownerName,
        position: p.position,
      },
    });
  }
  console.log(`  ✓ ${MOCK_PROPERTIES.length} properties inserted`);

  // 7. Seed whitelist questions
  console.log('[7/7] Seeding whitelist questions...');
  const questions = [
    { question: 'What is the speed limit in a residential zone?', options: JSON.stringify(['25 mph', '35 mph', '45 mph', '55 mph']), correctIndex: 1 },
    { question: 'When are you allowed to shoot a weapon in the city?', options: JSON.stringify(['Any time', 'Only at the gun range', 'When threatened', 'Never']), correctIndex: 2 },
    { question: 'What should you do if you see a player breaking rules?', options: JSON.stringify(['Shoot them', 'Ignore it', 'Report to staff with evidence', 'Join them']), correctIndex: 2 },
    { question: 'What is Fail RP?', options: JSON.stringify(['Failing a roleplay scenario', 'Acting unrealistically or ignoring RP consequences', 'Failing a mission', 'All of the above']), correctIndex: 1 },
    { question: 'What is Meta-Gaming?', options: JSON.stringify(['Using OOC info IC', 'Playing music in-game', 'Using in-game chat', 'None of the above']), correctIndex: 0 },
    { question: 'Which of these is NOT acceptable RP?', options: JSON.stringify(['Car robbery', 'Bank heist', 'RDM (Random Deathmatch)', 'Police chase']), correctIndex: 2 },
    { question: 'When can you RDM (Random Deathmatch)?', options: JSON.stringify(['Never', 'When bored', 'If someone looks at you wrong', 'In the bad part of town']), correctIndex: 0 },
    { question: 'What should you do before initiating a robbery?', options: JSON.stringify(['Type /me and give clear demands', 'Just shoot', 'Steal silently', 'Ask in OOC']), correctIndex: 0 },
    { question: 'What is VDM (Vehicle Deathmatch)?', options: JSON.stringify(['Racing', 'Using a vehicle as a weapon to kill', 'Driving safely', 'Parking']), correctIndex: 1 },
    { question: 'How should you treat new players?', options: JSON.stringify(['Ignore them', 'Be helpful and welcoming', 'Rob them', 'Report them']), correctIndex: 1 },
  ];

  for (const q of questions) {
    await prisma.whitelistQuestion.create({ data: q });
  }
  console.log(`  ✓ ${questions.length} questions inserted`);

  console.log('\n═══════════════════════════════════════════');
  console.log('  ✅ DEMO DATABASE SEEDED SUCCESSFULLY');
  console.log('  Players:     ', MOCK_PLAYERS.length);
  console.log('  Vehicles:    ', MOCK_VEHICLES.length);
  console.log('  Cases:       ', MOCK_CASES.length);
  console.log('  Warrants:    ', MOCK_WARRANTS.length);
  console.log('  Properties:  ', MOCK_PROPERTIES.length);
  console.log('  Questions:   ', questions.length);
  console.log('═══════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
