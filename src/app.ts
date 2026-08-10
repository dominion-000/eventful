import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";

import { env } from "./config/env";
import { globalLimiter } from "./middlewares/rateLimiter";
import { notFound } from "./middlewares/notFound";
import { errorHandler } from "./middlewares/errorHandler";
import authRoutes from "./routes/auth.routes";
import eventRoutes from "./routes/event.routes";
import ticketRoutes from "./routes/ticket.routes";
import { paystackWebhook } from "./controllers/ticket.controller";

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
    express.raw({ type: "application/json" }),
    paystackWebhook
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(compression());

  if (env.NODE_ENV !== "test") {
    app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined"));
  }

  app.use(globalLimiter);

  // Health check
  app.get("/health", (req: Request, res: Response) => {
    res.status(200).json({ success: true, message: "Eventful is OK" });
  });

  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/events", eventRoutes);
  app.use("/api/v1/tickets", ticketRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
