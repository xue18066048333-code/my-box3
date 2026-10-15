import {z} from 'zod';
import {serviceSlugs} from '@/features/catalog/content';

const optionalText = (max: number) => z.string().trim().max(max).optional().transform(value => value || undefined);
export const bookingSchema = z.object({
  serviceSlug: z.enum(serviceSlugs),
  locale: z.enum(['en','zh','th','sw']),
  configuration: z.object({
    country: z.enum(['TZ','TH']), people:z.number().int().min(1).max(1000),
    days:z.number().int().min(1).max(365), hoursPerDay:z.number().int().min(1).max(24),
    vehicles:z.number().int().min(0).max(100), armed:z.boolean(),
  }).strict(),
  contact: z.object({
    name:z.string().trim().min(1).max(200), phone:optionalText(80),
    email:optionalText(254).refine(value => !value || z.email().safeParse(value).success),
    wechat:optionalText(100), whatsapp:optionalText(80),
  }).strict().refine(contact => Boolean(contact.phone || contact.email), {path:['phone']}),
}).strict();

export type BookingInput = z.input<typeof bookingSchema>;
export type BookingStatus = 'awaiting_deposit' | 'assessment_requested';
