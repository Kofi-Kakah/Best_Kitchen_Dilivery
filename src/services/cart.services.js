import { prisma } from "../lib/prisma.js";

export class CartError extends Error {
  constructor(message, statusCode = 400) { super(message); this.name = "CartError"; this.statusCode = statusCode; }
}

const cartInclude = {
  restaurant: { select: { id: true, name: true, status: true, isAcceptingOrders: true } },
  items: { include: { menuItem: { select: { id: true, name: true, price: true, imageUrl: true, isAvailable: true, restaurantId: true } } }, orderBy: { createdAt: "asc" } },
};

function presentCart(cart) {
  if (!cart) return null;
  const items = cart.items.map(({ menuItem, ...item }) => ({
    ...item, menuItem, unitPrice: menuItem.price,
    lineTotal: Number(menuItem.price) * item.quantity,
  }));
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  return { ...cart, items, subtotal: Number(subtotal.toFixed(2)), itemCount: items.reduce((sum, item) => sum + item.quantity, 0) };
}

async function findRestaurant(restaurantId) {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { id: true, status: true, isAcceptingOrders: true } });
  if (!restaurant || restaurant.status !== "ACTIVE") throw new CartError("Restaurant not found", 404);
  if (!restaurant.isAcceptingOrders) throw new CartError("Restaurant is not accepting orders", 409);
  return restaurant;
}

export async function getCart(customerId, restaurantId) {
  const where = { customerId, ...(restaurantId ? { restaurantId } : {}) };
  const carts = await prisma.cart.findMany({ where, include: cartInclude, orderBy: { updatedAt: "desc" } });
  return restaurantId ? presentCart(carts[0] ?? null) : { carts: carts.map(presentCart) };
}

export async function addCartItem(customerId, restaurantId, menuItemId, quantity) {
  await findRestaurant(restaurantId);
  const menuItem = await prisma.menuItem.findFirst({ where: { id: menuItemId, restaurantId, isAvailable: true }, select: { id: true } });
  if (!menuItem) throw new CartError("Available menu item not found for this restaurant", 404);
  const cart = await prisma.cart.upsert({ where: { customerId_restaurantId: { customerId, restaurantId } }, create: { customerId, restaurantId }, update: {} });
  await prisma.cartItem.upsert({
    where: { cartId_menuItemId: { cartId: cart.id, menuItemId } },
    create: { cartId: cart.id, menuItemId, quantity },
    update: { quantity: { increment: quantity } },
  });
  const updated = await prisma.cart.findUnique({ where: { id: cart.id }, include: cartInclude });
  return presentCart(updated);
}

export async function updateCartItem(customerId, cartItemId, quantity) {
  const item = await prisma.cartItem.findFirst({ where: { id: cartItemId, cart: { customerId } }, select: { id: true, cartId: true } });
  if (!item) throw new CartError("Cart item not found", 404);
  if (quantity === 0) await prisma.cartItem.delete({ where: { id: item.id } });
  else await prisma.cartItem.update({ where: { id: item.id }, data: { quantity } });
  const cart = await prisma.cart.findUnique({ where: { id: item.cartId }, include: cartInclude });
  if (!cart.items.length) { await prisma.cart.delete({ where: { id: item.cartId } }); return null; }
  return presentCart(cart);
}

export async function removeCartItem(customerId, cartItemId) {
  return updateCartItem(customerId, cartItemId, 0);
}

export async function clearCart(customerId, restaurantId) {
  const result = await prisma.cart.deleteMany({ where: { customerId, ...(restaurantId ? { restaurantId } : {}) } });
  return { deleted: result.count };
}
