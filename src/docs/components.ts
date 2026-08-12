export const components = {
  securitySchemes: {
    bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
  },
  schemas: {
    Error: {
      type: "object",
      properties: {
        success: { type: "boolean", example: false },
        message: { type: "string" },
      },
    },
    User: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        email: { type: "string", format: "email" },
        role: { type: "string", enum: ["creator", "eventee"] },
        createdAt: { type: "string", format: "date-time" },
      },
    },
    Event: {
      type: "object",
      properties: {
        _id: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
        category: {
          type: "string",
          enum: ["concert", "theater", "sports", "cultural", "other"],
        },
        venue: { type: "string" },
        startDate: { type: "string", format: "date-time" },
        endDate: { type: "string", format: "date-time", nullable: true },
        capacity: { type: "integer", minimum: 1 },
        ticketPriceNaira: { type: "number", minimum: 0 },
        reminderOffsetsMinutes: {
          type: "array",
          items: { type: "integer" },
          description: "Minutes before startDate to send a reminder, e.g. 1440 = 1 day",
        },
        status: { type: "string", enum: ["draft", "published", "cancelled"] },
        creator: { type: "string", description: "Creator's user id" },
      },
    },
    Ticket: {
      type: "object",
      properties: {
        _id: { type: "string" },
        event: { type: "string" },
        eventee: { type: "string" },
        amountNaira: { type: "number" },
        paymentStatus: { type: "string", enum: ["pending", "success", "failed"] },
        checkedIn: { type: "boolean" },
        checkedInAt: { type: "string", format: "date-time", nullable: true },
      },
    },
    Notification: {
      type: "object",
      properties: {
        _id: { type: "string" },
        type: { type: "string", enum: ["reminder", "ticket_confirmed", "ticket_scanned"] },
        message: { type: "string" },
        read: { type: "boolean" },
        createdAt: { type: "string", format: "date-time" },
      },
    },
    Pagination: {
      type: "object",
      properties: {
        page: { type: "integer" },
        limit: { type: "integer" },
        total: { type: "integer" },
        totalPages: { type: "integer" },
      },
    },
  },
  parameters: {
    PageParam: {
      name: "page",
      in: "query",
      schema: { type: "integer", minimum: 1, default: 1 },
    },
    LimitParam: {
      name: "limit",
      in: "query",
      schema: { type: "integer", minimum: 1, maximum: 50, default: 10 },
    },
  },
};
