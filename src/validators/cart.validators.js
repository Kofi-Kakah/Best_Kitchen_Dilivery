import { z } from "zod";

function validate(schema, source = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) return res.status(400).json({ error: "Invalid request data", details: result.error.issues.map(({ path, message }) => ({ path: path.join("."), message })) });
    if (source === "params") req.validatedParams = result.data; else req[source] = result.data;
    return next();
  };
}

export const validateCartParams = validate(z.object({ restaurantId: z.string().uuid() }), "params");
export const validateCartItemParams = validate(z.object({ cartItemId: z.string().uuid() }), "params");
export const validateAddCartItem = validate(z.object({ menuItemId: z.string().uuid(), quantity: z.number().int().min(1).max(99).default(1) }));
export const validateUpdateCartItem = validate(z.object({ quantity: z.number().int().min(0).max(99) }));
