'use client';

import {useRef, useState} from 'react';
import type {Locale} from '@/features/catalog/types';
import type {StandardQuoteInput} from '@/features/pricing/types';
import {submitBooking, type BookingResponse} from '../actions/submit-booking';
import {bookingCopy} from '../content';
import type {BookingInput} from '../schema';

interface BookingFormProps {
  serviceSlug: BookingInput['serviceSlug'];
  locale: Locale;
  configuration: StandardQuoteInput;
  disabled: boolean;
  onPendingChange?: (pending: boolean) => void;
  onSuccessChange?: (success: boolean) => void;
  onReset?: () => void;
}

export function BookingForm({serviceSlug,locale,configuration,disabled,onPendingChange,onSuccessChange,onReset}:BookingFormProps) {
  const t = bookingCopy[locale];
  const [response,setResponse] = useState<BookingResponse|null>(null);
  const [pending,setPending] = useState(false);
  const [submittedConfiguration,setSubmittedConfiguration] = useState<StandardQuoteInput|null>(null);
  const submitting = useRef(false);
  const contactFields = ['name','phone','email','wechat','whatsapp'] as const;
  const setRequestPending = (value:boolean) => {setPending(value); onPendingChange?.(value);};
  const reset = () => {setResponse(null); setSubmittedConfiguration(null); onSuccessChange?.(false); onReset?.();};
  return <section className="booking-section" aria-labelledby="booking-heading">
    <h2 id="booking-heading">{t.heading}</h2><p id="booking-note">{t.note}</p>
    {response?.ok ? <div role="status" data-testid="booking-confirmation" className="booking-confirmation">
      {response.demo && <p><strong>{t.demo}</strong></p>}
      <p>{response.status === 'awaiting_deposit' ? t.awaiting : t.assessment}</p>
      <p>{t.reference}: <code>{response.publicReference}</code></p>
      {response.totalMinor !== null && <p>{t.total}: {new Intl.NumberFormat(locale,{style:'currency',currency:response.currency,currencyDisplay:'code'}).format(response.totalMinor/100)} · {t.deposit}: {new Intl.NumberFormat(locale,{style:'currency',currency:response.currency,currencyDisplay:'code'}).format(response.depositMinor/100)}</p>}
      {submittedConfiguration && <p data-testid="booking-confirmation-configuration">{t.submitted}: {submittedConfiguration.people} people · {submittedConfiguration.days} days · {submittedConfiguration.hoursPerDay} hours/day · {submittedConfiguration.vehicles} vehicles · {submittedConfiguration.armed ? 'armed' : 'unarmed'} · {submittedConfiguration.country}</p>}
      <p>{t.privacy}</p>
      <button type="button" onClick={reset}>{t.newBooking}</button>
    </div> : <form noValidate aria-describedby="booking-note" aria-busy={pending} onSubmit={async event => {
      event.preventDefault(); if (submitting.current || disabled) return;
      submitting.current = true;
      const submitted = {...configuration};
      setSubmittedConfiguration(submitted);
      setRequestPending(true); setResponse(null);
      const data = new FormData(event.currentTarget);
      const contact = Object.fromEntries(contactFields.map(field => [field,String(data.get(field) ?? '')])) as BookingInput['contact'];
      try {
        const result = await submitBooking({serviceSlug,locale,configuration:submitted,contact});
        setResponse(result);
        if (result.ok) onSuccessChange?.(true);
      } catch {setResponse({ok:false,code:'unavailable',message:t.unavailable});}
      finally {submitting.current=false; setRequestPending(false);}
    }}>
      <div className="booking-fields">{contactFields.map(field => <div key={field}><label htmlFor={`booking-${field}`}>{t[field]}</label><input id={`booking-${field}`} name={field} type={field === 'email' ? 'email' : field === 'phone' || field === 'whatsapp' ? 'tel' : 'text'} autoComplete={field === 'name' ? 'name' : field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'off'} maxLength={field === 'name' ? 200 : field === 'email' ? 254 : field === 'wechat' ? 100 : 80} disabled={pending} required={field === 'name'} /></div>)}</div>
      {response && !response.ok && <p role="alert">{response.message}</p>}
      <button type="submit" disabled={disabled || pending}>{pending ? t.pending : t.submit}</button>
    </form>}
  </section>;
}
