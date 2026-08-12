export const analyticsPaths = {
  "/analytics/overview": {
    get: {
      tags: ["Analytics"],
      summary: "All-time totals across every event the creator owns",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": { description: "totalEvents, totalTicketsSold, totalRevenueNaira, totalCheckedIn, checkInRate" },
        "403": { description: "Not a creator" },
      },
    },
  },
  "/analytics/events/{id}": {
    get: {
      tags: ["Analytics"],
      summary: "Per-event breakdown (owning creator only)",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        "200": { description: "ticketsSold, revenueNaira, checkedIn, capacityUtilization, checkInRate" },
        "403": { description: "Not the owner" },
      },
    },
  },
};
