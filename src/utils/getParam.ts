import { Request } from "express";
import { AppError } from "./AppError";

export function getParam(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== "string") {
    throw AppError.badRequest(`Invalid or missing route parameter: ${name}`);
  }
  return value;
}
