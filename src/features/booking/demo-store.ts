import {isDemoMode} from '@/features/catalog/data';

// Ephemeral, process-local demo adapter. No lookup endpoint or access credential is exposed.
const demoBookings = new Map<string, {serialized:string; expiresAt:number}>();
export function saveDemoBooking(booking:{orderId:string; [key:string]:unknown}) {
  if (!isDemoMode()) throw new Error('Demo bookings disabled');
  const now = Date.now();
  for (const [id,record] of demoBookings) if (record.expiresAt <= now) demoBookings.delete(id);
  if (demoBookings.size >= 500) throw new Error('Demo capacity reached');
  // Serialize once so subsequent mutations cannot alter the captured snapshot.
  demoBookings.set(booking.orderId,{serialized:JSON.stringify({...booking,event:{type:'booking_created'}}),expiresAt:now + 60*60*1000});
}
