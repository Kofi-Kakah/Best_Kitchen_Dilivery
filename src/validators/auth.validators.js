import { z } from "zod";

const registrationSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(72),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  phone: z.string().trim().max(30).nullable().optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(72),
});

function validate(schema) {
  return function validateAuthRequest(req, res, next) {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: "Invalid request body",
        details: result.error.issues.map(({ path, message }) => ({ path: path.join("."), message })),
      });
    }

    req.body = result.data;
    return next();
  };
}

export const validateRegistration = validate(registrationSchema);

export const validateLogin = validate(loginSchema);
