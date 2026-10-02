import { prisma } from "../lib/prisma.js";

export class DeliveryError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "DeliveryError";
    this.statusCode = statusCode;
  }
}

const deliveryInclude = {
  order: {
    select: {
      id: true, status: true, total: true, currency: true, deliveryStreet: true,
      deliveryApartment: true, deliveryCity: true, deliveryRegion: true,
      deliveryPostalCode: true, deliveryCountry: true, deliveryInstructions: true,
      deliveryAddress: { select: { latitude: true, longitude: true } },
      customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
      restaurant: { select: { id: true, ownerId: true, name: true, phone: true, street: true, city: true, region: true, latitude: true, longitude: true } },
      items: { select: { itemName: true, quantity: true, specialRequest: true } },
    },
  },
  driver: { select: { id: true, vehicleType: true, vehicleDetails: true, user: { select: { id: true, firstName: true, lastName: true, phone: true } } } },
};

const activeStatuses = ["ASSIGNED", "ACCEPTED", "PICKED_UP"];

export async function listAvailableDeliveries({ page = 1, limit = 20 } = {}) {
  const where = { status: "PENDING", driverId: null };
  const [deliveries, total] = await prisma.$transaction([
    prisma.delivery.findMany({ where, include: deliveryInclude, orderBy: { requestedAt: "asc" }, skip: (page - 1) * limit, take: limit }),
    prisma.delivery.count({ where }),
  ]);
  return { deliveries, page, limit, total };
}

export async function listDriverDeliveries(userId, { status, page = 1, limit = 20 } = {}) {
  const profile = await prisma.driverProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!profile) throw new DeliveryError("Driver profile not found", 404);
  const where = { driverId: profile.id, ...(status ? { status } : {}) };
  const [deliveries, total] = await prisma.$transaction([
    prisma.delivery.findMany({ where, include: deliveryInclude, orderBy: { requestedAt: "desc" }, skip: (page - 1) * limit, take: limit }),
    prisma.delivery.count({ where }),
  ]);
  return { deliveries, page, limit, total };
}

export async function listCustomerDeliveries(userId) {
  return prisma.delivery.findMany({ where: { order: { customerId: userId } }, include: deliveryInclude, orderBy: { requestedAt: "desc" } });
}

export async function getDelivery(deliveryId, userId, isAdmin = false) {
  const delivery = await prisma.delivery.findUnique({ where: { id: deliveryId }, include: { ...deliveryInclude, updates: { orderBy: { createdAt: "asc" } } } });
  if (!delivery) throw new DeliveryError("Delivery not found", 404);
  const allowed = isAdmin || delivery.order.customer.id === userId || delivery.driver?.user.id === userId || delivery.order.restaurant.ownerId === userId;
  if (!allowed) throw new DeliveryError("You do not have permission to view this delivery", 403);
  const latestLocation = delivery.driver
    ? await prisma.driverLocation.findFirst({ where: { driverId: delivery.driver.id }, orderBy: { recordedAt: "desc" }, select: { latitude: true, longitude: true, recordedAt: true } })
    : null;
  return { ...delivery, latestLocation };
}

export async function createDeliveryForOrder(orderId) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { restaurant: true } });
  if (!order) throw new DeliveryError("Order not found", 404);
  if (order.status !== "READY_FOR_PICKUP") throw new DeliveryError("The order must be ready for pickup before delivery can be created", 409);
  return prisma.delivery.upsert({
    where: { orderId },
    create: {
      orderId,
      pickupLatitude: order.restaurant.latitude,
      pickupLongitude: order.restaurant.longitude,
      dropoffLatitude: order.deliveryAddress?.latitude ?? null,
      dropoffLongitude: order.deliveryAddress?.longitude ?? null,
      status: "PENDING",
    },
    update: {},
    include: deliveryInclude,
  });
}

