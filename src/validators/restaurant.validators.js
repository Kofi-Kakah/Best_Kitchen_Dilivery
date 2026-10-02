import { z } from "zod";

const optionalText = (max) => z.string().trim().max(max).nullable().optional();
const restaurantFields = {
  name: z.string().trim().min(1).max(150),
  description: optionalText(2000),
  phone: optionalText(30),
  email: z.string().trim().email().max(254).nullable().optional(),
  street: z.string().trim().min(1).max(200),
  city: z.string().trim().min(1).max(100),
  region: optionalText(100),
  postalCode: optionalText(30),
  country: z.string().trim().min(1).max(100),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  cuisine: optionalText(100),
  imageUrl: z.string().url().max(2048).nullable().optional(),
};

const restaurantUpdateFields = {
  ...restaurantFields,
  isAcceptingOrders: z.boolean().optional(),
};

const idParams = z.object({ restaurantId: z.string().uuid() });

function validate(schema, source = "body") {
  return function validateRestaurantRequest(req, res, next) {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(400).json({
        error: "Invalid request data",
        details: result.error.issues.map(({ path, message }) => ({ path: path.join("."), message })),
      });
    }
    if (source === "query") {
      req.validatedQuery = result.data;
    } else {
      req[source] = result.data;
    }
    return next();
  };
}

export const validateRestaurantId = validate(idParams, "params");
export const validateRestaurantQuery = validate(z.object({
  city: z.string().trim().min(1).max(100).optional(),
  cuisine: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}), "query");
export const validateCreateRestaurant = validate(z.object({
  name: restaurantFields.name,
  street: restaurantFields.street,
  city: restaurantFields.city,
  country: restaurantFields.country,
  ...Object.fromEntries(Object.entries(restaurantFields).filter(([key]) => !["name", "street", "city", "country"].includes(key))),
}));
export const validateUpdateRestaurant = validate(z.object(restaurantUpdateFields).partial().refine((data) => Object.keys(data).length > 0, "Provide at least one field to update"));
export const validateRestaurantStatus = validate(z.object({ status: z.enum(["PENDING", "ACTIVE", "PAUSED", "CLOSED"]) }));
