import { Router } from "express";
import { addItem, deleteCart, deleteItem, getMine, patchItem } from "../controllers/cart.controllers.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";
import { validateAddCartItem, validateCartItemParams, validateCartParams, validateUpdateCartItem } from "../validators/cart.validators.js";

const router = Router();
router.use(requireAuth, requireRole("CUSTOMER"));
router.get("/", getMine);
router.delete("/", deleteCart);
router.get("/:restaurantId", validateCartParams, getMine);
router.post("/:restaurantId/items", validateCartParams, validateAddCartItem, addItem);
router.delete("/items/:cartItemId", validateCartItemParams, deleteItem);
router.patch("/items/:cartItemId", validateCartItemParams, validateUpdateCartItem, patchItem);
router.delete("/:restaurantId", validateCartParams, deleteCart);
export default router;
