export const eventPaths = {
  "/events": {
    get: {
      tags: ["Events"],
      summary: "Browse published events (public)",
      parameters: [
        { $ref: "#/components/parameters/PageParam" },
        { $ref: "#/components/parameters/LimitParam" },
        { name: "category", in: "query", schema: { type: "string", enum: ["concert", "theater", "sports", "cultural", "other"] } },
        { name: "search", in: "query", schema: { type: "string" } },
        { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
        { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
      ],
      responses: {
        "200": {
          description: "Paginated list of published events",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  data: {
                    type: "object",
                    properties: {
                      items: { type: "array", items: { $ref: "#/components/schemas/Event" } },
                      pagination: { $ref: "#/components/schemas/Pagination" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    post: {
      tags: ["Events"],
      summary: "Create an event (creator only)",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["title", "description", "category", "venue", "startDate", "capacity"],
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                category: { type: "string", enum: ["concert", "theater", "sports", "cultural", "other"] },
                venue: { type: "string" },
                startDate: { type: "string", format: "date-time" },
                endDate: { type: "string", format: "date-time" },
                capacity: { type: "integer", minimum: 1 },
                ticketPriceNaira: { type: "number", minimum: 0, default: 0 },
                reminderOffsetsMinutes: { type: "array", items: { type: "integer" }, default: [1440] },
                status: { type: "string", enum: ["draft", "published"], default: "draft" },
              },
            },
          },
        },
      },
      responses: {
        "201": { description: "Event created" },
        "401": { description: "Not authenticated" },
        "403": { description: "Not a creator" },
        "422": { description: "Validation failed" },
      },
    },
  },
  "/events/mine": {
    get: {
      tags: ["Events"],
      summary: "List the authenticated creator's own events",
      security: [{ bearerAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/PageParam" }, { $ref: "#/components/parameters/LimitParam" }],
      responses: { "200": { description: "Paginated list" }, "403": { description: "Not a creator" } },
    },
  },
  "/events/{id}": {
    get: {
      tags: ["Events"],
      summary: "Get a single event by id (public)",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: { "200": { description: "Event" }, "404": { description: "Not found" } },
    },
    patch: {
      tags: ["Events"],
      summary: "Update an event (owning creator only)",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        "200": { description: "Updated" },
        "403": { description: "Not the owner" },
        "422": { description: "Validation failed / no fields provided" },
      },
    },
    delete: {
      tags: ["Events"],
      summary: "Permanently delete an event (owning creator only, draft events only)",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        "204": { description: "Deleted" },
        "400": { description: "Only draft events can be hard-deleted" },
        "403": { description: "Not the owner" },
      },
    },
  },
  "/events/{id}/cancel": {
    post: {
      tags: ["Events"],
      summary: "Cancel a published event (owning creator only, soft delete)",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: { "200": { description: "Cancelled" }, "403": { description: "Not the owner" } },
    },
  },
  "/events/{id}/share": {
    get: {
      tags: ["Events"],
      summary: "Get pre-built share links for an event (public)",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        "200": { description: "Share URL and per-platform links (whatsapp, x, facebook, linkedin, telegram)" },
      },
    },
  },
};
