import { z } from "zod";

function validate(schema, source = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) return res.status(400).json({ error: "Invalid request data", details: result.error.issues.map(({ path, message }) => ({ path: path.join("."), message })) });
    if (source === "params") req.validatedParams = result.data; else if (source === "query") req.validatedQuery = result.data; else req.body = result.data;
    return next();
  };
}

const address = z.object({
  street: z.string().trim().min(1).max(200), apartment: z.string().trim().max(100).nullable().optional(),
  city: z.string().trim().min(1).max(100), region: z.string().trim().max(100).nullable().optional(),
  postalCode: z.string().trim().max(30).nullable().optional(), country: z.string().trim().min(1).max(100),
  instructions: z.string().trim().max(500).nullable().optional(),
});

export const validateCheckout = validate(z.object({
  restaurantId: z.string().uuid(),
  addressId: z.string().uuid().optional(),
  address: address.optional(),
  paymentMethod: z.enum(["CARD", "CASH", "WALLET"]),
  tip: z.number().finite().min(0).max(999999.99).default(0),
}).refine((value) => Boolean(value.addressId) !== Boolean(value.address), { message: "Provide either addressId or address", path: ["address"] }));

export const validateOrderId = validate(z.object({ orderId: z.string().uuid() }), "params");
export const validateOrderStatus = validate(z.object({ status: z.enum(["CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "CANCELLED"]) }));
export const validateOrderQuery = validate(z.object({
  status: z.enum(["PLACED", "CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"]).optional(),
  page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20),
}), "query");
