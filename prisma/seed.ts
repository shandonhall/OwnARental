import { config } from 'dotenv';
import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../apps/api/src/generated/prisma/client';
import {
  ContractStatus,
  FicaStatus,
  LedgerEntryStatus,
  LedgerEntryType,
  PlanType,
  VehicleStatus,
} from '../apps/api/src/generated/prisma/enums';
import {
  addMonths,
  expectedContractTotal,
  sumPaidIncome,
} from '../apps/api/src/finance/finance.utils';

config({ path: resolve(process.cwd(), 'prisma/.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required to seed');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

function daysAgo(days: number) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d;
}

function dateOnly(daysOffset: number) {
  return daysAgo(-daysOffset);
}

type ClientSeed = {
  idNumber: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  addressLine1: string;
  city: string;
  province: string;
  postalCode: string;
  ficaStatus: FicaStatus;
  notes?: string;
};

type VehicleSeed = {
  registration: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  color: string;
  purchasePrice: number;
  purchaseDate: Date;
  status: VehicleStatus;
  monthlyMileageLimit?: number;
  currentOdometerKm: number;
  driverScore?: number;
  averageDailyKm?: number;
  lat?: number;
  lng?: number;
  carTrackDeviceId?: string;
  warrantyProvider?: string;
  warrantyKmLimit?: number;
  nextServiceDueKm?: number;
  notes?: string;
};

const clients: ClientSeed[] = [
  {
    idNumber: '9001015800085',
    firstName: 'Thabo',
    lastName: 'Mokoena',
    phone: '0821234567',
    email: 'thabo@example.com',
    addressLine1: '12 Main Rd',
    city: 'Randburg',
    province: 'Gauteng',
    postalCode: '2194',
    ficaStatus: FicaStatus.PARTIAL,
    notes: 'Waiting on bank statements pack',
  },
  {
    idNumber: '8805125800183',
    firstName: 'Lerato',
    lastName: 'Dlamini',
    phone: '0834567890',
    email: 'lerato.dlamini@example.com',
    addressLine1: '45 Bram Fischer Dr',
    city: 'Randburg',
    province: 'Gauteng',
    postalCode: '2194',
    ficaStatus: FicaStatus.COMPLETE,
  },
  {
    idNumber: '8503205800281',
    firstName: 'Sipho',
    lastName: 'Nkosi',
    phone: '0712345678',
    email: 'sipho.nkosi@example.com',
    addressLine1: '8 Republic Rd',
    city: 'Fontainebleau',
    province: 'Gauteng',
    postalCode: '2032',
    ficaStatus: FicaStatus.COMPLETE,
    notes: 'Two missed rentals — arrears follow-up',
  },
  {
    idNumber: '9208154800388',
    firstName: 'Aisha',
    lastName: 'Patel',
    phone: '0849876543',
    email: 'aisha.patel@example.com',
    addressLine1: '22 Malibongwe Dr',
    city: 'Strijdom Park',
    province: 'Gauteng',
    postalCode: '2188',
    ficaStatus: FicaStatus.COMPLETE,
  },
  {
    idNumber: '7809015800486',
    firstName: 'Johan',
    lastName: 'van Wyk',
    phone: '0827654321',
    email: 'johan.vanwyk@example.com',
    addressLine1: '3 Hill St',
    city: 'Ferndale',
    province: 'Gauteng',
    postalCode: '2194',
    ficaStatus: FicaStatus.COMPLETE,
    notes: 'Paid-up graduate — ownership transferred',
  },
  {
    idNumber: '9502284800584',
    firstName: 'Nomsa',
    lastName: 'Khumalo',
    phone: '0761122334',
    email: 'nomsa.khumalo@example.com',
    addressLine1: '19 Hans Strijdom Dr',
    city: 'Northcliff',
    province: 'Gauteng',
    postalCode: '2195',
    ficaStatus: FicaStatus.PENDING,
    notes: 'New lead — FICA not started',
  },
];

const vehicles: VehicleSeed[] = [
  {
    registration: 'CA123456',
    vin: 'JTDBR32E520123456',
    make: 'Toyota',
    model: 'Corolla',
    year: 2022,
    color: 'White',
    purchasePrice: 285000,
    purchaseDate: daysAgo(400),
    status: VehicleStatus.AVAILABLE,
    monthlyMileageLimit: 3500,
    currentOdometerKm: 42000,
    driverScore: 78,
    averageDailyKm: 45,
    lat: -26.0942,
    lng: 28.0064,
    carTrackDeviceId: 'CT-CA123456',
    warrantyProvider: 'Toyota SA',
    warrantyKmLimit: 100000,
    nextServiceDueKm: 45000,
  },
  {
    registration: 'GP78BCGP',
    vin: 'WVWZZZ6RZHY123456',
    make: 'Volkswagen',
    model: 'Polo',
    year: 2021,
    color: 'Silver',
    purchasePrice: 245000,
    purchaseDate: daysAgo(520),
    status: VehicleStatus.ACTIVE,
    monthlyMileageLimit: 3000,
    currentOdometerKm: 61500,
    driverScore: 82,
    averageDailyKm: 55,
    lat: -26.1125,
    lng: 28.0188,
    carTrackDeviceId: 'CT-GP78BCGP',
    warrantyProvider: 'VW SA',
    warrantyKmLimit: 100000,
    nextServiceDueKm: 75000,
  },
  {
    registration: 'FJ12KLM',
    vin: 'AHTKB8CD402123456',
    make: 'Toyota',
    model: 'Hilux',
    year: 2020,
    color: 'White',
    purchasePrice: 420000,
    purchaseDate: daysAgo(700),
    status: VehicleStatus.ARREARS,
    monthlyMileageLimit: 4000,
    currentOdometerKm: 98000,
    driverScore: 61,
    averageDailyKm: 95,
    lat: -26.1433,
    lng: 27.9951,
    carTrackDeviceId: 'CT-FJ12KLM',
    warrantyProvider: 'Toyota SA',
    warrantyKmLimit: 160000,
    nextServiceDueKm: 105000,
    notes: 'High daily km — watch service interval',
  },
  {
    registration: 'GP45XYZ',
    vin: 'MALA251CLJM123456',
    make: 'Hyundai',
    model: 'i20',
    year: 2023,
    color: 'Blue',
    purchasePrice: 265000,
    purchaseDate: daysAgo(300),
    status: VehicleStatus.ACTIVE,
    monthlyMileageLimit: 2800,
    currentOdometerKm: 18800,
    driverScore: 91,
    averageDailyKm: 38,
    lat: -26.0871,
    lng: 28.0412,
    carTrackDeviceId: 'CT-GP45XYZ',
    warrantyProvider: 'Hyundai SA',
    warrantyKmLimit: 100000,
    nextServiceDueKm: 30000,
  },
  {
    registration: 'GP90QRS',
    vin: 'WF0AXXWPMA1234567',
    make: 'Ford',
    model: 'EcoSport',
    year: 2022,
    color: 'Orange',
    purchasePrice: 310000,
    purchaseDate: daysAgo(180),
    status: VehicleStatus.AVAILABLE,
    monthlyMileageLimit: 3500,
    currentOdometerKm: 12500,
    driverScore: 74,
    averageDailyKm: 20,
    lat: -26.1208,
    lng: 28.0325,
    carTrackDeviceId: 'CT-GP90QRS',
    warrantyProvider: 'Ford SA',
    warrantyKmLimit: 100000,
    nextServiceDueKm: 15000,
  },
  {
    registration: 'NJ33TUV',
    vin: 'KNAB2515B51234567',
    make: 'Kia',
    model: 'Picanto',
    year: 2019,
    color: 'Red',
    purchasePrice: 165000,
    purchaseDate: daysAgo(900),
    status: VehicleStatus.AVAILABLE,
    monthlyMileageLimit: 2500,
    currentOdometerKm: 72000,
    driverScore: 70,
    averageDailyKm: 40,
    lat: -26.1014,
    lng: 27.9789,
    carTrackDeviceId: 'CT-NJ33TUV',
    warrantyProvider: 'Kia SA',
    warrantyKmLimit: 100000,
    nextServiceDueKm: 75000,
    notes: 'Yard stock — ready for CIP assignment',
  },
  {
    registration: 'GP11AAA',
    vin: 'MDHBN51Y0GJ123456',
    make: 'Nissan',
    model: 'Almera',
    year: 2018,
    color: 'Grey',
    purchasePrice: 195000,
    purchaseDate: daysAgo(1400),
    status: VehicleStatus.PAID_UP,
    monthlyMileageLimit: 3000,
    currentOdometerKm: 112000,
    driverScore: 85,
    averageDailyKm: 35,
    lat: -26.1355,
    lng: 28.0102,
    carTrackDeviceId: 'CT-GP11AAA',
    warrantyProvider: 'Nissan SA',
    warrantyKmLimit: 100000,
    nextServiceDueKm: 120000,
    notes: 'Ownership completed — retained for history',
  },
];

async function upsertClient(data: ClientSeed) {
  return prisma.client.upsert({
    where: { idNumber: data.idNumber },
    update: {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      email: data.email ?? null,
      addressLine1: data.addressLine1,
      city: data.city,
      province: data.province,
      postalCode: data.postalCode,
      ficaStatus: data.ficaStatus,
      notes: data.notes ?? null,
      isActive: true,
    },
    create: {
      firstName: data.firstName,
      lastName: data.lastName,
      idNumber: data.idNumber,
      phone: data.phone,
      email: data.email,
      addressLine1: data.addressLine1,
      city: data.city,
      province: data.province,
      postalCode: data.postalCode,
      ficaStatus: data.ficaStatus,
      notes: data.notes,
    },
  });
}

async function upsertVehicle(data: VehicleSeed) {
  const telematics = {
    monthlyMileageLimit: data.monthlyMileageLimit ?? null,
    currentOdometerKm: data.currentOdometerKm,
    driverScore: data.driverScore ?? null,
    averageDailyKm:
      data.averageDailyKm != null
        ? new Prisma.Decimal(data.averageDailyKm)
        : null,
    lastKnownLat:
      data.lat != null ? new Prisma.Decimal(data.lat) : null,
    lastKnownLng:
      data.lng != null ? new Prisma.Decimal(data.lng) : null,
    lastLocationAt: data.lat != null ? new Date() : null,
    carTrackDeviceId: data.carTrackDeviceId ?? null,
    warrantyProvider: data.warrantyProvider ?? null,
    warrantyKmLimit: data.warrantyKmLimit ?? null,
    nextServiceDueKm: data.nextServiceDueKm ?? null,
    notes: data.notes ?? null,
  };

  return prisma.vehicle.upsert({
    where: { registration: data.registration },
    update: {
      make: data.make,
      model: data.model,
      year: data.year,
      color: data.color,
      vin: data.vin,
      purchasePrice: data.purchasePrice,
      purchaseDate: data.purchaseDate,
      status: data.status,
      ...telematics,
    },
    create: {
      make: data.make,
      model: data.model,
      year: data.year,
      color: data.color,
      vin: data.vin,
      registration: data.registration,
      purchasePrice: data.purchasePrice,
      purchaseDate: data.purchaseDate,
      status: data.status,
      ...telematics,
    },
  });
}

async function upsertContract(input: {
  clientId: string;
  vehicleId: string;
  planType: PlanType;
  status: ContractStatus;
  termMonths: number;
  monthlyRate: number;
  depositAmount: number;
  balloonAmount?: number;
  cipPercent?: number;
  startDate: Date;
  monthlyKmLimit: number;
  notes?: string;
  ledger: Array<{
    type: LedgerEntryType;
    status: LedgerEntryStatus;
    amount: number;
    dueDate?: Date;
    paidAt?: Date;
    reference?: string;
    description?: string;
  }>;
}) {
  const endDate = addMonths(input.startDate, input.termMonths);
  const expectedTotal = expectedContractTotal({
    monthlyRate: input.monthlyRate,
    termMonths: input.termMonths,
    depositAmount: input.depositAmount,
    balloonAmount: input.balloonAmount,
  });

  const existing = await prisma.contract.findFirst({
    where: { vehicleId: input.vehicleId },
    orderBy: { createdAt: 'desc' },
  });

  const contractData = {
    clientId: input.clientId,
    vehicleId: input.vehicleId,
    planType: input.planType,
    status: input.status,
    termMonths: input.termMonths,
    monthlyRate: input.monthlyRate,
    depositAmount: input.depositAmount,
    balloonAmount: input.balloonAmount ?? null,
    cipPercent: input.cipPercent ?? null,
    startDate: input.startDate,
    endDate,
    monthlyKmLimit: input.monthlyKmLimit,
    notes: input.notes ?? null,
  };

  const contract = existing
    ? await prisma.contract.update({
        where: { id: existing.id },
        data: contractData,
      })
    : await prisma.contract.create({ data: contractData });

  await prisma.ledgerEntry.deleteMany({ where: { contractId: contract.id } });

  if (input.ledger.length > 0) {
    await prisma.ledgerEntry.createMany({
      data: input.ledger.map((entry) => ({
        contractId: contract.id,
        type: entry.type,
        status: entry.status,
        amount: entry.amount,
        dueDate: entry.dueDate ?? null,
        paidAt: entry.paidAt ?? null,
        reference: entry.reference ?? null,
        description: entry.description ?? null,
      })),
    });
  }

  const ledger = await prisma.ledgerEntry.findMany({
    where: { contractId: contract.id },
  });
  const totalPaid = sumPaidIncome(ledger);
  const outstandingBalance = Prisma.Decimal.max(
    expectedTotal.sub(totalPaid),
    new Prisma.Decimal(0),
  );

  return prisma.contract.update({
    where: { id: contract.id },
    data: { totalPaid, outstandingBalance },
  });
}

function rentalMonths(
  count: number,
  monthlyRate: number,
  start: Date,
  options?: { earlyFromIndex?: number },
) {
  const entries: Array<{
    type: LedgerEntryType;
    status: LedgerEntryStatus;
    amount: number;
    dueDate: Date;
    paidAt: Date;
    reference: string;
    description: string;
  }> = [];

  for (let i = 0; i < count; i += 1) {
    const due = addMonths(start, i + 1);
    const isEarly =
      options?.earlyFromIndex != null && i >= options.earlyFromIndex;
    const paidAt = isEarly
      ? new Date(due.getTime() - 4 * 24 * 60 * 60 * 1000)
      : due;
    entries.push({
      type: LedgerEntryType.RENTAL_PAYMENT,
      status: isEarly ? LedgerEntryStatus.EARLY : LedgerEntryStatus.ON_TIME,
      amount: monthlyRate,
      dueDate: due,
      paidAt,
      reference: `RENT-${String(i + 1).padStart(3, '0')}`,
      description: isEarly
        ? `Monthly rental #${i + 1} (early)`
        : `Monthly rental #${i + 1}`,
    });
  }
  return entries;
}

async function main() {
  const clientByKey: Record<string, Awaited<ReturnType<typeof upsertClient>>> =
    {};
  for (const client of clients) {
    clientByKey[client.idNumber] = await upsertClient(client);
  }

  const vehicleByReg: Record<
    string,
    Awaited<ReturnType<typeof upsertVehicle>>
  > = {};
  for (const vehicle of vehicles) {
    vehicleByReg[vehicle.registration] = await upsertVehicle(vehicle);
  }

  // Lerato — active CIP 10% on Polo (8 months in)
  const poloStart = daysAgo(240);
  await upsertContract({
    clientId: clientByKey['8805125800183'].id,
    vehicleId: vehicleByReg.GP78BCGP.id,
    planType: PlanType.CIP_10,
    status: ContractStatus.ACTIVE,
    termMonths: 36,
    monthlyRate: 6500,
    depositAmount: 24500,
    cipPercent: 10,
    startDate: poloStart,
    monthlyKmLimit: 3000,
    notes: 'CIP 10% — good payer',
    ledger: [
      {
        type: LedgerEntryType.DEPOSIT,
        status: LedgerEntryStatus.ON_TIME,
        amount: 24500,
        paidAt: poloStart,
        reference: 'DEP-POLO-001',
        description: 'CIP deposit',
      },
      ...rentalMonths(8, 6500, poloStart, { earlyFromIndex: 6 }),
    ],
  });

  // Sipho — arrears on Hilux (missed last 2 months)
  const hiluxStart = daysAgo(360);
  await upsertContract({
    clientId: clientByKey['8503205800281'].id,
    vehicleId: vehicleByReg.FJ12KLM.id,
    planType: PlanType.LONG_TERM,
    status: ContractStatus.ARREARS,
    termMonths: 48,
    monthlyRate: 9800,
    depositAmount: 35000,
    balloonAmount: 60000,
    startDate: hiluxStart,
    monthlyKmLimit: 4000,
    notes: 'Long-term bakkie — currently in arrears',
    ledger: [
      {
        type: LedgerEntryType.DEPOSIT,
        status: LedgerEntryStatus.ON_TIME,
        amount: 35000,
        paidAt: hiluxStart,
        reference: 'DEP-HILUX-001',
        description: 'Initial deposit',
      },
      ...rentalMonths(10, 9800, hiluxStart),
      {
        type: LedgerEntryType.RENTAL_PAYMENT,
        status: LedgerEntryStatus.LATE,
        amount: 9800,
        dueDate: addMonths(hiluxStart, 11),
        paidAt: addMonths(hiluxStart, 11),
        reference: 'RENT-011',
        description: 'Monthly rental #11 (late)',
      },
      {
        type: LedgerEntryType.FINE,
        status: LedgerEntryStatus.PENDING,
        amount: 750,
        dueDate: daysAgo(20),
        reference: 'AARTO-DEMO',
        description: 'Speeding fine — client liable',
      },
      {
        type: LedgerEntryType.RENTAL_PAYMENT,
        status: LedgerEntryStatus.PENDING,
        amount: 9800,
        dueDate: addMonths(hiluxStart, 12),
        reference: 'RENT-012',
        description: 'Monthly rental #12 — unpaid',
      },
      {
        type: LedgerEntryType.RENTAL_PAYMENT,
        status: LedgerEntryStatus.PENDING,
        amount: 9800,
        dueDate: dateOnly(5),
        reference: 'RENT-013',
        description: 'Monthly rental #13 — unpaid',
      },
    ],
  });

  // Aisha — CIP 20% near final stretch
  const i20Start = daysAgo(900);
  await upsertContract({
    clientId: clientByKey['9208154800388'].id,
    vehicleId: vehicleByReg.GP45XYZ.id,
    planType: PlanType.CIP_20,
    status: ContractStatus.ACTIVE,
    termMonths: 36,
    monthlyRate: 7200,
    depositAmount: 53000,
    cipPercent: 20,
    startDate: i20Start,
    monthlyKmLimit: 2800,
    notes: 'Final ~6 months — end-of-term pipeline candidate',
    ledger: [
      {
        type: LedgerEntryType.DEPOSIT,
        status: LedgerEntryStatus.ON_TIME,
        amount: 53000,
        paidAt: i20Start,
        reference: 'DEP-I20-001',
        description: 'CIP 20% deposit',
      },
      ...rentalMonths(30, 7200, i20Start, { earlyFromIndex: 28 }),
      {
        type: LedgerEntryType.MAINTENANCE,
        status: LedgerEntryStatus.ON_TIME,
        amount: 2800,
        paidAt: daysAgo(60),
        reference: 'SVC-I20',
        description: '15k service — fleet covered',
      },
    ],
  });

  // Johan — completed ownership on Almera
  const almeraStart = daysAgo(1200);
  await upsertContract({
    clientId: clientByKey['7809015800486'].id,
    vehicleId: vehicleByReg.GP11AAA.id,
    planType: PlanType.CIP_10,
    status: ContractStatus.COMPLETED,
    termMonths: 36,
    monthlyRate: 4800,
    depositAmount: 19500,
    cipPercent: 10,
    startDate: almeraStart,
    monthlyKmLimit: 3000,
    notes: 'Term completed — title transferred',
    ledger: [
      {
        type: LedgerEntryType.DEPOSIT,
        status: LedgerEntryStatus.ON_TIME,
        amount: 19500,
        paidAt: almeraStart,
        reference: 'DEP-ALM-001',
        description: 'CIP deposit',
      },
      ...rentalMonths(36, 4800, almeraStart),
      {
        type: LedgerEntryType.BALLOON_PAYMENT,
        status: LedgerEntryStatus.ON_TIME,
        amount: 15000,
        paidAt: addMonths(almeraStart, 36),
        reference: 'BAL-ALM-001',
        description: 'Final balloon / transfer fee',
      },
    ],
  });

  console.log('Seeded demo data:');
  console.log(`  Clients  ${clients.length}`);
  console.log(`  Vehicles ${vehicles.length}`);
  console.log('  Contracts 4 (active / arrears / completed)');
  console.log('  Ledger entries for deposits, rentals, fine & maintenance');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
