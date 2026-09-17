'use client';

import { useMemo, useState } from 'react';
import {
  Field,
  TextInput,
  TextSelect,
  TextTextarea,
  emptyToNull,
} from '@/components/form';
import type {
  Contract,
  ContractStatus,
  CreateContractInput,
  PlanType,
  Vehicle,
} from '@/lib/api';
import { formatMoney } from '@/lib/format-money';

export const MONTHLY_COMPONENT_FIELDS = [
  { name: 'vehicleRentalAmount', label: 'Vehicle rental' },
  { name: 'administrationAmount', label: 'Administration cost' },
  { name: 'warrantyAmount', label: 'Warranty' },
  { name: 'servicePlanAmount', label: 'We Care service plan' },
  { name: 'trackingAmount', label: 'Tracking device' },
  { name: 'licenceFeeAmount', label: 'Licence fee / disc' },
  { name: 'insuranceAmount', label: 'Insurance premium' },
  { name: 'lifeInsuranceAmount', label: 'Life insurance' },
  { name: 'otherMonthlyAmount', label: 'Other monthly charges' },
] as const;

type MoneyKey = (typeof MONTHLY_COMPONENT_FIELDS)[number]['name'];

function parseOptionalMoney(raw: FormDataEntryValue | null): number | null {
  const text = emptyToNull(String(raw ?? ''));
  if (text === null) return null;
  return Number(text);
}

function parseOptionalInt(raw: FormDataEntryValue | null): number | null {
  const text = emptyToNull(String(raw ?? ''));
  if (text === null) return null;
  return Number(text);
}

