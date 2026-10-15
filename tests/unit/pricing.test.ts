import { describe, expect, it } from 'vitest';

import { calculateDeposit, divideAndRoundHalfUp } from '@/features/pricing/calculate-deposit';
import { calculateStandardQuote } from '@/features/pricing/calculate-standard-quote';
import type { ActivePrice } from '@/features/catalog/types';
import type { StandardQuoteInput, StandardRates } from '@/features/pricing/types';

function activePrice(amountMinor: number, suffix: string, currencyCode = 'USD'): ActivePrice {
  return {
    priceVersionId: `10000000-0000-0000-0000-${suffix.padStart(12, '0')}`,
    currencyCode,
    amountMinor,
    effectiveFrom: '2026-01-01T00:00:00.000Z',
  };
}

const personnelPrice = activePrice(1_500, '1');
const overtimePrice = activePrice(2_250, '2');
const vehiclePrice = activePrice(5_000, '3');

const rates = {
  TZ: {
    personnelHourlyPrice: personnelPrice,
    includedHoursPerDay: 8,
    overtimeHourlyPrice: overtimePrice,
    vehicleDailyPrice: vehiclePrice,
    taxBasisPoints: 750,
    depositBasisPoints: 2_500,
  },
} satisfies StandardRates;

const input: StandardQuoteInput = {
  country: 'TZ',
  people: 2,
  days: 3,
  hoursPerDay: 10,
  vehicles: 1,
  armed: false,
};

