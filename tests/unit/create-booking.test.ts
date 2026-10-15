import {afterEach, describe, expect, it, vi} from 'vitest';
import {createBooking} from '@/features/booking/create-booking';
import {submitBooking} from '@/features/booking/actions/submit-booking';
import {createCatalogDatabase} from '../helpers/catalog-db';
import {readFile} from 'node:fs/promises';
import {calculateStandardQuote} from '@/features/pricing/calculate-standard-quote';
import {demoRates} from '@/features/catalog/fixtures/demo-catalog';

const configuration = {country:'TH', people:1, days:1, hoursPerDay:8, vehicles:0, armed:false} as const;
const input = {serviceSlug:'airport-transfer', locale:'en', configuration, contact:{name:' Jane ', email:' jane@example.com ', phone:' ', wechat:' jane-id ', whatsapp:''}} as const;
const databases: Awaited<ReturnType<typeof createCatalogDatabase>>[] = [];
async function database() {
  const db = await createCatalogDatabase(); databases.push(db);
  await db.exec(await readFile(new URL('../../supabase/migrations/002_bookings.sql', import.meta.url), 'utf8'));
  return db;
}
afterEach(async () => {vi.unstubAllEnvs(); await Promise.all(databases.splice(0).map(db => db.close()));});
const quote = () => calculateStandardQuote(configuration, demoRates);

describe('booking creation', () => {
  it('rejects a booking without a name', async () => {
    await expect(createBooking({...input, contact:{name:' ', email:'a@b.com'}}, quote())).rejects.toThrow();
  });
  it('rejects a booking when phone and email are both blank', async () => {
    await expect(createBooking({...input, contact:{name:'Jane', email:' ', phone:' '}}, quote())).rejects.toThrow();
  });
  it('rejects malformed email even when a phone is supplied', async () => {
    await expect(createBooking({...input, contact:{name:'Jane', email:'invalid', phone:'123'}}, quote())).rejects.toThrow();
  });
  it('stores the exact quote and price version snapshot used at submission and trims private contacts', async () => {
    const db = await database(); const original = quote();
    const result = await createBooking(input, original, db);
    const snapshot = (await db.query<{snapshot:unknown}>('SELECT snapshot FROM order_quote_snapshots')).rows[0].snapshot;
    expect(snapshot).toMatchObject({configuration, currency:'THB', quote:original});
    expect(snapshot).toMatchObject({quote:{totalMinor:256800, depositMinor:77040, lines:[{code:'personnel', activePrice:{priceVersionId:'00000000-0000-4000-8000-000000000201', effectiveFrom:'2026-01-01T00:00:00.000Z'}}, {code:'tax'}]}});
    expect((await db.query('SELECT name, email, phone, wechat, whatsapp FROM order_contacts')).rows).toEqual([{name:'Jane', email:'jane@example.com', phone:null, wechat:'jane-id', whatsapp:null}]);
    expect((await db.query('SELECT status, total_minor, deposit_minor FROM orders')).rows).toEqual([{status:'awaiting_deposit',total_minor:256800,deposit_minor:77040}]);
    expect((await db.query('SELECT order_id FROM order_events')).rows).toEqual([{order_id:result.orderId}]);
    original.lines[0].activePrice!.amountMinor = 99;
    expect((await db.query<{snapshot:{quote:{lines:{activePrice:{amountMinor:number}}[]}}}>('SELECT snapshot FROM order_quote_snapshots')).rows[0].snapshot.quote.lines[0].activePrice.amountMinor).toBe(30000);
    await expect(db.exec("UPDATE order_quote_snapshots SET snapshot = '{}'::jsonb")).rejects.toThrow(/immutable/i);
    await expect(db.exec('DELETE FROM order_quote_snapshots')).rejects.toThrow(/immutable/i);
  });
  it('creates an assessment order when total is unknown without storing zero', async () => {
    const db = await database();
    await createBooking(input, calculateStandardQuote(configuration, {}), db);
    expect((await db.query('SELECT status, total_minor, deposit_minor FROM orders')).rows).toEqual([{status:'assessment_requested',total_minor:null,deposit_minor:0}]);
  });
  it('keeps armed requests in assessment with no payable total or deposit', async () => {
    const db = await database(); const armed = {...configuration,armed:true};
    await createBooking({...input,configuration:armed}, calculateStandardQuote(armed,demoRates), db);
    expect((await db.query('SELECT status, total_minor, deposit_minor FROM orders')).rows).toEqual([{status:'assessment_requested',total_minor:null,deposit_minor:0}]);
  });
  it('generates distinct UUIDs and display-only references', async () => {
    const db = await database();
    const a = await createBooking(input,quote(),db); const b = await createBooking(input,quote(),db);
    expect(a.orderId).not.toBe(b.orderId); expect(a.publicReference).not.toBe(b.publicReference);
    expect(a.publicReference).toMatch(/^BK-[A-F0-9]{32}$/); expect(a.publicReference).not.toContain(a.orderId);
  });
  it('rolls back every row when the initial event cannot be stored', async () => {
    const db = await database();
    await db.exec("ALTER TABLE order_events ADD CONSTRAINT reject_event CHECK (event_type <> 'booking_created')");
    await expect(createBooking(input,quote(),db)).rejects.toThrow();
    for (const table of ['orders','order_contacts','order_quote_snapshots','order_events']) expect((await db.query(`SELECT * FROM ${table}`)).rows).toEqual([]);
  });
  it('rejects illegal order-state and money combinations in the database', async () => {
    const db = await database(); await createBooking(input,quote(),db);
    for (const change of ["status='assessment_requested'",'total_minor=NULL','deposit_minor=-1',"status='paid'"]) await expect(db.exec(`UPDATE orders SET ${change}`)).rejects.toMatchObject({code:'23514'});
  });
  it.each(['anon','authenticated'])('denies direct client CRUD on every private table for %s, with RLS as defense in depth', async role => {
    const db = await database(); await createBooking(input,quote(),db);
    await db.exec(`SET ROLE ${role}`);
    for (const table of ['orders','order_contacts','order_quote_snapshots','order_events']) {
      for (const sql of [`SELECT * FROM ${table}`, `INSERT INTO ${table} DEFAULT VALUES`, `UPDATE ${table} SET id=id`, `DELETE FROM ${table}`]) await expect(db.exec(sql)).rejects.toMatchObject({code:'42501'});
    }
    await db.exec('RESET ROLE');
    await db.exec(`GRANT SELECT, INSERT, UPDATE, DELETE ON orders, order_contacts, order_quote_snapshots, order_events TO ${role}`);
    await db.exec(`SET ROLE ${role}`);
    for (const table of ['orders','order_contacts','order_quote_snapshots','order_events']) expect((await db.query(`SELECT * FROM ${table}`)).rows).toEqual([]);
    await expect(db.exec("INSERT INTO orders(service_slug,country,status,currency,total_minor,deposit_minor) VALUES ('airport-transfer','TH','awaiting_deposit','THB',100,30)")).rejects.toMatchObject({code:'42501'});
  });
});

