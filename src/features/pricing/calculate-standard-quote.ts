import { z } from 'zod';

import { calculateDeposit, calculatePercentage } from './calculate-deposit';
import type { ActivePrice } from '@/features/catalog/types';
import type {
  QuoteLine,
  QuoteReason,
  QuoteResult,
  RegionalRates,
  StandardQuoteInput,
  StandardRates,
} from './types';

const inputSchema = z.object({
  country: z.enum(['TZ', 'TH']),
  people: z.number().int().min(1).max(1_000),
  days: z.number().int().min(1).max(365),
  hoursPerDay: z.number().int().min(1).max(24),
  vehicles: z.number().int().min(0).max(100),
  armed: z.boolean(),
}).strict();

const activePriceSchema = z.object({
  priceVersionId: z.string().regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    'priceVersionId must be a UUID.',
  ),
  currencyCode: z.string().regex(/^[A-Z]{3}$/, 'currencyCode must be an uppercase ISO 4217 code.'),
  amountMinor: z.number().int().nonnegative(),
  effectiveFrom: z.string().datetime(),
}).strict();

const regionalRatesSchema = z.object({
  personnelHourlyPrice: activePriceSchema.nullable(),
  includedHoursPerDay: z.number().int().min(1).max(24),
  overtimeHourlyPrice: activePriceSchema.nullable(),
  vehicleDailyPrice: activePriceSchema.nullable(),
  taxBasisPoints: z.number().int().min(0).max(10_000),
  depositBasisPoints: z.number().int().min(0).max(10_000),
}).strict();

const ratesSchema = z.object({
  TZ: regionalRatesSchema.optional(),
  TH: regionalRatesSchema.optional(),
}).strict();

const usedCurrencySchema = z.array(z.string().regex(/^[A-Z]{3}$/)).refine(
  (currencies) => new Set(currencies).size <= 1,
  'Used active prices must share one currency.',
);

type RateField = 'personnelHourlyPrice' | 'overtimeHourlyPrice' | 'vehicleDailyPrice';

interface RateRequirement {
  field: RateField;
  quantity: number;
  price: ActivePrice | null;
}

