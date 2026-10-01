import jwt from "jsonwebtoken";

const TOKEN_LIFETIME = "7d";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET must be set");
  }
  return secret;
}

export function createAccessToken(userId) {
  return jwt.sign({}, getJwtSecret(), {
    subject: userId,
    expiresIn: TOKEN_LIFETIME,
  });
}

export function verifyAccessToken(token) {
  const payload = jwt.verify(token, getJwtSecret());
  if (typeof payload !== "object" || typeof payload.sub !== "string") {
    throw new jwt.JsonWebTokenError("Token subject is missing");
  }
  return { userId: payload.sub };
}

export function getAuthCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  };
}

export function getClearAuthCookieOptions() {
  const { maxAge: _maxAge, ...options } = getAuthCookieOptions();
  return options;
}
