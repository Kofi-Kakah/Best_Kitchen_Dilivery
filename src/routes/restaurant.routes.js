import { Router } from "express";
import {
  browseRestaurants,
  createRestaurant,
  getMyRestaurants,
  getRestaurant,
  setRestaurantStatus,
  updateRestaurant,
} from "../controllers/restaurant.controllers.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";
import {
  validateCreateRestaurant,
  validateRestaurantId,
  validateRestaurantQuery,
  validateRestaurantStatus,
  validateUpdateRestaurant,
} from "../validators/restaurant.validators.js";
import menuRouter from "./menu.route.js";

const restaurantRouter = Router();
const ownerOrAdmin = requireRole("RESTAURANT_OWNER", "ADMIN");

restaurantRouter.get("/", validateRestaurantQuery, browseRestaurants);
restaurantRouter.get("/mine", requireAuth, ownerOrAdmin, getMyRestaurants);
restaurantRouter.post("/", requireAuth, ownerOrAdmin, validateCreateRestaurant, createRestaurant);
restaurantRouter.patch("/:restaurantId/status", requireAuth, requireRole("ADMIN"), validateRestaurantId, validateRestaurantStatus, setRestaurantStatus);
restaurantRouter.get("/:restaurantId", validateRestaurantId, getRestaurant);
restaurantRouter.patch("/:restaurantId", requireAuth, ownerOrAdmin, validateRestaurantId, validateUpdateRestaurant, updateRestaurant);
restaurantRouter.use("/:restaurantId/menu", validateRestaurantId, menuRouter);

export default restaurantRouter;
