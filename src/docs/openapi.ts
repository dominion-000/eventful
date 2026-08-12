/**
 * Hand-written OpenAPI 3.0 spec, assembled from per-resource files in
 * ./paths/ and shared definitions in ./components.ts.
 */
import { components } from "./components";
import { authPaths } from "./paths/auth.paths";
import { eventPaths } from "./paths/events.paths";
import { ticketPaths } from "./paths/tickets.paths";
import { paymentPaths } from "./paths/payments.paths";
import { notificationPaths } from "./paths/notifications.paths";
import { analyticsPaths } from "./paths/analytics.paths";

export const openapiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Eventful API",
    version: "1.0.0",
    description:
      "Ticketing platform for concerts, theater, sports, and cultural events. " +
      "Creators publish events, eventees discover and buy tickets, QR codes handle check-in.",
  },
  servers: [{ url: "/api/v1" }],
  tags: [
    { name: "Auth" },
    { name: "Events" },
    { name: "Tickets" },
    { name: "Payments" },
    { name: "Notifications" },
    { name: "Analytics" },
  ],
  components,
  paths: {
    ...authPaths,
    ...eventPaths,
    ...ticketPaths,
    ...paymentPaths,
    ...notificationPaths,
    ...analyticsPaths,
  },
};
