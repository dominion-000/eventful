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

    // Overwrite with parsed (and coerced/defaulted) values
    const data = result.data as { body?: unknown };
    if (data.body) req.body = data.body;
    next();
  };
}
