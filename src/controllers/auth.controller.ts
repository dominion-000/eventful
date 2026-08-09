import { Request, Response } from "express";
import { catchAsync } from "../utils/catchAsync";
import { toPublicUser } from "../utils/serializers";
import { AppError } from "../utils/AppError";
import { User } from "../models/User";
import {
  registerUser,
  loginUser,
  refreshTokens,
  logoutUser,
} from "../services/auth.service";
import { env } from "../config/env";

const REFRESH_COOKIE_NAME = "eventful_refresh";
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/api/v1/auth",
};

export const register = catchAsync(async (req: Request, res: Response) => {
  const { user, tokens } = await registerUser(req.body);

  res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, REFRESH_COOKIE_OPTIONS);
  res.status(201).json({
    success: true,
    message: "Account created successfully",
    data: { user: toPublicUser(user), accessToken: tokens.accessToken },
  });
});

export const login = catchAsync(async (req: Request, res: Response) => {
  const { user, tokens } = await loginUser(req.body);

  res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, REFRESH_COOKIE_OPTIONS);
  res.status(200).json({
    success: true,
    message: "Logged in successfully",
    data: { user: toPublicUser(user), accessToken: tokens.accessToken },
  });
});

export const refresh = catchAsync(async (req: Request, res: Response) => {
  const incomingToken = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!incomingToken) {
    throw AppError.unauthorized("No refresh token provided");
  }

  const { user, tokens } = await refreshTokens(incomingToken);

  res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, REFRESH_COOKIE_OPTIONS);
  res.status(200).json({
    success: true,
    message: "Token refreshed",
    data: { user: toPublicUser(user), accessToken: tokens.accessToken },
  });
});

export const logout = catchAsync(async (req: Request, res: Response) => {
  if (req.user) {
    await logoutUser(req.user.id);
  }
  res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/v1/auth" });
  res.status(200).json({ success: true, message: "Logged out successfully" });
});

export const me = catchAsync(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id);
  if (!user) {
    throw AppError.notFound("User not found");
  }
  res.status(200).json({ success: true, data: { user: toPublicUser(user) } });
});
