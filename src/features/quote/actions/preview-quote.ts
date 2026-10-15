'use server';

import { loadQuoteRates } from '@/features/catalog/data';
import { calculateStandardQuote } from '@/features/pricing/calculate-standard-quote';
import type { QuoteResult, StandardQuoteInput } from '@/features/pricing/types';

// Preview only. This does not authorize an order, a payment or an armed service.
export async function previewQuote(input: StandardQuoteInput): Promise<QuoteResult> {
  return calculateStandardQuote(input, await loadQuoteRates());
}
