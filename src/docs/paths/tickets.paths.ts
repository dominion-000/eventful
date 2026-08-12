export const ticketPaths = {
  "/tickets": {
    post: {
      tags: ["Tickets"],
      summary: "Buy a ticket - initializes a Paystack transaction (eventee only)",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { type: "object", required: ["eventId"], properties: { eventId: { type: "string" } } },
          },
        },
      },
      responses: {
        "201": { description: "Checkout initialized - returns authorizationUrl to redirect the eventee to" },
        "400": { description: "Event not open for sales / already started / sold out" },
        "403": { description: "Not an eventee" },
        "409": { description: "Already have a ticket for this event" },
      },
    },
  },
  "/tickets/mine": {
    get: {
      tags: ["Tickets"],
      summary: "List the authenticated eventee's own tickets",
      security: [{ bearerAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/PageParam" }, { $ref: "#/components/parameters/LimitParam" }],
      responses: { "200": { description: "Paginated list" } },
    },
  },
  "/tickets/mine/{id}/qr": {
    get: {
      tags: ["Tickets"],
      summary: "Get the QR code image (base64 data URL) for a paid ticket",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: { "200": { description: "QR image data URL" }, "400": { description: "Ticket not paid for yet" } },
    },
  },
  "/tickets/mine/{id}/verify": {
    post: {
      tags: ["Tickets"],
      summary:
        "Manually check a ticket's payment status against Paystack (polling alternative to the webhook - no dashboard/ngrok setup needed)",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: { "200": { description: "Current payment status" } },
    },
  },
  "/tickets/mine/{id}/reminders": {
    patch: {
      tags: ["Tickets"],
      summary: "Set a custom reminder schedule for this ticket, overriding the event's default",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["reminderOffsetsMinutes"],
              properties: {
                reminderOffsetsMinutes: { type: "array", items: { type: "integer", minimum: 1 }, minItems: 1, maxItems: 10 },
              },
            },
          },
        },
      },
      responses: { "200": { description: "Updated" }, "422": { description: "Validation failed" } },
    },
  },
  "/tickets/event/{eventId}": {
    get: {
      tags: ["Tickets"],
      summary: "List all tickets for an event, with payment status (owning creator only)",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "eventId", in: "path", required: true, schema: { type: "string" } }],
      responses: { "200": { description: "Paginated list" }, "403": { description: "Not the owner" } },
    },
  },
  "/tickets/scan": {
    post: {
      tags: ["Tickets"],
      summary: "Scan a ticket's QR code and check the eventee in (owning creator only)",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { type: "object", required: ["qrToken"], properties: { qrToken: { type: "string" } } },
          },
        },
      },
      responses: {
        "200": { description: "Checked in" },
        "400": { description: "Invalid QR code / ticket never paid for" },
        "403": { description: "Not the owner of the ticket's event" },
        "409": { description: "Already checked in" },
      },
    },
  },
};
