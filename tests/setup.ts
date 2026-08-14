import path from "path";
import dotenv from "dotenv";

dotenv.config({
  path: path.resolve(__dirname, "..", ".env"),
  quiet: true,
});

// Forced regardless of what NODE_ENV .env itself sets, so error responses
// stay in test-safe shape (no stack traces leaking) and morgan stays quiet.
process.env.NODE_ENV = "test";

const required = [
  "MONGO_URI",
  "REDIS_URL",
  "PAYSTACK_SECRET_KEY",
  "QR_SIGNING_SECRET",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
];
const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  throw new Error(
    `tests requires real credentials in .env at the project root. Missing: ${missing.join(", ")}.`,
  );
}