function parseTriState(raw: FormDataEntryValue | null): boolean | null {
  const value = String(raw ?? '');
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

function moneyDefault(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  return String(value);
}

function triDefault(value: boolean | null | undefined): string {
  if (value === true) return 'true';
  if (value === false) return 'false';
  return '';
}

export function dateInputValue(value: string | undefined): string {
  if (!value) return '';
  return value.slice(0, 10);
}

export function buildContractPayloadFromForm(
  form: FormData,
  options: { includeParties: boolean; planType: PlanType },
): CreateContractInput {
  const payload: CreateContractInput = {
    ...(options.includeParties
      ? {
          clientId: String(form.get('clientId')),
          vehicleId: String(form.get('vehicleId')),
        }
      : { clientId: '', vehicleId: '' }),
    agreementNumber: emptyToNull(String(form.get('agreementNumber') ?? '')),
    planType: options.planType,
    status: String(form.get('status') || 'DRAFT') as ContractStatus,
    termMonths: Number(form.get('termMonths')),
    monthlyRate: Number(form.get('monthlyRate')),
    depositAmount: Number(form.get('depositAmount') || 0),
    balloonAmount: emptyToNull(String(form.get('balloonAmount') ?? '')),
    cipPercent:
      options.planType === 'CIP_10'
        ? 10
        : options.planType === 'CIP_20'
          ? 20
          : parseOptionalInt(form.get('cipPercent')),
    cipAmount: parseOptionalMoney(form.get('cipAmount')),
    vehicleValue: parseOptionalMoney(form.get('vehicleValue')),
    initialOnRoadCosts: parseOptionalMoney(form.get('initialOnRoadCosts')),
    vehicleRentalAmount: parseOptionalMoney(form.get('vehicleRentalAmount')),
    administrationAmount: parseOptionalMoney(form.get('administrationAmount')),
    warrantyAmount: parseOptionalMoney(form.get('warrantyAmount')),
    servicePlanAmount: parseOptionalMoney(form.get('servicePlanAmount')),
    trackingAmount: parseOptionalMoney(form.get('trackingAmount')),
    licenceFeeAmount: parseOptionalMoney(form.get('licenceFeeAmount')),
    insuranceAmount: parseOptionalMoney(form.get('insuranceAmount')),
    lifeInsuranceAmount: parseOptionalMoney(form.get('lifeInsuranceAmount')),
    otherMonthlyAmount: parseOptionalMoney(form.get('otherMonthlyAmount')),
    startDate: String(form.get('startDate')),
    endDate: emptyToNull(String(form.get('endDate') ?? '')) ?? undefined,
    monthlyKmLimit: parseOptionalInt(form.get('monthlyKmLimit')),
    annualKmLimit: parseOptionalInt(form.get('annualKmLimit')),
    rentalDueDay: parseOptionalInt(form.get('rentalDueDay')),
    vehicleKeptAddress: emptyToNull(
      String(form.get('vehicleKeptAddress') ?? ''),
    ),
    lifeInsuranceAccepted: parseTriState(form.get('lifeInsuranceAccepted')),
    initialRegistrationComplete: parseTriState(
      form.get('initialRegistrationComplete'),
    ),
    initialLicensingComplete: parseTriState(
      form.get('initialLicensingComplete'),
    ),
    insuranceComplete: parseTriState(form.get('insuranceComplete')),
    notes: emptyToNull(String(form.get('notes') ?? '')),
  };
  return payload;
}

function sumEnteredComponents(values: Partial<Record<MoneyKey, string>>) {
  let any = false;
  let total = 0;
  for (const field of MONTHLY_COMPONENT_FIELDS) {
    const raw = values[field.name];
    if (raw === undefined || raw === '') continue;
    any = true;
    total += Number(raw) || 0;
  }
  return any ? total : null;
}

type ClientOption = {
  id: string;
  firstName: string;
  lastName: string;
  idNumber: string;
};

export function ContractScheduleFormFields({
  mode,
  clients,
  vehicles,
  contract,
  planType,
  onPlanTypeChange,
}: {
  mode: 'create' | 'edit';
  clients?: ClientOption[];
  vehicles?: Vehicle[];
  contract?: Contract;
  planType: PlanType;
  onPlanTypeChange: (value: PlanType) => void;
}) {
  const [componentDraft, setComponentDraft] = useState<
    Partial<Record<MoneyKey, string>>
  >(() => {
    const initial: Partial<Record<MoneyKey, string>> = {};
    for (const field of MONTHLY_COMPONENT_FIELDS) {
      initial[field.name] = moneyDefault(
        contract?.[field.name] as string | null | undefined,
      );
    }
    return initial;
  });
  const [allInDraft, setAllInDraft] = useState(
    moneyDefault(contract?.monthlyRate) || '',
  );

  const calculated = useMemo(
    () => sumEnteredComponents(componentDraft),
    [componentDraft],
  );
  const allInNumber = Number(allInDraft || 0);
  const mismatch =
    calculated !== null &&
    MONTHLY_COMPONENT_FIELDS.every(
      (field) =>
        componentDraft[field.name] !== undefined &&
        componentDraft[field.name] !== '',
    ) &&
    Math.abs(calculated - allInNumber) > 0.009;

  const availableVehicles = useMemo(() => {
    if (!vehicles) return [];
    if (mode === 'edit' && contract) {
      return vehicles.filter(
        (vehicle) =>
          vehicle.id === contract.vehicleId ||
          vehicle.status === 'AVAILABLE' ||
          vehicle.contracts.length === 0,
      );
    }
    return vehicles.filter(
      (vehicle) =>
        vehicle.status === 'AVAILABLE' || vehicle.contracts.length === 0,
    );
  }, [vehicles, mode, contract]);

  const sectionClass =
    'grid gap-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-surface p-4 md:grid-cols-2';

  return (
    <>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
          1. Contract identification
        </h2>
        <div className={sectionClass}>
          <Field label="Rental agreement number">
            <TextInput
              name="agreementNumber"
              placeholder="e.g. OAR12345 EXMPLGP"
              defaultValue={contract?.agreementNumber ?? ''}
            />
          </Field>
          {mode === 'create' ? (
            <>
              <Field label="Client / hirer">
                <TextSelect name="clientId" required defaultValue="">
                  <option value="" disabled>
                    Select client
                  </option>
                  {(clients ?? []).map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.firstName} {client.lastName} · {client.idNumber}
                    </option>
                  ))}
                </TextSelect>
              </Field>
              <Field label="Vehicle">
                <TextSelect
                  name="vehicleId"
                  required
                  defaultValue=""
                  onChange={(event) => {
                    const vehicle = availableVehicles.find(
                      (item) => item.id === event.target.value,
                    );
                    if (!vehicle) return;
                    const purchase = Number(vehicle.purchasePrice);
                    const vehicleValueInput = document.querySelector<HTMLInputElement>(
                      'input[name="vehicleValue"]',
                    );
                    if (
                      vehicleValueInput &&
                      !vehicleValueInput.value &&
                      Number.isFinite(purchase)
                    ) {
                      vehicleValueInput.value = purchase.toFixed(2);
                    }
                  }}
                >
                  <option value="" disabled>
                    Select vehicle
                  </option>
                  {availableVehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.year} {vehicle.make} {vehicle.model} ·{' '}
                      {vehicle.registration}
                    </option>
                  ))}
                </TextSelect>
              </Field>
            </>
          ) : (
            <>
              <Field label="Client / hirer">
                <TextInput
                  disabled
                  value={
                    contract
                      ? `${contract.client.firstName} ${contract.client.lastName}`
                      : ''
                  }
                />
              </Field>
              <Field label="Vehicle">
                <TextInput
                  disabled
                  value={
                    contract
                      ? `${contract.vehicle.year} ${contract.vehicle.make} ${contract.vehicle.model} · ${contract.vehicle.registration}`
                      : ''
                  }
                />
              </Field>
            </>
          )}
          <Field label="Plan type">
            <TextSelect
              name="planType"
              value={planType}
              onChange={(event) =>
                onPlanTypeChange(event.target.value as PlanType)
              }
            >
              <option value="CIP_10">10% CIP</option>
              <option value="CIP_20">20% CIP</option>
              <option value="LONG_TERM">Long Term</option>
            </TextSelect>
          </Field>
          <Field label="Status">
            <TextSelect
              name="status"
              defaultValue={contract?.status ?? 'ACTIVE'}
            >
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="ARREARS">Arrears</option>
              <option value="COMPLETED">Completed</option>
              <option value="DEFAULTED">Defaulted</option>
              <option value="CANCELLED">Cancelled</option>
            </TextSelect>
          </Field>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
          2. Contract terms
        </h2>
        <div className={sectionClass}>
          <Field label="Commencement date">
            <TextInput
              name="startDate"
              type="date"
              required
              defaultValue={
                dateInputValue(contract?.startDate) ||
                new Date().toISOString().slice(0, 10)
              }
            />
          </Field>
          <Field label="End / termination date (optional)">
            <TextInput
              name="endDate"
              type="date"
              defaultValue={dateInputValue(contract?.endDate)}
            />
          </Field>
          <Field label="Term (months / instalments)">
            <TextInput
              name="termMonths"
              type="number"
              required
              defaultValue={contract?.termMonths ?? 48}
            />
          </Field>
          <Field label="Annual kilometre allowance">
            <TextInput
              name="annualKmLimit"
              type="number"
              placeholder="e.g. 30000"
              defaultValue={contract?.annualKmLimit ?? ''}
            />
          </Field>
          <Field label="Monthly kilometre limit (existing)">
            <TextInput
              name="monthlyKmLimit"
              type="number"
              defaultValue={contract?.monthlyKmLimit ?? ''}
            />
          </Field>
          <Field label="Rental due day (debit order day 1–31)">
            <TextInput
              name="rentalDueDay"
              type="number"
              min={1}
              max={31}
              defaultValue={contract?.rentalDueDay ?? ''}
            />
          </Field>
          <Field label="Address where vehicle will be kept">
            <TextTextarea
              name="vehicleKeptAddress"
              rows={2}
              defaultValue={contract?.vehicleKeptAddress ?? ''}
            />
          </Field>
          <Field label="Notes">
            <TextTextarea name="notes" rows={2} defaultValue={contract?.notes ?? ''} />
          </Field>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
          3. Contract value / CIP
        </h2>
        <div className={sectionClass}>
          <Field label="Vehicle value (Schedule A snapshot)">
            <TextInput
              name="vehicleValue"
              type="number"
              step="0.01"
              defaultValue={moneyDefault(contract?.vehicleValue)}
            />
          </Field>
          <Field label="Contract Initiation Payment (CIP — non-refundable)">
            <TextInput
              name="cipAmount"
              type="number"
              step="0.01"
              defaultValue={moneyDefault(contract?.cipAmount)}
            />
          </Field>
          <Field label="Legacy CIP % (plan)">
            <TextInput
              name="cipPercent"
              type="number"
              defaultValue={
                contract?.cipPercent ??
                (planType === 'CIP_10' ? 10 : planType === 'CIP_20' ? 20 : '')
              }
            />
          </Field>
          <Field label="Initial on-the-road costs">
            <TextInput
              name="initialOnRoadCosts"
              type="number"
              step="0.01"
              defaultValue={moneyDefault(contract?.initialOnRoadCosts)}
            />
          </Field>
          <Field label="Deposit (legacy field — not CIP)">
            <TextInput
              name="depositAmount"
              type="number"
              step="0.01"
              defaultValue={moneyDefault(contract?.depositAmount) || '0'}
            />
          </Field>
          <Field label="Balloon (ZAR)">
            <TextInput
              name="balloonAmount"
              type="number"
              step="0.01"
              defaultValue={moneyDefault(contract?.balloonAmount)}
            />
          </Field>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
          4. Monthly All-In rental breakdown
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Leave component fields blank when unknown. Use 0 only when the charge
          is intentionally not applicable. Blank ≠ R0.00.
        </p>
        <div className={sectionClass}>
          {MONTHLY_COMPONENT_FIELDS.map((field) => (
            <Field key={field.name} label={field.label}>
              <TextInput
                name={field.name}
                type="number"
                step="0.01"
                value={componentDraft[field.name] ?? ''}
                onChange={(event) =>
                  setComponentDraft((prev) => ({
                    ...prev,
                    [field.name]: event.target.value,
                  }))
                }
              />
            </Field>
          ))}
          <Field label='Rental Amount "All In" (monthlyRate)'>
            <TextInput
              name="monthlyRate"
              type="number"
              step="0.01"
              required
              value={allInDraft}
              onChange={(event) => setAllInDraft(event.target.value)}
            />
          </Field>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-900 md:col-span-2">
            <p className="text-slate-600 dark:text-slate-300">
              Calculated components total:{' '}
              <span className="font-medium text-navy">
                {calculated === null
                  ? 'Pricing breakdown not captured'
                  : formatMoney(calculated)}
              </span>
            </p>
            {mismatch ? (
              <p className="mt-2 text-danger">
                Component total does not match All-In monthly rate (
                {formatMoney(allInNumber)}). Capture every component (use 0
                where none) so they reconcile, or leave unknown fields blank.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
          5. Contract onboarding
        </h2>
        <div className={sectionClass}>
          {(
            [
              ['lifeInsuranceAccepted', 'Life insurance accepted'],
              ['initialRegistrationComplete', 'Initial registration complete'],
              ['initialLicensingComplete', 'Initial licensing complete'],
              ['insuranceComplete', 'Insurance complete'],
            ] as const
          ).map(([name, label]) => (
            <Field key={name} label={label}>
              <TextSelect
                name={name}
                defaultValue={triDefault(contract?.[name])}
              >
                <option value="">Unknown</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </TextSelect>
            </Field>
          ))}
        </div>
      </section>
    </>
  );
}
