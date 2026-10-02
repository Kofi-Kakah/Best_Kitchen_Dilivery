import jwt from "jsonwebtoken";
import { getAuthenticatedUser } from "../services/auth.services.js";
import { verifyAccessToken } from "../services/token.services.js";

export async function requireAuth(req, res, next) {
  const token = req.cookies?.accessToken;
  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const { userId } = verifyAccessToken(token);
    const user = await getAuthenticatedUser(userId);
    req.auth = { userId: user.id, role: user.role };
    return next();
    
  } catch (error) {

    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError || error?.statusCode === 401) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
    return next(error);
  }
}
