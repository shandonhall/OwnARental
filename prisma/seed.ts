import { config } from 'dotenv';
import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../apps/api/src/generated/prisma/client';
import {
  ContractStatus,
  EndOfTermStage,
  FicaStatus,
  FineImportStatus,
  LedgerEntryStatus,
  LedgerEntryType,
  PlanType,
  TelematicsEventType,
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

/** Start date so the contract ends in `daysUntilEnd` days. */
function startForEndInDays(daysUntilEnd: number, termMonths: number) {
  return addMonths(dateOnly(daysUntilEnd), -termMonths);
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
  nextServiceDueDate?: Date;
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
    notes: 'Closing window — ownership conversation this month',
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
    ficaStatus: FicaStatus.COMPLETE,
    notes: 'End-of-term contacted — awaiting balloon decision',
  },
  {
    idNumber: '8704145800682',
    firstName: 'Kagiso',
    lastName: 'Molefe',
    phone: '0823344556',
    email: 'kagiso.molefe@example.com',
    addressLine1: '7 Beyers Naude Dr',
    city: 'Blackheath',
    province: 'Gauteng',
    postalCode: '2195',
    ficaStatus: FicaStatus.COMPLETE,
    notes: 'Balloon quote sent — payment pending',
  },
  {
    idNumber: '9107074800780',
    firstName: 'Fatima',
    lastName: 'Abrahams',
    phone: '0832211009',
    email: 'fatima.abrahams@example.com',
    addressLine1: '55 Jan Smuts Ave',
    city: 'Parktown North',
    province: 'Gauteng',
    postalCode: '2193',
    ficaStatus: FicaStatus.COMPLETE,
    notes: 'Ownership pack ready — handover booked',
  },
  {
    idNumber: '9901014800889',
    firstName: 'Pieter',
    lastName: 'Botha',
    phone: '0825566778',
    email: 'pieter.botha@example.com',
    addressLine1: '14 Long St',
    city: 'Cape Town',
    province: 'Western Cape',
    postalCode: '8001',
    ficaStatus: FicaStatus.PENDING,
    notes: 'New enquiry — draft CIP quote on stock Polo',
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
    purchasePrice: 220000,
    purchaseDate: daysAgo(400),
    status: VehicleStatus.ACTIVE,
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
    purchasePrice: 220000,
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
    purchasePrice: 380000,
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
    nextServiceDueDate: dateOnly(7),
    notes: 'High daily km — watch service interval',
  },
  {
    registration: 'GP45XYZ',
    vin: 'MALA251CLJM123456',
    make: 'Hyundai',
    model: 'i20',
    year: 2023,
    color: 'Blue',
    purchasePrice: 240000,
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
    purchasePrice: 250000,
    purchaseDate: daysAgo(180),
    status: VehicleStatus.ACTIVE,
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
    nextServiceDueDate: dateOnly(5),
  },
  {
    registration: 'NJ33TUV',
    vin: 'KNAB2515B51234567',
    make: 'Kia',
    model: 'Picanto',
    year: 2019,
    color: 'Red',
    purchasePrice: 150000,
    purchaseDate: daysAgo(900),
    status: VehicleStatus.ACTIVE,
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
    notes: 'On CIP long-term — balloon pending at end of term',
  },
  {
    registration: 'GP11AAA',
    vin: 'MDHBN51Y0GJ123456',
    make: 'Nissan',
    model: 'Almera',
    year: 2018,
    color: 'Grey',
    purchasePrice: 175000,
    purchaseDate: daysAgo(1400),
    status: VehicleStatus.RETURNED,
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
    notes: 'Ownership completed — title transferred',
  },
  {
    registration: 'GP55EOT',
    vin: 'MA3FJ481S00123456',
    make: 'Suzuki',
    model: 'Swift',
    year: 2021,
    color: 'White',
    purchasePrice: 200000,
    purchaseDate: daysAgo(1100),
    status: VehicleStatus.ACTIVE,
    monthlyMileageLimit: 3000,
    currentOdometerKm: 64000,
    driverScore: 88,
    averageDailyKm: 42,
    lat: -26.0988,
    lng: 28.0221,
    carTrackDeviceId: 'CT-GP55EOT',
    warrantyProvider: 'Suzuki SA',
    warrantyKmLimit: 100000,
    nextServiceDueKm: 75000,
    notes: 'Handover booked — title pack in progress',
  },
  {
    registration: 'GP99STOCK',
    vin: 'WVWZZZ6RZDY999001',
    make: 'Volkswagen',
    model: 'Polo Vivo',
    year: 2024,
    color: 'White',
    purchasePrice: 185000,
    purchaseDate: daysAgo(40),
    status: VehicleStatus.AVAILABLE,
    monthlyMileageLimit: 3000,
    currentOdometerKm: 1200,
    driverScore: null,
    averageDailyKm: 8,
    lat: -26.105,
    lng: 28.05,
    carTrackDeviceId: 'CT-GP99STOCK',
    warrantyProvider: 'VW SA',
    warrantyKmLimit: 100000,
    nextServiceDueKm: 15000,
    notes: 'Yard stock — ready for CIP onboarding',
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
    nextServiceDueDate: data.nextServiceDueDate ?? null,
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
  endOfTermNotifiedAt?: Date | null;
  endOfTermStage?: EndOfTermStage | null;
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
    endOfTermNotifiedAt: input.endOfTermNotifiedAt ?? null,
    endOfTermStage: input.endOfTermStage ?? null,
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
    monthlyRate: 7200,
    depositAmount: 28000,
    cipPercent: 10,
    startDate: poloStart,
    monthlyKmLimit: 3000,
    notes: 'CIP 10% — good payer',
    ledger: [
      {
        type: LedgerEntryType.DEPOSIT,
        status: LedgerEntryStatus.ON_TIME,
        amount: 28000,
        paidAt: poloStart,
        reference: 'DEP-POLO-001',
        description: 'CIP deposit',
      },
      ...rentalMonths(8, 7200, poloStart, { earlyFromIndex: 6 }),
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
        dueDate: daysAgo(2),
        reference: 'AARTO-DEMO',
        description: 'Speeding fine — client liable',
      },
      {
        type: LedgerEntryType.ADMIN_FEE,
        status: LedgerEntryStatus.ON_TIME,
        amount: 150,
        dueDate: daysAgo(2),
        paidAt: daysAgo(2),
        reference: 'FEE-AARTO',
        description: 'Fine admin fee',
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

  // Aisha — CIP 20% in final-90 window (~75 days left)
  const i20Start = startForEndInDays(75, 36);
  await upsertContract({
    clientId: clientByKey['9208154800388'].id,
    vehicleId: vehicleByReg.GP45XYZ.id,
    planType: PlanType.CIP_20,
    status: ContractStatus.ACTIVE,
    termMonths: 36,
    monthlyRate: 7800,
    depositAmount: 53000,
    cipPercent: 20,
    startDate: i20Start,
    monthlyKmLimit: 2800,
    notes: 'Final 90 — ownership conversation queued',
    endOfTermStage: EndOfTermStage.FINAL_90,
    ledger: [
      {
        type: LedgerEntryType.DEPOSIT,
        status: LedgerEntryStatus.ON_TIME,
        amount: 53000,
        paidAt: i20Start,
        reference: 'DEP-I20-001',
        description: 'CIP 20% deposit',
      },
      ...rentalMonths(33, 7800, i20Start, { earlyFromIndex: 30 }),
      {
        type: LedgerEntryType.MAINTENANCE,
        status: LedgerEntryStatus.ON_TIME,
        amount: 2800,
        dueDate: daysAgo(5),
        paidAt: daysAgo(5),
        reference: 'SVC-I20',
        description: '15k service — fleet covered',
      },
      {
        type: LedgerEntryType.TOLL,
        status: LedgerEntryStatus.PENDING,
        amount: 185,
        dueDate: daysAgo(1),
        reference: 'TOLL-I20',
        description: 'e-toll pass-through — this period',
      },
      {
        type: LedgerEntryType.ADJUSTMENT,
        status: LedgerEntryStatus.ON_TIME,
        amount: 200,
        dueDate: daysAgo(10),
        paidAt: daysAgo(10),
        reference: 'ADJ-I20',
        description: 'Ledger adjustment note',
      },
    ],
  });

  // Thabo — closing ≤30 days (also fills Pipeline Final 90)
  const corollaStart = startForEndInDays(22, 36);
  await upsertContract({
    clientId: clientByKey['9001015800085'].id,
    vehicleId: vehicleByReg.CA123456.id,
    planType: PlanType.CIP_10,
    status: ContractStatus.ACTIVE,
    termMonths: 36,
    monthlyRate: 7200,
    depositAmount: 25000,
    cipPercent: 10,
    startDate: corollaStart,
    monthlyKmLimit: 3500,
    notes: 'Closing — ownership conversation this month',
    endOfTermStage: EndOfTermStage.FINAL_90,
    ledger: [
      {
        type: LedgerEntryType.DEPOSIT,
        status: LedgerEntryStatus.ON_TIME,
        amount: 25000,
        paidAt: corollaStart,
        reference: 'DEP-COR-001',
        description: 'CIP deposit',
      },
      ...rentalMonths(34, 7200, corollaStart),
    ],
  });

  // Nomsa — contacted for end-of-term
  const ecoStart = startForEndInDays(48, 36);
  await upsertContract({
    clientId: clientByKey['9502284800584'].id,
    vehicleId: vehicleByReg.GP90QRS.id,
    planType: PlanType.CIP_10,
    status: ContractStatus.ACTIVE,
    termMonths: 36,
    monthlyRate: 7800,
    depositAmount: 32000,
    cipPercent: 10,
    startDate: ecoStart,
    monthlyKmLimit: 3500,
    notes: 'Contacted — WhatsApp + call logged; awaiting decision',
    endOfTermNotifiedAt: daysAgo(12),
    endOfTermStage: EndOfTermStage.CONTACTED,
    ledger: [
      {
        type: LedgerEntryType.DEPOSIT,
        status: LedgerEntryStatus.ON_TIME,
        amount: 32000,
        paidAt: ecoStart,
        reference: 'DEP-ECO-001',
        description: 'CIP deposit',
      },
      ...rentalMonths(33, 7800, ecoStart, { earlyFromIndex: 30 }),
    ],
  });

  // Kagiso — balloon pending
  const picantoStart = startForEndInDays(35, 36);
  await upsertContract({
    clientId: clientByKey['8704145800682'].id,
    vehicleId: vehicleByReg.NJ33TUV.id,
    planType: PlanType.LONG_TERM,
    status: ContractStatus.ACTIVE,
    termMonths: 36,
    monthlyRate: 4800,
    depositAmount: 18000,
    balloonAmount: 28000,
    startDate: picantoStart,
    monthlyKmLimit: 2500,
    notes: 'Balloon quote issued — payment pending',
    endOfTermNotifiedAt: daysAgo(20),
    endOfTermStage: EndOfTermStage.BALLOON_PENDING,
    ledger: [
      {
        type: LedgerEntryType.DEPOSIT,
        status: LedgerEntryStatus.ON_TIME,
        amount: 18000,
        paidAt: picantoStart,
        reference: 'DEP-PIC-001',
        description: 'Initial deposit',
      },
      ...rentalMonths(34, 4800, picantoStart),
      {
        type: LedgerEntryType.BALLOON_PAYMENT,
        status: LedgerEntryStatus.PENDING,
        amount: 28000,
        dueDate: dateOnly(35),
        reference: 'BAL-PIC-001',
        description: 'End-of-term balloon — unpaid',
      },
    ],
  });

  // Fatima — handover booked
  const swiftStart = startForEndInDays(14, 36);
  await upsertContract({
    clientId: clientByKey['9107074800780'].id,
    vehicleId: vehicleByReg.GP55EOT.id,
    planType: PlanType.CIP_20,
    status: ContractStatus.ACTIVE,
    termMonths: 36,
    monthlyRate: 6200,
    depositAmount: 45000,
    cipPercent: 20,
    startDate: swiftStart,
    monthlyKmLimit: 3000,
    notes: 'Handover booked — title pack in progress',
    endOfTermNotifiedAt: daysAgo(40),
    endOfTermStage: EndOfTermStage.HANDOVER,
    ledger: [
      {
        type: LedgerEntryType.DEPOSIT,
        status: LedgerEntryStatus.ON_TIME,
        amount: 45000,
        paidAt: swiftStart,
        reference: 'DEP-SWF-001',
        description: 'CIP 20% deposit',
      },
      ...rentalMonths(35, 6200, swiftStart, { earlyFromIndex: 32 }),
    ],
  });

  // Johan — completed / returned (fills Pipeline Returned + End of term Completed)
  const almeraStart = startForEndInDays(-45, 36);
  await upsertContract({
    clientId: clientByKey['7809015800486'].id,
    vehicleId: vehicleByReg.GP11AAA.id,
    planType: PlanType.CIP_10,
    status: ContractStatus.COMPLETED,
    termMonths: 36,
    monthlyRate: 5200,
    depositAmount: 22000,
    cipPercent: 10,
    startDate: almeraStart,
    monthlyKmLimit: 3000,
    notes: 'Term completed — title transferred',
    endOfTermNotifiedAt: daysAgo(90),
    endOfTermStage: EndOfTermStage.RETURNED,
    ledger: [
      {
        type: LedgerEntryType.DEPOSIT,
        status: LedgerEntryStatus.ON_TIME,
        amount: 22000,
        paidAt: almeraStart,
        reference: 'DEP-ALM-001',
        description: 'CIP deposit',
      },
      ...rentalMonths(36, 5200, almeraStart),
      {
        type: LedgerEntryType.BALLOON_PAYMENT,
        status: LedgerEntryStatus.ON_TIME,
        amount: 18000,
        paidAt: addMonths(almeraStart, 36),
        reference: 'BAL-ALM-001',
        description: 'Final balloon / transfer fee',
      },
    ],
  });

  // Pieter — draft CIP on yard stock (shows DRAFT filter + AVAILABLE stock)
  await upsertContract({
    clientId: clientByKey['9901014800889'].id,
    vehicleId: vehicleByReg.GP99STOCK.id,
    planType: PlanType.CIP_10,
    status: ContractStatus.DRAFT,
    termMonths: 36,
    monthlyRate: 6900,
    depositAmount: 30000,
    cipPercent: 10,
    startDate: dateOnly(0),
    monthlyKmLimit: 3000,
    notes: 'Draft quote — awaiting FICA and deposit',
    ledger: [],
  });
  // Keep stock vehicle AVAILABLE until draft is activated
  await prisma.vehicle.update({
    where: { id: vehicleByReg.GP99STOCK.id },
    data: { status: VehicleStatus.AVAILABLE },
  });

  // Telematics rule breaches → driver alerts
  await prisma.telematicsEvent.deleteMany({
    where: {
      vehicleId: {
        in: [
          vehicleByReg.FJ12KLM.id,
          vehicleByReg.GP90QRS.id,
          vehicleByReg.GP78BCGP.id,
        ],
      },
      type: TelematicsEventType.RULE_BREACH,
    },
  });
  await prisma.telematicsEvent.createMany({
    data: [
      {
        vehicleId: vehicleByReg.FJ12KLM.id,
        type: TelematicsEventType.RULE_BREACH,
        odometerKm: 98010,
        lat: new Prisma.Decimal(-26.1433),
        lng: new Prisma.Decimal(27.9951),
        driverScore: 58,
        message: 'Exceeded posted speed limit for > 30s (CT-FJ12KLM)',
        recordedAt: daysAgo(1),
      },
      {
        vehicleId: vehicleByReg.GP90QRS.id,
        type: TelematicsEventType.RULE_BREACH,
        odometerKm: 12540,
        lat: new Prisma.Decimal(-26.1208),
        lng: new Prisma.Decimal(28.0325),
        driverScore: 71,
        message: 'Left approved operating zone (CT-GP90QRS)',
        recordedAt: daysAgo(2),
      },
      {
        vehicleId: vehicleByReg.GP78BCGP.id,
        type: TelematicsEventType.RULE_BREACH,
        odometerKm: 61580,
        lat: new Prisma.Decimal(-26.1125),
        lng: new Prisma.Decimal(28.0188),
        driverScore: 80,
        message: 'Harsh braking event cluster (CT-GP78BCGP)',
        recordedAt: daysAgo(3),
      },
    ],
  });

  // Fine imports for /fines page
  const hiluxContract = await prisma.contract.findFirst({
    where: { vehicleId: vehicleByReg.FJ12KLM.id },
    include: { ledger: true },
  });
  const fineLedger = hiluxContract?.ledger.find(
    (e) => e.type === LedgerEntryType.FINE,
  );
  const feeLedger = hiluxContract?.ledger.find(
    (e) => e.type === LedgerEntryType.ADMIN_FEE,
  );

  await prisma.fineImport.deleteMany({
    where: {
      externalId: {
        in: ['DEMO-AARTO-001', 'DEMO-UNMATCHED-001', 'DEMO-MATCHED-001'],
      },
    },
  });
  await prisma.fineImport.createMany({
    data: [
      {
        externalId: 'DEMO-AARTO-001',
        source: 'AARTO',
        registration: 'FJ12KLM',
        offenceDate: daysAgo(3),
        amount: 750,
        description: 'Speeding — matched & invoiced to Sipho',
        contractId: hiluxContract?.id ?? null,
        fineLedgerId: fineLedger?.id ?? null,
        adminFeeLedgerId: feeLedger?.id ?? null,
        invoicedAt: daysAgo(2),
        status: FineImportStatus.INVOICED,
      },
      {
        externalId: 'DEMO-MATCHED-001',
        source: 'SANRAL',
        registration: 'GP45XYZ',
        offenceDate: daysAgo(4),
        amount: 185,
        description: 'e-toll — matched, not yet invoiced',
        contractId:
          (
            await prisma.contract.findFirst({
              where: { vehicleId: vehicleByReg.GP45XYZ.id },
            })
          )?.id ?? null,
        status: FineImportStatus.MATCHED,
      },
      {
        externalId: 'DEMO-UNMATCHED-001',
        source: 'AARTO',
        registration: 'UNKNOWN99',
        offenceDate: daysAgo(6),
        amount: 500,
        description: 'Orphan fine — registration not on fleet',
        status: FineImportStatus.UNMATCHED,
      },
    ],
  });

  console.log('Seeded demo data:');
  console.log(`  Clients  ${clients.length}`);
  console.log(`  Vehicles ${vehicles.length}`);
  console.log(
    '  Contracts: active / arrears / draft / EOT pipeline / completed',
  );
  console.log(
    '  Pricing: contract schedules beat purchase capital (positive lifetime forecast)',
  );
  console.log('  Extras: service due, rule breaches, fine imports, stock unit');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
