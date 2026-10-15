// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QuoteConfigurator } from '@/features/quote/components/quote-configurator';
import type { StandardRates } from '@/features/pricing/types';
import { submitBooking, type BookingResponse } from '@/features/booking/actions/submit-booking';

vi.mock('@/features/booking/actions/submit-booking', () => ({submitBooking: vi.fn()}));

const price = { priceVersionId: '00000000-0000-4000-8000-000000000001', currencyCode: 'THB', amountMinor: 10000, effectiveFrom: '2026-01-01T00:00:00.000Z' };
const rates: StandardRates = { TH: { personnelHourlyPrice: price, includedHoursPerDay: 8, overtimeHourlyPrice: {...price, amountMinor: 15000}, vehicleDailyPrice: {...price, amountMinor: 50000}, taxBasisPoints: 700, depositBasisPoints: 3000 } };
afterEach(() => {cleanup(); vi.clearAllMocks();});
describe('QuoteConfigurator', () => {
  it('updates the itemized quote when people, hours, days or vehicle count changes', () => {
    render(<QuoteConfigurator country="TH" locale="en" rates={rates} demo />);
    expect(screen.getByTestId('quote-total').textContent).toContain('856.00');
    fireEvent.change(screen.getByLabelText('People'), {target: {value: '2'}});
    expect(screen.getByTestId('quote-total').textContent).toContain('1,712.00');
    fireEvent.change(screen.getByLabelText('Hours per day'), {target: {value: '10'}});
    expect(screen.getByTestId('quote-total').textContent).toContain('2,354.00');
    expect(screen.getByText('Overtime')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Vehicles'), {target: {value: '1'}});
    expect(screen.getByTestId('quote-total').textContent).toContain('2,889.00');
    fireEvent.change(screen.getByLabelText('Days'), {target: {value: '2'}});
    expect(screen.getByTestId('quote-total').textContent).toContain('5,778.00');
    expect(screen.getByTestId('quote-deposit').textContent).toContain('1,733.40');
  });
  it('shows assessment-required rather than a zero total for custom services', () => {
    render(<QuoteConfigurator country="TH" locale="en" rates={rates} custom demo />);
    expect(screen.getByRole('status').textContent).toContain('Quote after assessment');
    expect(screen.queryByTestId('quote-total')).toBeNull();
    expect(screen.queryByTestId('quote-deposit')).toBeNull();
  });
  it('shows armed service as an application requiring review', () => {
    render(<QuoteConfigurator country="TH" locale="en" rates={rates} armedService demo />);
    expect(screen.getByRole('status').textContent).toContain('Review required');
    expect(screen.queryByTestId('quote-deposit')).toBeNull();
    expect((screen.getByLabelText('Armed protection') as HTMLInputElement).disabled).toBe(true);
  });
  it('removes deposit when armed protection is selected', () => {
    render(<QuoteConfigurator country="TH" locale="en" rates={rates} demo />);
    fireEvent.click(screen.getByLabelText('Armed protection'));
    expect(screen.queryByTestId('quote-deposit')).toBeNull();
    expect(screen.getByRole('status').textContent).toContain('Review required');
  });
  it('shows a missing-rate reason and no price for unavailable regional data', () => {
    render(<QuoteConfigurator country="TZ" locale="en" rates={{}} />);
    expect(screen.getByRole('status').textContent).toContain('Published regional rates are unavailable');
    expect(screen.queryByTestId('quote-total')).toBeNull();
  });
  it('clears a stale quote while numeric input is invalid', () => {
    render(<QuoteConfigurator country="TH" locale="en" rates={rates} demo />);
    fireEvent.change(screen.getByLabelText('People'), {target: {value: ''}});
    expect(screen.queryByTestId('quote-total')).toBeNull();
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('freezes the submitted quote during a deferred request and resets safely after success', async () => {
    let resolveSubmission!: (response: BookingResponse) => void;
    vi.mocked(submitBooking).mockReturnValue(new Promise<BookingResponse>(resolve => {resolveSubmission = resolve;}));
    render(<QuoteConfigurator country="TH" locale="en" rates={rates} demo serviceSlug="airport-transfer" />);
    await waitFor(() => expect((screen.getByLabelText('Full name') as HTMLInputElement).disabled).toBe(false));
    fireEvent.change(screen.getByLabelText('Full name'), {target: {value: 'Jane Example'}});
    fireEvent.change(screen.getByLabelText('Email'), {target: {value: 'jane@example.com'}});
    fireEvent.click(screen.getByRole('button', {name: 'Submit booking'}));
    await waitFor(() => expect(submitBooking).toHaveBeenCalledWith(expect.objectContaining({configuration: expect.objectContaining({people: 1, armed: false})})));
    expect((screen.getByLabelText('People') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText('Armed protection') as HTMLInputElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('People'), {target: {value: '2'}});
    fireEvent.click(screen.getByLabelText('Armed protection'));
    expect((screen.getByLabelText('People') as HTMLInputElement).value).toBe('1');
    expect((screen.getByLabelText('Armed protection') as HTMLInputElement).checked).toBe(false);

    resolveSubmission({ok:true, demo:true, publicReference:'BK-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', status:'awaiting_deposit', currency:'THB', totalMinor:85600, depositMinor:25680});
    await waitFor(() => expect(screen.getByTestId('booking-confirmation')).toBeTruthy());
    expect(screen.getByTestId('booking-confirmation-configuration').textContent).toContain('1 people');
    expect(screen.getByTestId('booking-confirmation-configuration').textContent).toContain('unarmed');
    expect((screen.getByLabelText('People') as HTMLInputElement).disabled).toBe(true);
    expect(screen.queryByRole('button', {name:'Submit booking'})).toBeNull();

    fireEvent.click(screen.getByRole('button', {name:'Start a new booking'}));
    await waitFor(() => expect(screen.getByRole('button', {name:'Submit booking'})).toBeTruthy());
    expect((screen.getByLabelText('People') as HTMLInputElement).disabled).toBe(false);
    expect((screen.getByLabelText('People') as HTMLInputElement).value).toBe('1');
    expect((screen.getByLabelText('Armed protection') as HTMLInputElement).checked).toBe(false);
  });
});
