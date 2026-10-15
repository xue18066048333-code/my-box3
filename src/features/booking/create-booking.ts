import {randomUUID} from 'node:crypto';
import {isDemoMode} from '@/features/catalog/data';
import {requiresAssessment} from '@/features/catalog/content';
import type {QuoteResult} from '@/features/pricing/types';
import {bookingSchema, type BookingInput, type BookingStatus} from './schema';

interface TransactionClient {
  query<T>(sql:string, parameters?: unknown[]): Promise<{rows:T[]}>;
}
export interface BookingDatabase {
  transaction<T>(work:(client:TransactionClient) => Promise<T>): Promise<T>;
}

export function bookingTerms(input: BookingInput, quote: QuoteResult) {
  const assessment = input.configuration.armed || requiresAssessment(input.serviceSlug) || quote.requiresAssessment || quote.totalMinor === null;
  const status: BookingStatus = assessment ? 'assessment_requested' : 'awaiting_deposit';
  const currency = quote.lines.find(line => line.activePrice)?.activePrice?.currencyCode ?? (input.configuration.country === 'TZ' ? 'TZS' : 'THB');
  return {status, currency, totalMinor: assessment ? null : quote.totalMinor, depositMinor:assessment ? 0 : quote.depositMinor};
}

// Trusted server-only domain boundary. Browser input reaches this only after server recalculation.
export async function createBooking(input:BookingInput, quote:QuoteResult, database?:BookingDatabase): Promise<{orderId:string; publicReference:string}> {
  const valid = bookingSchema.parse(input);
  const terms = bookingTerms(valid,quote);
  if (terms.status === 'awaiting_deposit' && (!Number.isSafeInteger(terms.totalMinor) || terms.totalMinor! <= 0 || !Number.isSafeInteger(terms.depositMinor) || terms.depositMinor < 0 || terms.depositMinor > terms.totalMinor!)) throw new Error('Invalid quote totals');
  const orderId = randomUUID();
  const publicReference = `BK-${randomUUID().replaceAll('-','').toUpperCase()}`;
  const priceVersions = quote.lines.flatMap(line => line.activePrice ? [{
    lineCode: line.code,
    priceVersionId: line.activePrice.priceVersionId,
    effectiveFrom: line.activePrice.effectiveFrom,
    currencyCode: line.activePrice.currencyCode,
    amountMinor: line.activePrice.amountMinor,
  }] : []);
  const snapshot = structuredClone({
    version: 1,
    input: {serviceSlug: valid.serviceSlug, locale: valid.locale, configuration: valid.configuration},
    serviceSlug: valid.serviceSlug,
    locale: valid.locale,
    configuration: valid.configuration,
    lines: quote.lines,
    currency: terms.currency,
    subtotalMinor: terms.status === 'assessment_requested' ? null : quote.subtotalMinor,
    taxMinor: terms.status === 'assessment_requested' ? null : quote.taxMinor,
    totalMinor: terms.totalMinor,
    depositMinor: terms.depositMinor,
    reasons: quote.reasons,
    priceVersions,
    quote,
    payable: {totalMinor: terms.totalMinor, depositMinor: terms.depositMinor},
    capturedAt: new Date().toISOString(),
  });
  if (!database) {
    if (!isDemoMode()) throw new Error('Booking persistence unavailable');
    const {saveDemoBooking} = await import('./demo-store');
    saveDemoBooking({orderId,publicReference,contact:valid.contact,snapshot,terms});
    return {orderId,publicReference};
  }
  await database.transaction(async client => {
    await client.query('INSERT INTO orders(id,public_reference,service_slug,country,status,currency,total_minor,deposit_minor) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [orderId,publicReference,valid.serviceSlug,valid.configuration.country,terms.status,terms.currency,terms.totalMinor,terms.depositMinor]);
    await client.query('INSERT INTO order_contacts(order_id,name,phone,email,wechat,whatsapp) VALUES ($1,$2,$3,$4,$5,$6)', [orderId,valid.contact.name,valid.contact.phone ?? null,valid.contact.email ?? null,valid.contact.wechat ?? null,valid.contact.whatsapp ?? null]);
    await client.query('INSERT INTO order_quote_snapshots(order_id,snapshot) VALUES ($1,$2::jsonb)',[orderId,JSON.stringify(snapshot)]);
    await client.query('INSERT INTO order_events(order_id,event_type,status) VALUES ($1,$2,$3)',[orderId,'booking_created',terms.status]);
  });
  return {orderId,publicReference};
}