describe('trusted booking submission', () => {
  it('rejects browser totals and price fields', async () => {
    vi.stubEnv('NODE_ENV','test'); vi.stubEnv('CATALOG_DATA_MODE','demo');
    expect(await submitBooking({...input,totalMinor:1})).toMatchObject({ok:false, code:'invalid'});
  });
  it('recalculates a demo confirmation from trusted current rates', async () => {
    vi.stubEnv('NODE_ENV','test'); vi.stubEnv('CATALOG_DATA_MODE','demo');
    expect(await submitBooking(input)).toMatchObject({ok:true,demo:true,status:'awaiting_deposit',totalMinor:256800,depositMinor:77040,currency:'THB'});
  });
  it('forces custom, fixed-site and armed services into assessment and rejects unpublished services', async () => {
    vi.stubEnv('NODE_ENV','test'); vi.stubEnv('CATALOG_DATA_MODE','demo');
    expect(await submitBooking({...input,serviceSlug:'risk-assessment'})).toMatchObject({ok:true,status:'assessment_requested',totalMinor:null,depositMinor:0});
    expect(await submitBooking({...input,serviceSlug:'site-guarding'})).toMatchObject({ok:true,status:'assessment_requested',totalMinor:null,depositMinor:0});
    expect(await submitBooking({...input,serviceSlug:'armed-transport',configuration:{...configuration,country:'TZ'}})).toMatchObject({ok:true,status:'assessment_requested',totalMinor:null,depositMinor:0});
    expect(await submitBooking({...input,serviceSlug:'armed-transport'})).toMatchObject({ok:false,code:'unavailable'});
  });
  it('fails closed in production even with demo mode requested', async () => {
    vi.stubEnv('NODE_ENV','production'); vi.stubEnv('CATALOG_DATA_MODE','demo');
    expect(await submitBooking({...input,locale:'zh'})).toMatchObject({ok:false,code:'unavailable'});
  });
});
