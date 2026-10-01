import { authenticateUser, getAuthenticatedUser, registerUser } from "../services/auth.services.js";
import { createAccessToken, getAuthCookieOptions, getClearAuthCookieOptions } from "../services/token.services.js";

export async function register(req, res, next) {
  try {
    const user = await registerUser(req.body);
    res.cookie("accessToken", createAccessToken(user.id), getAuthCookieOptions());
    return res.status(201).json({ user });
  } catch (error) {
    return next(error);
  }
}

export async function login(req, res, next) {
  try {
    const user = await authenticateUser(req.body);
    res.cookie("accessToken", createAccessToken(user.id), getAuthCookieOptions());
    return res.status(200).json({ user });
  } catch (error) {
    return next(error);
  }
}

export function logout(_req, res) {
  res.clearCookie("accessToken", getClearAuthCookieOptions());
  return res.status(200).json({ message: "Logged out" });
}

export async function getCurrentUser(req, res, next) {
  try {
    const user = await getAuthenticatedUser(req.auth.userId);
    return res.status(200).json({ user });
  } catch (error) {
    return next(error);
  }
}
