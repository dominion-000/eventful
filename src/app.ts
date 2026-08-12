import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";

import { env } from "./config/env";
import { globalLimiter, webhookLimiter } from "./middlewares/rateLimiter";
import { notFound } from "./middlewares/notFound";
import { errorHandler } from "./middlewares/errorHandler";
import authRoutes from "./routes/auth.routes";
import eventRoutes from "./routes/event.routes";
import ticketRoutes from "./routes/ticket.routes";
import notificationRoutes from "./routes/notification.routes";
import analyticsRoutes from "./routes/analytics.routes";
import { paystackWebhook } from "./controllers/ticket.controller";
import { openapiSpec } from "./docs/openapi";

export function eventful(): Application {
  const app = express();

  // Core middleware
  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_URL, credentials: true }));

  // Paystack webhook needs the raw request bytes to verify the signature -
  // it MUST be registered before express.json() below, or json() will have
  // already consumed and re-serialized the body by the time this runs.
  app.post(
    "/api/v1/payments/webhook",
    webhookLimiter,
    express.raw({ type: "application/json" }),
    paystackWebhook,
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(compression());

  if (env.NODE_ENV !== "test") {
    app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined"));
  }

  // API docs - registered before the global rate limiter, since it's just
  // static UI/JSON and shouldn't count against the same budget as real endpoints
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec));
  app.get("/docs.json", (req: Request, res: Response) => {
    res.status(200).json(openapiSpec);
  });

  app.use(globalLimiter);

  // Health check
  app.get("/health", (req: Request, res: Response) => {
    res.status(200).json({ success: true, message: "Eventful is OK" });
  });

  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/events", eventRoutes);
  app.use("/api/v1/tickets", ticketRoutes);
  app.use("/api/v1/notifications", notificationRoutes);
  app.use("/api/v1/analytics", analyticsRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
