import { Router } from "express";
import { createPaymentIntent, getPayment, stripeWebhook } from "../controllers/payment.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";
import { validateOrderId } from "../validators/order.validators.js";

const router = Router();

// This public route is verified using Stripe's signature, not a user session.
router.post("/webhook", stripeWebhook);

router.use(requireAuth);
router.get("/:orderId", requireRole("CUSTOMER", "ADMIN"), validateOrderId, getPayment);
router.post("/:orderId/intent", requireRole("CUSTOMER"), validateOrderId, createPaymentIntent);

export default router;
