import { z } from 'zod';

const minorAmountSchema = z.number().int().nonnegative();
const basisPointsSchema = z.number().int().min(0).max(10_000);

const depositInputSchema = z.object({
  totalMinor: minorAmountSchema.nullable(),
  depositBasisPoints: basisPointsSchema,
});

const divisionInputSchema = z.object({
  amount: minorAmountSchema,
  divisor: z.number().int().positive(),
});

/** Calculates a half-up percentage using exact integer minor-unit arithmetic. */
export function calculateDeposit(totalMinor: number | null, depositBasisPoints: number): number {
  const input = depositInputSchema.parse({ totalMinor, depositBasisPoints });

  return input.totalMinor === null
    ? 0
    : calculatePercentage(input.totalMinor, input.depositBasisPoints);
}

export function calculatePercentage(amountMinor: number, basisPoints: number): number {
  const amount = minorAmountSchema.parse(amountMinor);
  const rate = basisPointsSchema.parse(basisPoints);

  return toSafeNumber((BigInt(amount) * BigInt(rate) + 5_000n) / 10_000n);
}

export function divideAndRoundHalfUp(amount: number, divisor: number): number {
  const input = divisionInputSchema.parse({ amount, divisor });

  return toSafeNumber(
    (BigInt(input.amount) + BigInt(input.divisor) / 2n) / BigInt(input.divisor),
  );
}

function toSafeNumber(value: bigint): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError('Currency arithmetic exceeded the supported integer range.');
  }

  return Number(value);
}
