import {
  createRestaurant as createRestaurantRecord,
  getRestaurant as getRestaurantRecord,
  listMyRestaurants,
  listRestaurants,
  updateRestaurant as updateRestaurantRecord,
  updateRestaurantStatus,
} from "../services/restaurant.services.js";

export async function browseRestaurants(req, res, next) {
  try {
    const result = await listRestaurants(req.validatedQuery);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function getRestaurant(req, res, next) {
  try {
    const restaurant = await getRestaurantRecord(req.params.restaurantId);
    return res.status(200).json({ restaurant });
  } catch (error) {
    return next(error);
  }
}

export async function getMyRestaurants(req, res, next) {
  try {
    const restaurants = await listMyRestaurants(req.auth.userId);
    return res.status(200).json({ restaurants });
  } catch (error) {
    return next(error);
  }
}

export async function createRestaurant(req, res, next) {
  try {
    const restaurant = await createRestaurantRecord(req.auth.userId, req.body);
    return res.status(201).json({ restaurant });
  } catch (error) {
    return next(error);
  }
}

export async function updateRestaurant(req, res, next) {
  try {
    const restaurant = await updateRestaurantRecord(
      req.params.restaurantId,
      req.auth.userId,
      req.auth.role === "ADMIN",
      req.body,
    );
    return res.status(200).json({ restaurant });
  } catch (error) {
    return next(error);
  }
}

export async function setRestaurantStatus(req, res, next) {
  try {
    const restaurant = await updateRestaurantStatus(req.params.restaurantId, req.body.status);
    return res.status(200).json({ restaurant });
  } catch (error) {
    return next(error);
  }
}
