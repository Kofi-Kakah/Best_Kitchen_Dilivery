import { Router } from "express";
import { accept, assign, createForOrder, getAll, getAvailable, getMine, getOne, markCompleted, markPickedUp } from "../controllers/delivery.controllers.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";
import { validateDeliveryId, validateDeliveryNote, validateDeliveryQuery, validateDriverAssignment, validateOrderId } from "../validators/delivery.validators.js";

const router = Router();

router.use(requireAuth);
router.get("/mine", requireRole("CUSTOMER"), getMine);
router.get("/available", requireRole("DRIVER"), validateDeliveryQuery, getAvailable);
router.get("/", requireRole("ADMIN"), validateDeliveryQuery, getAll);
router.post("/orders/:orderId", requireRole("ADMIN"), validateOrderId, createForOrder);
router.get("/:deliveryId", validateDeliveryId, getOne);
router.post("/:deliveryId/accept", requireRole("DRIVER"), validateDeliveryId, accept);
router.post("/:deliveryId/pickup", requireRole("DRIVER"), validateDeliveryId, validateDeliveryNote, markPickedUp);
router.post("/:deliveryId/complete", requireRole("DRIVER"), validateDeliveryId, validateDeliveryNote, markCompleted);
router.patch("/:deliveryId/assign", requireRole("ADMIN"), validateDeliveryId, validateDriverAssignment, assign);

export default router;
