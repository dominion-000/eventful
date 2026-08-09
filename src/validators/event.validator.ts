import { z } from "zod";

const categoryEnum = z.enum([
  "concert",
  "theater",
  "sports",
  "cultural",
  "other",
]);

export const createEventSchema = z.object({
  body: z
    .object({
      title: z.string().trim().min(3).max(150),
      description: z.string().trim().min(1).max(5000),
      category: categoryEnum,
      venue: z.string().trim().min(1),
      startDate: z.coerce.date().refine((d) => d.getTime() > Date.now(), {
        message: "startDate must be in the future",
      }),
      endDate: z.coerce.date().optional(),
      capacity: z.coerce.number().int().min(1),
      ticketPriceNaira: z.coerce.number().min(0).default(0),
      reminderOffsetsMinutes: z
        .array(z.coerce.number().int().positive())
        .min(1)
        .max(10)
        .default([1440]),
      status: z.enum(["draft", "published"]).default("draft"),
    })
    .refine((data) => !data.endDate || data.endDate >= data.startDate, {
      message: "endDate cannot be before startDate",
      path: ["endDate"],
    }),
});

export const updateEventSchema = z.object({
  body: z
    .object({
      title: z.string().trim().min(3).max(150).optional(),
      description: z.string().trim().min(1).max(5000).optional(),
      category: categoryEnum.optional(),
      venue: z.string().trim().min(1).optional(),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
      capacity: z.coerce.number().int().min(1).optional(),
      ticketPriceNaira: z.coerce.number().min(0).optional(),
      reminderOffsetsMinutes: z
        .array(z.coerce.number().int().positive())
        .min(1)
        .max(10)
        .optional(),
      status: z.enum(["draft", "published"]).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "No fields provided to update",
    }),
});

export const listEventsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    category: categoryEnum.optional(),
    search: z.string().trim().min(1).max(150).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  }),
});

export type CreateEventInput = z.infer<typeof createEventSchema>["body"];
export type UpdateEventInput = z.infer<typeof updateEventSchema>["body"];
export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>["query"];
