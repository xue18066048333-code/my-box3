'use client';

import { useEffect, useRef, useState } from 'react';
import { copy, type ServiceSlug } from '@/features/catalog/content';
import type { CountryCode, Locale } from '@/features/catalog/types';
import { calculateStandardQuote } from '@/features/pricing/calculate-standard-quote';
import type { QuoteResult, StandardQuoteInput, StandardRates } from '@/features/pricing/types';
import { BookingForm } from '@/features/booking/components/booking-form';

interface Props {country: CountryCode; locale: Locale; rates: StandardRates; custom?: boolean; armedService?: boolean; demo?: boolean; serviceSlug?: ServiceSlug}

export function QuoteConfigurator({country, locale, rates, custom = false, armedService = false, demo = false, serviceSlug}: Props) {
  const t = copy[locale];
  const [fields, setFields] = useState({people: '1', days: '1', hoursPerDay: '8', vehicles: '0'});
  const [armed, setArmed] = useState(armedService);
  const [hydrated, setHydrated] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [bookingPending, setBookingPending] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const armedInput = useRef<HTMLInputElement>(null);
  const nextStep = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (reviewOpen) nextStep.current?.scrollIntoView({block:'center'}); }, [reviewOpen]);
  useEffect(() => {
    if (armedInput.current?.checked) setArmed(true);
    setHydrated(true);
  }, []);
  const limits = {people:[1,1000], days:[1,365], hoursPerDay:[1,24], vehicles:[0,100]} as const;
  const labels = {people:t.people, days:t.days, hoursPerDay:t.hours, vehicles:t.vehicles};
  const valid = (Object.keys(fields) as (keyof typeof fields)[]).every(key => fields[key].trim() !== '' && Number.isInteger(Number(fields[key])) && Number(fields[key]) >= limits[key][0] && Number(fields[key]) <= limits[key][1]);
  const input: StandardQuoteInput = {country, people:Number(fields.people), days:Number(fields.days), hoursPerDay:Number(fields.hoursPerDay), vehicles:Number(fields.vehicles), armed: armed || armedService};
  let result: QuoteResult | null = null;
  if (valid) result = calculateStandardQuote(input, custom ? {} : rates);
  const currency = result?.lines.find(line => line.activePrice)?.activePrice?.currencyCode ?? (country === 'TZ' ? 'TZS' : 'THB');
  const money = (minor: number) => new Intl.NumberFormat(locale, {style:'currency', currency, currencyDisplay:'code'}).format(minor / 100);
  const assessment = custom || armed || armedService || result?.requiresAssessment;
  const quoteLocked = bookingPending || bookingConfirmed;
  const resetConfiguration = () => {
    setFields({people: '1', days: '1', hoursPerDay: '8', vehicles: '0'});
    setArmed(armedService);
    setReviewOpen(false);
    setBookingConfirmed(false);
  };

  return <>
  <section className="quote-configurator" data-hydrated={hydrated} aria-labelledby="configure-heading">
    <div className="configuration-fields">
      <p className="eyebrow">{t.standard}</p><h2 id="configure-heading">{t.configure}</h2>
      <div className="number-fields">{(Object.keys(fields) as (keyof typeof fields)[]).map(key => <div key={key}>
        <label htmlFor={`quote-${key}`}>{labels[key]}</label><input id={`quote-${key}`} type="number" inputMode="numeric" min={limits[key][0]} max={limits[key][1]} step="1" value={fields[key]} disabled={!hydrated || quoteLocked} aria-describedby={`limit-${key}`} onChange={event => {if (quoteLocked) return; setFields({...fields,[key]:event.target.value}); setReviewOpen(false);}} />
        <small id={`limit-${key}`}>{limits[key][0]}–{limits[key][1]}</small>
      </div>)}</div>
      <p className="field-note">{t.hoursNote}</p>
      <label className="armed-option"><input ref={armedInput} type="checkbox" checked={armed} disabled={!hydrated || armedService || quoteLocked} onChange={event => {if (quoteLocked) return; setArmed(event.target.checked); setReviewOpen(false);}} />{t.armed}</label>
    </div>
    <div className="quote-panel">
      {demo && <p className="demo-label">{t.demo}</p>}
      {!valid && <p role="alert">{t.invalid}</p>}
      <div role="status" aria-live="polite" aria-atomic="true">
        {assessment && <div className="assessment-notice"><h3>{armed || armedService ? t.review : t.assessment}</h3><p>{armed || armedService ? t.armedReason : custom ? t.custom : result?.reasons.includes('MISSING_REGIONAL_RATES') ? t.missing : t.missingRate}</p></div>}
        {result && result.totalMinor !== null && <>
          <dl className="quote-lines">{result.lines.filter(line => line.code !== 'tax').map(line => <div key={line.code}><dt>{t[line.code]}<small>{line.quantity} × {money(line.unitAmountMinor)}</small></dt><dd>{money(line.amountMinor)}</dd></div>)}</dl>
          <dl className="quote-totals">
            <div><dt>{t.subtotal}</dt><dd>{money(result.subtotalMinor!)}</dd></div>
            <div><dt>{t.tax}</dt><dd>{money(result.taxMinor!)}</dd></div>
            <div className="total"><dt>{t.total}</dt><dd data-testid="quote-total">{money(result.totalMinor)}</dd></div>
            {!assessment && <div><dt>{t.deposit}</dt><dd data-testid="quote-deposit">{money(result.depositMinor)}</dd></div>}
          </dl>
        </>}
      </div>
      {result && result.lines.some(line => line.activePrice) && <details className="price-provenance"><summary>{t.version}</summary>{result.lines.filter(line => line.activePrice).map(line => <p key={line.code}>{t[line.code]}<br /><code>{line.activePrice!.priceVersionId}</code><br />{t.effective}: {line.activePrice!.effectiveFrom.slice(0,10)}</p>)}</details>}
      <div className="quote-action"><button type="button" disabled={!hydrated || !valid || quoteLocked} aria-expanded={reviewOpen} aria-controls="quote-next-step" onClick={() => setReviewOpen(!reviewOpen)}>{assessment ? t.application : t.next}</button><p>{t.nextNote}</p></div>
      <p id="quote-next-step" ref={nextStep} hidden={!reviewOpen}>{assessment ? t.applicationNote : t.demoNote}</p>
    </div>
  </section>
  {serviceSlug && <BookingForm serviceSlug={serviceSlug} locale={locale} configuration={input} disabled={!hydrated || !valid || quoteLocked} onPendingChange={setBookingPending} onSuccessChange={setBookingConfirmed} onReset={resetConfiguration} />}
  </>;
}
