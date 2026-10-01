import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma.js";
import { createAccessToken, getAuthCookieOptions } from "../middleware/require-auth.js";

const PASSWORD_HASH_ROUNDS = 12;

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export async function register(req, res, next) {
  try {
    const { email, password, firstName, lastName, phone } = req.body ?? {};
    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof firstName !== "string" ||
      typeof lastName !== "string"
    ) {
      return res.status(400).json({ error: "Email, password, first name, and last name are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();
    const normalizedPhone = typeof phone === "string" && phone.trim() ? phone.trim() : null;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ error: "Enter a valid email address" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters long" });
    }
    if (!normalizedFirstName || !normalizedLastName) {
      return res.status(400).json({ error: "First name and last name cannot be empty" });
    }
    if (normalizedPhone && normalizedPhone.length > 30) {
      return res.status(400).json({ error: "Phone number is too long" });
    }

    const passwordHash = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        phone: normalizedPhone,
        // The public endpoint only creates customer accounts; privileged roles
        // are assigned through trusted administrative flows.
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    const token = createAccessToken(user.id);
    res.cookie("accessToken", token, getAuthCookieOptions());
    return res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    if (error?.code === "P2002") {
      return res.status(409).json({ error: "An account with that email or phone already exists" });
    }
    return next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body ?? {};
    if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = createAccessToken(user.id);
    res.cookie("accessToken", token, getAuthCookieOptions());
    return res.status(200).json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
}

export function logout(_req, res) {
  const { maxAge: _maxAge, ...clearOptions } = getAuthCookieOptions();
  res.clearCookie("accessToken", clearOptions);
  return res.status(200).json({ message: "Logged out" });
}

export async function getCurrentUser(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: "User account no longer exists" });
    }
    return res.status(200).json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
}
