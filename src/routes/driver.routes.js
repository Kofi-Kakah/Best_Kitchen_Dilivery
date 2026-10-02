import { Router } from "express";
import { getDeliveries, getMe, setAvailability, updateLocation, updateMe } from "../controllers/driver.controllers.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";
import { validateAvailability, validateDeliveryQuery, validateDriverProfile, validateLocation } from "../validators/delivery.validators.js";

const router = Router();
router.use(requireAuth, requireRole("DRIVER"));
router.get("/me", getMe);
router.patch("/me", validateDriverProfile, updateMe);
router.patch("/availability", validateAvailability, setAvailability);
router.post("/location", validateLocation, updateLocation);
router.get("/deliveries", validateDeliveryQuery, getDeliveries);

export default router;
