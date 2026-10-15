'use server';

import {isDemoMode, loadCatalog, loadQuoteRates} from '@/features/catalog/data';
import {requiresAssessment} from '@/features/catalog/content';
import {calculateStandardQuote} from '@/features/pricing/calculate-standard-quote';
import {bookingSchema, type BookingStatus} from '../schema';
import {bookingTerms, createBooking} from '../create-booking';
import {bookingCopy} from '../content';

export type BookingResponse = {ok:true; demo:boolean; publicReference:string; status:BookingStatus; currency:string; totalMinor:number|null; depositMinor:number} | {ok:false; code:'invalid'|'unavailable'; message:string};

export async function submitBooking(raw:unknown):Promise<BookingResponse> {
  const locale = raw && typeof raw === 'object' && 'locale' in raw && typeof raw.locale === 'string' && Object.hasOwn(bookingCopy,raw.locale) ? raw.locale as keyof typeof bookingCopy : 'en';
  const t = bookingCopy[locale];
  const parsed = bookingSchema.safeParse(raw);
  if (!parsed.success) {
    const path = parsed.error.issues[0]?.path.join('.');
    return {ok:false,code:'invalid',message:path === 'contact.name' ? t.nameError : path === 'contact.phone' ? t.contactError : path === 'contact.email' ? t.emailError : t.invalid};
  }
  // No production persistence/rate adapter has been configured at this stage. Fail closed.
  if (!isDemoMode()) return {ok:false,code:'unavailable',message:t.unavailable};
  try {
    const input = parsed.data;
    const {services} = await loadCatalog(input.configuration.country,input.locale);
    const service = services.find(service => service.slug === input.serviceSlug);
    if (!service) return {ok:false,code:'unavailable',message:t.unavailable};
    const configuration = {...input.configuration, armed:input.configuration.armed || input.serviceSlug === 'armed-transport'};
    const trustedInput = {...input,configuration};
    const trustedRates = await loadQuoteRates();
    const quote = calculateStandardQuote(configuration, requiresAssessment(input.serviceSlug) || !service.activePrice ? {} : trustedRates);
    const {publicReference} = await createBooking(trustedInput,quote);
    return {ok:true,demo:true,publicReference,...bookingTerms(trustedInput,quote)};
  } catch {
    // Do not include exception payloads: validation/storage errors may contain contact data.
    return {ok:false,code:'unavailable',message:t.unavailable};
  }
}
