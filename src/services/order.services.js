import { prisma } from "../lib/prisma.js";

export class OrderError extends Error {
  constructor(message, statusCode = 400) { super(message); this.name = "OrderError"; this.statusCode = statusCode; }
}

const orderInclude = {
  restaurant: { select: { id: true, ownerId: true, name: true, phone: true, street: true, city: true, region: true, country: true } },
  items: { orderBy: { id: "asc" } },
  payment: true,
  delivery: { select: { id: true, status: true, driverId: true, requestedAt: true, assignedAt: true, acceptedAt: true, pickedUpAt: true, completedAt: true } },
};

function addressData(address) {
  return {
    deliveryStreet: address.street, deliveryApartment: address.apartment ?? null,
    deliveryCity: address.city, deliveryRegion: address.region ?? null,
    deliveryPostalCode: address.postalCode ?? null, deliveryCountry: address.country,
    deliveryInstructions: address.instructions ?? null,
  };
}

async function resolveAddress(tx, customerId, input) {
  if (input.addressId) {
    const address = await tx.address.findFirst({ where: { id: input.addressId, userId: customerId } });
    if (!address) throw new OrderError("Delivery address not found", 404);
    return { id: address.id, snapshot: addressData(address) };
  }
  return { id: null, snapshot: addressData(input.address) };
}

export async function checkoutOrder(customerId, input) {
  return prisma.$transaction(async (tx) => {
    const cart = await tx.cart.findFirst({ where: { customerId, restaurantId: input.restaurantId }, include: { items: { include: { menuItem: true } }, restaurant: true } });
    if (!cart || !cart.items.length) throw new OrderError("Your cart is empty", 409);
    if (cart.restaurant.status !== "ACTIVE" || !cart.restaurant.isAcceptingOrders) throw new OrderError("Restaurant is not accepting orders", 409);
    if (cart.items.some(({ menuItem }) => !menuItem.isAvailable || menuItem.restaurantId !== cart.restaurantId)) throw new OrderError("One or more cart items are no longer available", 409);

    const address = await resolveAddress(tx, customerId, input);
    const items = cart.items.map(({ menuItem, quantity }) => {
      const unitPrice = Number(menuItem.price);
      return { menuItemId: menuItem.id, itemName: menuItem.name, unitPrice, quantity, lineTotal: Number((unitPrice * quantity).toFixed(2)) };
    });
    const subtotal = Number(items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));
    const deliveryFee = 0;
    const tax = 0;
    const tip = Number((input.tip ?? 0).toFixed(2));
    const total = Number((subtotal + deliveryFee + tax + tip).toFixed(2));
    const order = await tx.order.create({
      data: {
        customerId, restaurantId: cart.restaurantId, deliveryAddressId: address.id,
        ...address.snapshot, currency: "USD", subtotal, deliveryFee, tax, tip, total,
        items: { create: items },
        payment: { create: { method: input.paymentMethod, amount: total, currency: "USD", status: "PENDING" } },
      }, include: orderInclude,
    });
    await tx.cart.delete({ where: { id: cart.id } });
    return order;
  }, { isolationLevel: "Serializable" });
}

function accessWhere(userId, isAdmin) {
  return isAdmin ? {} : { OR: [{ customerId: userId }, { restaurant: { ownerId: userId } }] };
}

export async function listOrders(userId, role, { status, page = 1, limit = 20 } = {}) {
  const scope = role === "ADMIN" ? {} : role === "RESTAURANT_OWNER" ? { restaurant: { ownerId: userId } } : { customerId: userId };
  const where = { ...scope, ...(status ? { status } : {}) };
  const [orders, total] = await prisma.$transaction([
    prisma.order.findMany({ where, include: orderInclude, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
    prisma.order.count({ where }),
  ]);
  return { orders, page, limit, total };
}

export async function getOrder(orderId, userId, isAdmin = false) {
  const order = await prisma.order.findFirst({ where: { id: orderId, ...accessWhere(userId, isAdmin) }, include: orderInclude });
  if (!order) throw new OrderError("Order not found", 404);
  return order;
}

export async function updateOrderStatus(orderId, userId, role, nextStatus) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { restaurant: { select: { ownerId: true, latitude: true, longitude: true } }, deliveryAddress: { select: { latitude: true, longitude: true } } } });
    if (!order) throw new OrderError("Order not found", 404);
    if (role !== "ADMIN" && !(role === "CUSTOMER" && order.customerId === userId) && !(role === "RESTAURANT_OWNER" && order.restaurant.ownerId === userId)) throw new OrderError("You do not have permission to update this order", 403);

    if (nextStatus === "CANCELLED") {
      if (order.status === "CANCELLED" || order.status === "DELIVERED" || order.status === "OUT_FOR_DELIVERY") throw new OrderError("This order can no longer be cancelled", 409);
      if (role === "CUSTOMER" && order.customerId !== userId) throw new OrderError("You can only cancel your own orders", 403);
      if (role === "RESTAURANT_OWNER" && order.restaurant.ownerId !== userId) throw new OrderError("You can only cancel orders for your restaurant", 403);
      const changed = await tx.order.updateMany({ where: { id: orderId, status: order.status }, data: { status: "CANCELLED", cancelledAt: new Date() } });
      if (changed.count !== 1) throw new OrderError("Order status changed; refresh and try again", 409);
      return tx.order.findUnique({ where: { id: orderId }, include: orderInclude });
    }

    if (role === "CUSTOMER") throw new OrderError("Customers may only cancel an order", 403);
    const transitions = { PLACED: "CONFIRMED", CONFIRMED: "PREPARING", PREPARING: "READY_FOR_PICKUP" };
    if (transitions[order.status] !== nextStatus) throw new OrderError(`Order cannot move from ${order.status} to ${nextStatus}`, 409);
    const now = new Date();
    const changed = await tx.order.updateMany({ where: { id: orderId, status: order.status }, data: { status: nextStatus, ...(nextStatus === "CONFIRMED" ? { confirmedAt: now } : {}) } });
    if (changed.count !== 1) throw new OrderError("Order status changed; refresh and try again", 409);
    if (nextStatus === "READY_FOR_PICKUP") {
      await tx.delivery.upsert({
        where: { orderId },
        create: { orderId, pickupLatitude: order.restaurant.latitude, pickupLongitude: order.restaurant.longitude, dropoffLatitude: order.deliveryAddress?.latitude ?? null, dropoffLongitude: order.deliveryAddress?.longitude ?? null },
        update: {},
      });
    }
    return tx.order.findUnique({ where: { id: orderId }, include: orderInclude });
  });
}
