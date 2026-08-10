import { z } from "zod";

export const purchaseTicketSchema = z.object({
  body: z.object({
    eventId: z.string().trim().min(1, "eventId is required"),
  }),
});

export const scanTicketSchema = z.object({
  body: z.object({
    qrToken: z.string().trim().min(1, "qrToken is required"),
  }),
});

export const setReminderSchema = z.object({
  body: z.object({
    reminderOffsetsMinutes: z
      .array(z.coerce.number().int().positive())
      .min(1)
      .max(10),
  }),
});

export type PurchaseTicketInput = z.infer<typeof purchaseTicketSchema>["body"];
export type ScanTicketInput = z.infer<typeof scanTicketSchema>["body"];
