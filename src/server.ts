import http from "http";
import { eventful } from "./app";
import { env } from "./config/env";
import { connectDB, disconnectDB } from "./config/db";
import { redis } from "./config/redis";
import { initSocket } from "./socket";
import { startReminderJob, stopReminderJob } from "./jobs/reminder.job";

async function bootstrap() {
  await connectDB();

  const app = eventful();
  const httpServer = http.createServer(app);

  initSocket(httpServer);
  startReminderJob();

  httpServer.listen(env.PORT, () => {
    console.log(`Eventful API running on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down...`);
    stopReminderJob();
    httpServer.close(async () => {
      await disconnectDB();
      redis.disconnect();
      console.log("Shutdown complete");
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled Rejection:", reason);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