export function calculateStandardQuote(input: StandardQuoteInput, rates: StandardRates): QuoteResult {
  const validInput = inputSchema.parse(input);
  const validRates = ratesSchema.parse(rates);
  const armedReasons: QuoteReason[] = validInput.armed
    ? ['ARMED_SERVICE_REQUIRES_APPROVAL']
    : [];
  const regionalRates = validRates[validInput.country];

  if (!regionalRates) {
    return assessmentQuote(stableReasons(['MISSING_REGIONAL_RATES'], armedReasons));
  }

  const includedPersonnelHours = multiply(
    validInput.people,
    validInput.days,
    regionalRates.includedHoursPerDay,
  );
  const overtimeHours = multiply(
    validInput.people,
    validInput.days,
    Math.max(0, validInput.hoursPerDay - regionalRates.includedHoursPerDay),
  );
  const vehicleDays = multiply(validInput.vehicles, validInput.days);
  const requirements: RateRequirement[] = [
    { field: 'personnelHourlyPrice', quantity: includedPersonnelHours, price: regionalRates.personnelHourlyPrice },
    { field: 'overtimeHourlyPrice', quantity: overtimeHours, price: regionalRates.overtimeHourlyPrice },
    { field: 'vehicleDailyPrice', quantity: vehicleDays, price: regionalRates.vehicleDailyPrice },
  ];
  const missingReasons = requirements.flatMap(({ field, quantity, price }) =>
    quantity > 0 && !hasPositiveAmount(price) ? [`MISSING_REQUIRED_RATE:${field}` as const] : [],
  );

  if (missingReasons.length > 0) {
    return assessmentQuote(stableReasons(missingReasons, armedReasons));
  }

  const personnelPrice = requirePositiveAmount(regionalRates.personnelHourlyPrice);
  const overtimePrice = overtimeHours > 0
    ? requirePositiveAmount(regionalRates.overtimeHourlyPrice)
    : null;
  const vehiclePrice = vehicleDays > 0
    ? requirePositiveAmount(regionalRates.vehicleDailyPrice)
    : null;
  const usedPrices = [personnelPrice, overtimePrice, vehiclePrice].filter(
    (price): price is ActivePrice => price !== null,
  );
  usedCurrencySchema.parse(usedPrices.map((price) => price.currencyCode));

  const personnelMinor = multiply(includedPersonnelHours, personnelPrice.amountMinor);
  const overtimeMinor = overtimePrice === null ? 0 : multiply(overtimeHours, overtimePrice.amountMinor);
  const vehicleMinor = vehiclePrice === null ? 0 : multiply(vehicleDays, vehiclePrice.amountMinor);
  const subtotalMinor = add(personnelMinor, overtimeMinor, vehicleMinor);
  const taxMinor = calculatePercentage(subtotalMinor, regionalRates.taxBasisPoints);
  const totalMinor = add(subtotalMinor, taxMinor);

  const lines: QuoteLine[] = [
    line('personnel', 'Personnel', includedPersonnelHours, personnelPrice, personnelMinor),
    ...(overtimePrice === null ? [] : [line('overtime', 'Overtime', overtimeHours, overtimePrice, overtimeMinor)]),
    ...(vehiclePrice === null ? [] : [line('vehicle', 'Vehicle', vehicleDays, vehiclePrice, vehicleMinor)]),
    { code: 'tax', label: 'Tax', quantity: 1, unitAmountMinor: taxMinor, amountMinor: taxMinor, activePrice: null },
  ];

  if (validInput.armed) {
    return {
      lines,
      subtotalMinor,
      taxMinor,
      totalMinor,
      depositMinor: 0,
      requiresAssessment: true,
      reasons: armedReasons,
    };
  }

  return {
    lines,
    subtotalMinor,
    taxMinor,
    totalMinor,
    depositMinor: calculateDeposit(totalMinor, regionalRates.depositBasisPoints),
    requiresAssessment: false,
    reasons: [],
  };
}

function hasPositiveAmount(price: ActivePrice | null): price is ActivePrice {
  return price !== null && price.amountMinor > 0;
}

function requirePositiveAmount(price: ActivePrice | null): ActivePrice {
  if (!hasPositiveAmount(price)) {
    throw new RangeError('Required price was unavailable after validation.');
  }

  return price;
}

function assessmentQuote(reasons: QuoteReason[]): QuoteResult {
  return {
    lines: [], subtotalMinor: null, taxMinor: null, totalMinor: null, depositMinor: 0,
    requiresAssessment: true, reasons,
  };
}

function stableReasons(...groups: QuoteReason[][]): QuoteReason[] {
  return [...new Set(groups.flat())];
}

function line(
  code: Exclude<QuoteLine['code'], 'tax'>,
  label: string,
  quantity: number,
  activePrice: ActivePrice,
  amountMinor: number,
): QuoteLine {
  return { code, label, quantity, unitAmountMinor: activePrice.amountMinor, amountMinor, activePrice };
}

function multiply(...values: number[]): number {
  return values.reduce((total, value) => {
    if (!Number.isSafeInteger(total) || !Number.isSafeInteger(value) || value < 0) {
      throw new RangeError('Currency arithmetic requires non-negative safe integers.');
    }
    if (value !== 0 && total > Math.floor(Number.MAX_SAFE_INTEGER / value)) {
      throw new RangeError('Currency arithmetic exceeded the supported integer range.');
    }
    return total * value;
  }, 1);
}

function add(...values: number[]): number {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (!Number.isSafeInteger(total)) {
    throw new RangeError('Currency arithmetic exceeded the supported integer range.');
  }
  return total;
}