export async function assignDelivery(deliveryId, driverId) {
  return prisma.$transaction(async (tx) => {
    const delivery = await tx.delivery.findUnique({ where: { id: deliveryId } });
    if (!delivery || delivery.status !== "PENDING" || delivery.driverId) throw new DeliveryError("Delivery is no longer available for assignment", 409);
    const driver = await tx.driverProfile.findUnique({ where: { id: driverId } });
    if (!driver || driver.availability !== "ONLINE") throw new DeliveryError("Driver is not available", 409);
    const active = await tx.delivery.count({ where: { driverId, status: { in: activeStatuses } } });
    if (active) throw new DeliveryError("Driver already has an active delivery", 409);
    const reserved = await tx.driverProfile.updateMany({ where: { id: driverId, availability: "ONLINE" }, data: { availability: "ON_DELIVERY" } });
    if (reserved.count !== 1) throw new DeliveryError("Driver is no longer available", 409);
    return tx.delivery.update({ where: { id: deliveryId }, data: { driverId, status: "ASSIGNED", assignedAt: new Date(), updates: { create: { status: "ASSIGNED", note: "Driver assigned" } } }, include: deliveryInclude });
  });
}

export async function acceptDelivery(deliveryId, userId) {
  const profile = await prisma.driverProfile.findUnique({ where: { userId } });
  if (!profile) throw new DeliveryError("Driver profile not found", 404);
  return prisma.$transaction(async (tx) => {
    const candidate = await tx.delivery.findUnique({ where: { id: deliveryId }, select: { status: true, driverId: true } });
    if (!candidate || !((candidate.status === "PENDING" && candidate.driverId === null && profile.availability === "ONLINE") || (candidate.status === "ASSIGNED" && candidate.driverId === profile.id && profile.availability === "ON_DELIVERY"))) {
      throw new DeliveryError("Delivery is no longer available or is not assigned to you", 409);
    }
    if (candidate.status === "PENDING") {
      const reserved = await tx.driverProfile.updateMany({ where: { id: profile.id, availability: "ONLINE" }, data: { availability: "ON_DELIVERY" } });
      if (reserved.count !== 1) throw new DeliveryError("You already have an active delivery", 409);
    }
    const claimed = await tx.delivery.updateMany({
      where: { id: deliveryId, OR: [{ status: "PENDING", driverId: null }, { status: "ASSIGNED", driverId: profile.id }] },
      data: { driverId: profile.id, status: "ACCEPTED", assignedAt: new Date(), acceptedAt: new Date() },
    });
    if (claimed.count !== 1) throw new DeliveryError("Delivery is no longer available", 409);
    await tx.deliveryStatusUpdate.create({ data: { deliveryId, status: "ACCEPTED", note: "Accepted by driver" } });
    return tx.delivery.findUnique({ where: { id: deliveryId }, include: deliveryInclude });
  });
}

export async function updateDeliveryStatus(deliveryId, userId, nextStatus, note) {
  const profile = await prisma.driverProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!profile) throw new DeliveryError("Driver profile not found", 404);
  const current = await prisma.delivery.findUnique({ where: { id: deliveryId } });
  if (!current || current.driverId !== profile.id) throw new DeliveryError("Delivery not found", 404);
  const expected = { PICKED_UP: "ACCEPTED", COMPLETED: "PICKED_UP" }[nextStatus];
  if (current.status !== expected) throw new DeliveryError(`Delivery must be ${expected.toLowerCase()} before it can be ${nextStatus.toLowerCase()}`, 409);

  return prisma.$transaction(async (tx) => {
    const changed = await tx.delivery.updateMany({ where: { id: deliveryId, driverId: profile.id, status: expected }, data: {
      status: nextStatus,
      ...(nextStatus === "PICKED_UP" ? { pickedUpAt: new Date() } : { completedAt: new Date() }),
    } });
    if (changed.count !== 1) throw new DeliveryError("Delivery status changed; refresh and try again", 409);
    await tx.deliveryStatusUpdate.create({ data: { deliveryId, status: nextStatus, note: note || null } });
    if (nextStatus === "PICKED_UP") {
      await tx.order.update({ where: { id: current.orderId }, data: { status: "OUT_FOR_DELIVERY" } });
    } else {
      await tx.order.update({ where: { id: current.orderId }, data: { status: "DELIVERED", deliveredAt: new Date() } });
      await tx.driverProfile.update({ where: { id: profile.id }, data: { availability: "ONLINE" } });
    }
    return tx.delivery.findUnique({ where: { id: deliveryId }, include: deliveryInclude });
  });
}

export async function listAllDeliveries({ status, page = 1, limit = 20 } = {}) {
  const where = status ? { status } : {};
  const [deliveries, total] = await prisma.$transaction([
    prisma.delivery.findMany({ where, include: deliveryInclude, orderBy: { requestedAt: "desc" }, skip: (page - 1) * limit, take: limit }),
    prisma.delivery.count({ where }),
  ]);
  return { deliveries, page, limit, total };
}
