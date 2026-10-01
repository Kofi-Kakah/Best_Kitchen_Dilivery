import jwt from "jsonwebtoken";
import { verifyAccessToken } from "../services/token.services.js";

export function requireAuth(req, res, next) {
  const token = req.cookies?.accessToken;
  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    req.auth = verifyAccessToken(token);
    return next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
    return next(error);
  }
}
