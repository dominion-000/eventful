import { z } from 'zod';

export const purchaseTicketSchema = z.object({
  body: z.object({
    eventId: z.string().trim().min(1, 'eventId is required'),
  }),
});

export const scanTicketSchema = z.object({
  body: z.object({
    qrToken: z.string().trim().min(1, 'qrToken is required'),
  }),
});

export type PurchaseTicketInput = z.infer<typeof purchaseTicketSchema>['body'];
export type ScanTicketInput = z.infer<typeof scanTicketSchema>['body'];
