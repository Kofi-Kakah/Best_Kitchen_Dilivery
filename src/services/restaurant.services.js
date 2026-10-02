import { prisma } from "../lib/prisma.js";

const restaurantSelect = {
  id: true,
  ownerId: true,
  name: true,
  description: true,
  phone: true,
  email: true,
  street: true,
  city: true,
  region: true,
  postalCode: true,
  country: true,
  latitude: true,
  longitude: true,
  status: true,
  cuisine: true,
  imageUrl: true,
  isAcceptingOrders: true,
  createdAt: true,
  updatedAt: true,
};

export class RestaurantError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "RestaurantError";
    this.statusCode = statusCode;
  }
}

export async function listRestaurants({ city, cuisine, page = 1, limit = 20 } = {}) {
  const where = {
    status: "ACTIVE",
    ...(city ? { city: { contains: city, mode: "insensitive" } } : {}),
    ...(cuisine ? { cuisine: { contains: cuisine, mode: "insensitive" } } : {}),
  };
  const [restaurants, total] = await prisma.$transaction([
    prisma.restaurant.findMany({
      where,
      select: restaurantSelect,
      orderBy: { name: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.restaurant.count({ where }),
  ]);
  return { restaurants, page, limit, total };
}

export async function getRestaurant(restaurantId) {
  const restaurant = await prisma.restaurant.findFirst({
    where: { id: restaurantId, status: "ACTIVE" },
    select: restaurantSelect,
  });
  if (!restaurant) throw new RestaurantError("Restaurant not found", 404);
  return restaurant;
}

export function listMyRestaurants(ownerId) {
  return prisma.restaurant.findMany({
    where: { ownerId },
    select: restaurantSelect,
    orderBy: { createdAt: "desc" },
  });
}

export function createRestaurant(ownerId, input) {
  return prisma.restaurant.create({
    data: { ...input, ownerId },
    select: restaurantSelect,
  });
}

async function findManageableRestaurant(restaurantId, userId, isAdmin) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: restaurantSelect,
  });
  if (!restaurant) throw new RestaurantError("Restaurant not found", 404);
  if (!isAdmin && restaurant.ownerId !== userId) {
    throw new RestaurantError("You do not have permission to manage this restaurant", 403);
  }
  return restaurant;
}

export async function updateRestaurant(restaurantId, userId, isAdmin, input) {
  await findManageableRestaurant(restaurantId, userId, isAdmin);
  return prisma.restaurant.update({
    where: { id: restaurantId },
    data: input,
    select: restaurantSelect,
  });
}

export async function updateRestaurantStatus(restaurantId, status) {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { id: true } });
  if (!restaurant) throw new RestaurantError("Restaurant not found", 404);
  return prisma.restaurant.update({
    where: { id: restaurantId },
    data: { status, ...(status === "ACTIVE" ? {} : { isAcceptingOrders: false }) },
    select: restaurantSelect,
  });
}

export async function assertRestaurantManageAccess(restaurantId, userId, isAdmin = false) {
  return findManageableRestaurant(restaurantId, userId, isAdmin);
}