describe('calculateStandardQuote', () => {
  it('calculates personnel, overtime, vehicle, tax and percentage deposit in minor units', () => {
    expect(calculateStandardQuote(input, rates)).toEqual({
      lines: [
        { code: 'personnel', label: 'Personnel', quantity: 48, unitAmountMinor: 1_500, amountMinor: 72_000, activePrice: personnelPrice },
        { code: 'overtime', label: 'Overtime', quantity: 12, unitAmountMinor: 2_250, amountMinor: 27_000, activePrice: overtimePrice },
        { code: 'vehicle', label: 'Vehicle', quantity: 3, unitAmountMinor: 5_000, amountMinor: 15_000, activePrice: vehiclePrice },
        { code: 'tax', label: 'Tax', quantity: 1, unitAmountMinor: 8_550, amountMinor: 8_550, activePrice: null },
      ],
      subtotalMinor: 114_000,
      taxMinor: 8_550,
      totalMinor: 122_550,
      depositMinor: 30_638,
      requiresAssessment: false,
      reasons: [],
    });
  });

  it.each([0, -1, 1_001])('rejects invalid people count %s', (people) => {
    expect(() => calculateStandardQuote({ ...input, people }, rates)).toThrow(/people/i);
  });

  it.each([0, -1, 366])('rejects days outside 1 through 365: %s', (days) => {
    expect(() => calculateStandardQuote({ ...input, days }, rates)).toThrow(/days/i);
  });

  it.each([0, 25])('rejects hours per day outside 1 through 24: %s', (hoursPerDay) => {
    expect(() => calculateStandardQuote({ ...input, hoursPerDay }, rates)).toThrow(/hoursPerDay/i);
  });

  it.each([-1, 101])('rejects vehicles outside 0 through 100: %s', (vehicles) => {
    expect(() => calculateStandardQuote({ ...input, vehicles }, rates)).toThrow(/vehicles/i);
  });

  it('accepts the inclusive days, hours and vehicle boundaries', () => {
    expect(calculateStandardQuote({ ...input, days: 365, hoursPerDay: 24, vehicles: 100 }, rates).totalMinor).toBeGreaterThan(0);
  });

  it('retains armed approval status when regional rates are missing', () => {
    expect(calculateStandardQuote({ ...input, country: 'TH', armed: true }, rates)).toMatchObject({
      subtotalMinor: null, taxMinor: null, totalMinor: null, depositMinor: 0, requiresAssessment: true,
      reasons: ['MISSING_REGIONAL_RATES', 'ARMED_SERVICE_REQUIRES_APPROVAL'],
    });
  });

  it('returns stable deduplicated missing-price and armed reasons', () => {
    const incompleteRates = {
      TZ: { ...rates.TZ, personnelHourlyPrice: null, overtimeHourlyPrice: activePrice(0, '4'), vehicleDailyPrice: null },
    } satisfies StandardRates;

    expect(calculateStandardQuote({ ...input, armed: true }, incompleteRates)).toMatchObject({
      subtotalMinor: null, taxMinor: null, totalMinor: null, depositMinor: 0, requiresAssessment: true,
      reasons: [
        'MISSING_REQUIRED_RATE:personnelHourlyPrice',
        'MISSING_REQUIRED_RATE:overtimeHourlyPrice',
        'MISSING_REQUIRED_RATE:vehicleDailyPrice',
        'ARMED_SERVICE_REQUIRES_APPROVAL',
      ],
    });
  });

  it('does not require overtime or vehicle prices for zero-quantity lines', () => {
    const noExtraRates = {
      TZ: { ...rates.TZ, overtimeHourlyPrice: null, vehicleDailyPrice: null },
    } satisfies StandardRates;

    expect(calculateStandardQuote({ ...input, hoursPerDay: 8, vehicles: 0 }, noExtraRates)).toMatchObject({
      subtotalMinor: 72_000, totalMinor: 77_400, requiresAssessment: false, reasons: [],
      lines: [
        { code: 'personnel', quantity: 48, activePrice: personnelPrice },
        { code: 'tax', quantity: 1, activePrice: null },
      ],
    });
  });

  it('does not convert a positive-quantity zero rate into a free service', () => {
    const incompleteRates = { TZ: { ...rates.TZ, vehicleDailyPrice: activePrice(0, '5') } } satisfies StandardRates;

    expect(calculateStandardQuote(input, incompleteRates)).toMatchObject({
      subtotalMinor: null, taxMinor: null, totalMinor: null, depositMinor: 0, requiresAssessment: true,
      reasons: ['MISSING_REQUIRED_RATE:vehicleDailyPrice'],
    });
  });

  it('labels armed selection as approval-required without taking a deposit', () => {
    expect(calculateStandardQuote({ ...input, armed: true }, rates)).toMatchObject({
      totalMinor: 122_550, depositMinor: 0, requiresAssessment: true,
      reasons: ['ARMED_SERVICE_REQUIRES_APPROVAL'],
    });
  });

  it('rejects malformed negative amounts and invalid price currencies', () => {
    const negativeRate = { TZ: { ...rates.TZ, personnelHourlyPrice: activePrice(-1, '6') } } satisfies StandardRates;
    const invalidCurrency = { TZ: { ...rates.TZ, personnelHourlyPrice: activePrice(1_500, '7', 'usd') } } satisfies StandardRates;

    expect(() => calculateStandardQuote(input, negativeRate)).toThrow(/amountMinor/i);
    expect(() => calculateStandardQuote(input, invalidCurrency)).toThrow(/currencyCode/i);
  });

  it('rejects inconsistent currencies across used active prices', () => {
    const mismatchedCurrency = { TZ: { ...rates.TZ, overtimeHourlyPrice: activePrice(2_250, '8', 'EUR') } } satisfies StandardRates;

    expect(() => calculateStandardQuote(input, mismatchedCurrency)).toThrow(/currency/i);
  });

  it('preserves active price version provenance on quote lines', () => {
    const quote = calculateStandardQuote(input, rates);

    expect(quote.lines[0]?.activePrice?.priceVersionId).toBe(personnelPrice.priceVersionId);
    expect(quote.lines[1]?.activePrice?.priceVersionId).toBe(overtimePrice.priceVersionId);
    expect(quote.lines[2]?.activePrice?.priceVersionId).toBe(vehiclePrice.priceVersionId);
  });

  it('handles safe maximum totals and rejects only an unsafe output total', () => {
    const maximumRate = {
      TZ: {
        personnelHourlyPrice: activePrice(Number.MAX_SAFE_INTEGER, '9'), includedHoursPerDay: 1,
        overtimeHourlyPrice: null, vehicleDailyPrice: null, taxBasisPoints: 0, depositBasisPoints: 5_000,
      },
    } satisfies StandardRates;
    const maximumInput = { ...input, people: 1, days: 1, hoursPerDay: 1, vehicles: 0 };

    expect(calculateStandardQuote(maximumInput, maximumRate)).toMatchObject({ totalMinor: Number.MAX_SAFE_INTEGER, depositMinor: 4_503_599_627_370_496 });
    expect(() => calculateStandardQuote(maximumInput, { TZ: { ...maximumRate.TZ, taxBasisPoints: 10_000 } })).toThrow(RangeError);
  });
});

describe('calculateDeposit', () => {
  it('rounds percentage deposits and tax deterministically in minor units', () => {
    const roundingRates = {
      TZ: { ...rates.TZ, personnelHourlyPrice: activePrice(101, '10'), includedHoursPerDay: 1, overtimeHourlyPrice: null, vehicleDailyPrice: null },
    } satisfies StandardRates;
    const quote = calculateStandardQuote({ ...input, people: 1, days: 1, hoursPerDay: 1, vehicles: 0 }, roundingRates);

    expect(quote.taxMinor).toBe(8);
    expect(calculateDeposit(109, 2_500)).toBe(27);
  });

  it('uses exact integer arithmetic at safe-number half-up boundaries', () => {
    expect(calculateDeposit(Number.MAX_SAFE_INTEGER, 5_000)).toBe(4_503_599_627_370_496);
    expect(divideAndRoundHalfUp(9_007_199_254_740_499, 1_000)).toBe(9_007_199_254_740);
  });

  it('returns zero deposit when the total is unknown', () => {
    expect(calculateDeposit(null, 2_500)).toBe(0);
  });
});
