import bcrypt from "bcrypt";
import {
  createCustomerUser,
  findUserByEmail,
  findPublicUserById,
} from "./user.services.js";

const PASSWORD_HASH_ROUNDS = 12;
const publicUserFields = ["id", "email", "firstName", "lastName", "phone", "role", "createdAt"];

export class AuthServiceError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "AuthServiceError";
    this.statusCode = statusCode;
  }
}

function normalizeUser(user) {
  return Object.fromEntries(publicUserFields.map((field) => [field, user[field]]));
}

export async function registerUser(input = {}) {
  const { email, password, firstName, lastName, phone } = input;
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    typeof firstName !== "string" ||
    typeof lastName !== "string"
  ) {
    throw new AuthServiceError("Email, password, first name, and last name are required", 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedFirstName = firstName.trim();
  const normalizedLastName = lastName.trim();
  const normalizedPhone = typeof phone === "string" && phone.trim() ? phone.trim() : null;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new AuthServiceError("Enter a valid email address", 400);
  }
  if (password.length < 8) {
    throw new AuthServiceError("Password must be at least 8 characters long", 400);
  }
  if (!normalizedFirstName || !normalizedLastName) {
    throw new AuthServiceError("First name and last name cannot be empty", 400);
  }
  if (normalizedPhone && normalizedPhone.length > 30) {
    throw new AuthServiceError("Phone number is too long", 400);
  }

  const passwordHash = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
  try {
    return await createCustomerUser({
      email: normalizedEmail,
      passwordHash,
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      phone: normalizedPhone,
    });
  } catch (error) {
    if (error?.code === "P2002") {
      throw new AuthServiceError("An account with that email or phone already exists", 409);
    }
    throw error;
  }
}

export async function authenticateUser(input = {}) {
  const { email, password } = input;
  if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
    throw new AuthServiceError("Email and password are required", 400);
  }

  const user = await findUserByEmail(email.trim().toLowerCase());
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AuthServiceError("Invalid email or password", 401);
  }

  return normalizeUser(user);
}

export async function getAuthenticatedUser(userId) {
  const user = await findPublicUserById(userId);
  if (!user) {
    throw new AuthServiceError("User account no longer exists", 401);
  }
  return user;
}
