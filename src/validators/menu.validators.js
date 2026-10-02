import { z } from "zod";

const categoryFields = {
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(1000).nullable().optional(),
  sortOrder: z.number().int().min(0).max(100000).optional(),
  isAvailable: z.boolean().optional(),
};

const itemFields = {
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(2000).nullable().optional(),
  price: z.number().finite().positive().max(99999999.99),
  categoryId: z.string().uuid().nullable().optional(),
  imageUrl: z.string().url().max(2048).nullable().optional(),
  isAvailable: z.boolean().optional(),
};

function validate(schema, source = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(400).json({
        error: "Invalid request data",
        details: result.error.issues.map(({ path, message }) => ({ path: path.join("."), message })),
      });
    }
    if (source === "params") req.validatedParams = result.data;
    else req[source] = result.data;
    return next();
  };
}

const idParams = z.object({
  restaurantId: z.string().uuid(),
  menuItemId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
});

export const validateMenuParams = validate(idParams, "params");
export const validateCreateMenuItem = validate(z.object({ name: itemFields.name, price: itemFields.price, ...Object.fromEntries(Object.entries(itemFields).filter(([key]) => !["name", "price"].includes(key))) }));
export const validateUpdateMenuItem = validate(z.object(itemFields).partial().refine((data) => Object.keys(data).length > 0, "Provide at least one field to update"));
export const validateCreateMenuCategory = validate(z.object({ name: categoryFields.name, ...Object.fromEntries(Object.entries(categoryFields).filter(([key]) => key !== "name")) }));
export const validateUpdateMenuCategory = validate(z.object(categoryFields).partial().refine((data) => Object.keys(data).length > 0, "Provide at least one field to update"));
