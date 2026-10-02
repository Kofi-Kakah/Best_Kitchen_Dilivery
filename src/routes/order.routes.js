import { Router } from "express";
import { checkout, getMine, getOne, patchStatus } from "../controllers/order.controllers.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";
import { validateCheckout, validateOrderId, validateOrderQuery, validateOrderStatus } from "../validators/order.validators.js";

const router = Router();
router.use(requireAuth);
router.get("/", requireRole("CUSTOMER", "RESTAURANT_OWNER", "ADMIN"), validateOrderQuery, getMine);
router.post("/checkout", requireRole("CUSTOMER"), validateCheckout, checkout);
router.get("/:orderId", requireRole("CUSTOMER", "RESTAURANT_OWNER", "ADMIN"), validateOrderId, getOne);
router.patch("/:orderId/status", requireRole("CUSTOMER", "RESTAURANT_OWNER", "ADMIN"), validateOrderId, validateOrderStatus, patchStatus);
export default router;
