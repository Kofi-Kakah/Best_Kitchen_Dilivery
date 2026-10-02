import { Router } from "express";
import {
  getCategories,
  getMenu,
  patchMenuCategory,
  patchMenuItem,
  postMenuCategory,
  postMenuItem,
  removeMenuCategory,
  removeMenuItem,
} from "../controllers/menu.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";
import {
  validateCreateMenuCategory,
  validateCreateMenuItem,
  validateMenuParams,
  validateUpdateMenuCategory,
  validateUpdateMenuItem,
} from "../validators/menu.validators.js";

const menuRouter = Router({ mergeParams: true });
const ownerOrAdmin = [requireAuth, requireRole("RESTAURANT_OWNER", "ADMIN"), validateMenuParams];

menuRouter.get("/", validateMenuParams, getMenu);
menuRouter.get("/categories", validateMenuParams, getCategories);
menuRouter.post("/", ...ownerOrAdmin, validateCreateMenuItem, postMenuItem);
menuRouter.patch("/:menuItemId", ...ownerOrAdmin, validateUpdateMenuItem, patchMenuItem);
menuRouter.delete("/:menuItemId", ...ownerOrAdmin, removeMenuItem);
menuRouter.post("/categories", ...ownerOrAdmin, validateCreateMenuCategory, postMenuCategory);
menuRouter.patch("/categories/:categoryId", ...ownerOrAdmin, validateUpdateMenuCategory, patchMenuCategory);
menuRouter.delete("/categories/:categoryId", ...ownerOrAdmin, removeMenuCategory);

export default menuRouter;
