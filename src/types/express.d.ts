import { UserRole } from "../models/User";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: UserRole;
      };
      /** Set by the `validate` middleware - coerced/defaulted query params. */
      validatedQuery?: Record<string, unknown>;
    }
  }
}

export {};
