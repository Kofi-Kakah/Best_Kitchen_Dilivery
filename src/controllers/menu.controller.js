import {
  createMenuCategory,
  createMenuItem,
  deleteMenuCategory,
  deleteMenuItem,
  listMenuCategories,
  listMenuItems,
  updateMenuCategory,
  updateMenuItem,
} from "../services/menu.services.js";

const actor = (req) => ({ userId: req.auth.userId, isAdmin: req.auth.role === "ADMIN" });

export async function getMenu(req, res, next) {
  try {
    const items = await listMenuItems(req.params.restaurantId);
    return res.status(200).json({ items });
  } catch (error) { return next(error); }
}

export async function getCategories(req, res, next) {
  try {
    const categories = await listMenuCategories(req.params.restaurantId);
    return res.status(200).json({ categories });
  } catch (error) { return next(error); }
}

export async function postMenuItem(req, res, next) {
  try {
    const { userId, isAdmin } = actor(req);
    const item = await createMenuItem(req.params.restaurantId, userId, isAdmin, req.body);
    return res.status(201).json({ item });
  } catch (error) { return next(error); }
}

export async function patchMenuItem(req, res, next) {
  try {
    const { userId, isAdmin } = actor(req);
    const item = await updateMenuItem(req.params.restaurantId, req.params.menuItemId, userId, isAdmin, req.body);
    return res.status(200).json({ item });
  } catch (error) { return next(error); }
}

export async function removeMenuItem(req, res, next) {
  try {
    const { userId, isAdmin } = actor(req);
    await deleteMenuItem(req.params.restaurantId, req.params.menuItemId, userId, isAdmin);
    return res.status(204).end();
  } catch (error) { return next(error); }
}

export async function postMenuCategory(req, res, next) {
  try {
    const { userId, isAdmin } = actor(req);
    const category = await createMenuCategory(req.params.restaurantId, userId, isAdmin, req.body);
    return res.status(201).json({ category });
  } catch (error) { return next(error); }
}

export async function patchMenuCategory(req, res, next) {
  try {
    const { userId, isAdmin } = actor(req);
    const category = await updateMenuCategory(req.params.restaurantId, req.params.categoryId, userId, isAdmin, req.body);
    return res.status(200).json({ category });
  } catch (error) { return next(error); }
}

export async function removeMenuCategory(req, res, next) {
  try {
    const { userId, isAdmin } = actor(req);
    await deleteMenuCategory(req.params.restaurantId, req.params.categoryId, userId, isAdmin);
    return res.status(204).end();
  } catch (error) { return next(error); }
}
