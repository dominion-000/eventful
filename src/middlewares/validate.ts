import { Request, Response, NextFunction } from "express";
import { ZodType } from "zod";

export function validate(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      return next(result.error);
    }

    // req.query is skipped here on purpose - express 5 made it a getter,
    // can't reassign it, so validated query goes on req.validatedQuery instead
    const data = result.data as { body?: unknown; query?: unknown };
    if (data.body) req.body = data.body;
    if (data.query)
      req.validatedQuery = data.query as unknown as Record<string, unknown>;
    next();
  };
}
