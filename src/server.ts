import { eventful } from "./app";
import { env } from "./config/env";
import { connectDB, disconnectDB } from "./config/db";
import { redis } from "./config/redis";

async function bootstrap() {
  await connectDB();

  const app = eventful();

  const server = app.listen(env.PORT, () => {
    console.log(`Eventful API running on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down...`);
    server.close(async () => {
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
