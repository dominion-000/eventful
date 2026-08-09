import bcrypt from "bcryptjs";
import { User, IUser } from "../models/User";
import { AppError } from "../utils/AppError";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt";
import { RegisterInput, LoginInput } from "../validators/auth.validator";

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

function issueTokens(user: IUser): AuthTokens {
  const payload = { sub: user._id.toString(), role: user.role };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

export async function registerUser(input: RegisterInput) {
  const existing = await User.findOne({ email: input.email });
  if (existing) {
    throw AppError.conflict("An account with this email already exists");
  }

  const user = await User.create(input);
  const tokens = issueTokens(user);
  user.refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
  await user.save();

  return { user, tokens };
}

export async function loginUser(input: LoginInput) {
  const user = await User.findOne({ email: input.email }).select(
    "+password +refreshTokenHash",
  );
  if (!user) {
    throw AppError.unauthorized("Invalid email or password");
  }

  const validPassword = await user.comparePassword(input.password);
  if (!validPassword) {
    throw AppError.unauthorized("Invalid email or password");
  }

  const tokens = issueTokens(user);
  user.refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
  await user.save();

  return { user, tokens };
}

export async function refreshTokens(incomingToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(incomingToken);
  } catch {
    throw AppError.unauthorized("Invalid or expired refresh token");
  }

  const user = await User.findById(payload.sub).select("+refreshTokenHash");
  if (!user || !user.refreshTokenHash) {
    throw AppError.unauthorized("Session not found, please log in again");
  }

  const matches = await bcrypt.compare(incomingToken, user.refreshTokenHash);
  if (!matches) {
    // token got reused/stolen probably - kill the session instead of trusting it
    user.refreshTokenHash = null;
    await user.save();
    throw AppError.unauthorized("Refresh token invalid, please log in again");
  }

  const tokens = issueTokens(user);
  user.refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
  await user.save();

  return { user, tokens };
}

export async function logoutUser(userId: string) {
  await User.findByIdAndUpdate(userId, { refreshTokenHash: null });
}
