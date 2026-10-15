import type { ActivePrice, CountryCode } from '@/features/catalog/types';

export interface StandardQuoteInput {
  country: CountryCode;
  people: number;
  days: number;
  hoursPerDay: number;
  vehicles: number;
  armed: boolean;
}

export interface RegionalRates {
  personnelHourlyPrice: ActivePrice | null;
  includedHoursPerDay: number;
  overtimeHourlyPrice: ActivePrice | null;
  vehicleDailyPrice: ActivePrice | null;
  taxBasisPoints: number;
  depositBasisPoints: number;
}

export type StandardRates = Partial<Record<CountryCode, RegionalRates>>;

export type QuoteLineCode = 'personnel' | 'overtime' | 'vehicle' | 'tax';

export interface QuoteLine {
  code: QuoteLineCode;
  label: string;
  quantity: number;
  unitAmountMinor: number;
  amountMinor: number;
  activePrice: ActivePrice | null;
}

export type QuoteReason =
  | 'MISSING_REGIONAL_RATES'
  | 'MISSING_REQUIRED_RATE:personnelHourlyPrice'
  | 'MISSING_REQUIRED_RATE:overtimeHourlyPrice'
  | 'MISSING_REQUIRED_RATE:vehicleDailyPrice'
  | 'ARMED_SERVICE_REQUIRES_APPROVAL';

export interface QuoteResult {
  lines: QuoteLine[];
  subtotalMinor: number | null;
  taxMinor: number | null;
  totalMinor: number | null;
  depositMinor: number;
  requiresAssessment: boolean;
  reasons: QuoteReason[];
}
