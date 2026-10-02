import { prisma } from "../lib/prisma.js";
import { assertRestaurantManageAccess, RestaurantError } from "./restaurant.services.js";

async function requirePublicRestaurant(restaurantId) {
  const restaurant = await prisma.restaurant.findFirst({
    where: { id: restaurantId, status: "ACTIVE" },
    select: { id: true },
  });
  if (!restaurant) throw new RestaurantError("Restaurant not found", 404);
}

async function requireManager(restaurantId, userId, isAdmin) {
  return assertRestaurantManageAccess(restaurantId, userId, isAdmin);
}

export async function listMenuItems(restaurantId) {
  await requirePublicRestaurant(restaurantId);
  return prisma.menuItem.findMany({
    where: { restaurantId, isAvailable: true },
    select: {
      id: true, restaurantId: true, categoryId: true, name: true, description: true,
      price: true, imageUrl: true, isAvailable: true, createdAt: true, updatedAt: true,
    },
    orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
  });
}

export async function listMenuCategories(restaurantId) {
  await requirePublicRestaurant(restaurantId);
  return prisma.menuCategory.findMany({
    where: { restaurantId, isAvailable: true },
    select: {
      id: true, restaurantId: true, name: true, description: true,
      sortOrder: true, isAvailable: true, createdAt: true, updatedAt: true,
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function createMenuItem(restaurantId, userId, isAdmin, input) {
  await requireManager(restaurantId, userId, isAdmin);
  if (input.categoryId) {
    const category = await prisma.menuCategory.findFirst({
      where: { id: input.categoryId, restaurantId }, select: { id: true },
    });
    if (!category) throw new RestaurantError("Menu category not found for this restaurant", 404);
  }
  return prisma.menuItem.create({ data: { ...input, restaurantId } });
}

export async function updateMenuItem(restaurantId, menuItemId, userId, isAdmin, input) {
  await requireManager(restaurantId, userId, isAdmin);
  if (input.categoryId) {
    const category = await prisma.menuCategory.findFirst({
      where: { id: input.categoryId, restaurantId }, select: { id: true },
    });
    if (!category) throw new RestaurantError("Menu category not found for this restaurant", 404);
  }
  const result = await prisma.menuItem.updateMany({
    where: { id: menuItemId, restaurantId }, data: input,
  });
  if (!result.count) throw new RestaurantError("Menu item not found", 404);
  return prisma.menuItem.findUnique({ where: { id: menuItemId } });
}

export async function deleteMenuItem(restaurantId, menuItemId, userId, isAdmin) {
  await requireManager(restaurantId, userId, isAdmin);
  const result = await prisma.menuItem.deleteMany({ where: { id: menuItemId, restaurantId } });
  if (!result.count) throw new RestaurantError("Menu item not found", 404);
}

export async function createMenuCategory(restaurantId, userId, isAdmin, input) {
  await requireManager(restaurantId, userId, isAdmin);
  return prisma.menuCategory.create({ data: { ...input, restaurantId } });
}

export async function updateMenuCategory(restaurantId, categoryId, userId, isAdmin, input) {
  await requireManager(restaurantId, userId, isAdmin);
  const result = await prisma.menuCategory.updateMany({
    where: { id: categoryId, restaurantId }, data: input,
  });
  if (!result.count) throw new RestaurantError("Menu category not found", 404);
  return prisma.menuCategory.findUnique({ where: { id: categoryId } });
}

export async function deleteMenuCategory(restaurantId, categoryId, userId, isAdmin) {
  await requireManager(restaurantId, userId, isAdmin);
  const result = await prisma.menuCategory.deleteMany({ where: { id: categoryId, restaurantId } });
  if (!result.count) throw new RestaurantError("Menu category not found", 404);
}
