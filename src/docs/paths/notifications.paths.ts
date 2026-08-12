export const notificationPaths = {
  "/notifications/mine": {
    get: {
      tags: ["Notifications"],
      summary: "List the authenticated user's notifications",
      security: [{ bearerAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/PageParam" }, { $ref: "#/components/parameters/LimitParam" }],
      responses: { "200": { description: "Paginated list with unreadCount" } },
    },
  },
  "/notifications/{id}/read": {
    patch: {
      tags: ["Notifications"],
      summary: "Mark a notification as read",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: { "200": { description: "Marked read" }, "404": { description: "Not found" } },
    },
  },
};
