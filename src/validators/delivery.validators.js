import { z } from "zod";

function validate(schema, source = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(400).json({
        error: "Invalid request data",
        details: result.error.issues.map(({ path, message }) => ({ path: path.join("."), message })),
      });
    }
    if (source === "query") req.validatedQuery = result.data;
    else req[source] = result.data;
    return next();
  };
}

const coordinates = {
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
};

export const validateDriverProfile = validate(z.object({
  vehicleType: z.string().trim().min(1).max(80).nullable().optional(),
  vehicleDetails: z.string().trim().max(300).nullable().optional(),
  licenseNumber: z.string().trim().min(1).max(100).nullable().optional(),
}).refine((value) => Object.keys(value).length > 0, "Provide at least one profile field"));

export const validateAvailability = validate(z.object({ availability: z.enum(["ONLINE", "OFFLINE"]) }));
export const validateLocation = validate(z.object(coordinates));
export const validateDeliveryId = validate(z.object({ deliveryId: z.string().uuid() }), "params");
export const validateOrderId = validate(z.object({ orderId: z.string().uuid() }), "params");
export const validateDeliveryNote = validate(z.object({ note: z.string().trim().max(500).optional() }));
export const validateDriverAssignment = validate(z.object({ driverId: z.string().uuid() }));
export const validateDeliveryQuery = validate(z.object({
  status: z.enum(["PENDING", "ASSIGNED", "ACCEPTED", "PICKED_UP", "COMPLETED", "CANCELLED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}), "query");
