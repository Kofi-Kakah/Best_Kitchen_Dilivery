import { randomUUID } from "node:crypto";
import { emitToDelivery, emitToOrder, emitToUser } from "../sockets/index.js";

function requireUserId(userId) {
  if (typeof userId !== "string" || userId.length === 0) {
    throw new TypeError("A recipient user ID is required");
  }
}

function makeNotification({ type, title, message, data = {} }) {
  if (typeof type !== "string" || !type.trim()) throw new TypeError("Notification type is required");
  if (typeof title !== "string" || !title.trim()) throw new TypeError("Notification title is required");
  if (typeof message !== "string" || !message.trim()) throw new TypeError("Notification message is required");

  return {
    id: randomUUID(),
    type: type.trim(),
    title: title.trim(),
    message: message.trim(),
    data,
    createdAt: new Date().toISOString(),
  };
}

/** Publish a real-time notification to one user's authenticated socket room. */
export function notifyUser(userId, input) {
  requireUserId(userId);
  const notification = makeNotification(input);
  emitToUser(userId, "notification", notification);
  return notification;
}

/** Notify the customer and restaurant owner after an order status has changed. */
export function notifyOrderStatus(order) {
  if (!order?.id || !order?.status) throw new TypeError("An order with an ID and status is required");

  const notification = makeNotification({
    type: "ORDER_STATUS",
    title: "Order update",
    message: `Order ${order.id} is now ${formatStatus(order.status)}.`,
    data: { orderId: order.id, status: order.status },
  });
  const recipients = new Set([order.customerId, order.restaurant?.ownerId].filter(Boolean));

  for (const userId of recipients) emitToUser(userId, "notification", notification);
  emitToOrder(order.id, "order:status", { orderId: order.id, status: order.status, order });
  return notification;
}

/** Notify order participants when a delivery status changes. */
export function notifyDeliveryStatus(delivery) {
  if (!delivery?.id || !delivery?.status) throw new TypeError("A delivery with an ID and status is required");

  const order = delivery.order;
  const notification = makeNotification({
    type: "DELIVERY_STATUS",
    title: "Delivery update",
    message: `Delivery ${delivery.id} is now ${formatStatus(delivery.status)}.`,
    data: { deliveryId: delivery.id, orderId: order?.id, status: delivery.status },
  });
  const recipients = new Set([
    order?.customer?.id,
    order?.restaurant?.ownerId,
    delivery.driver?.user?.id,
  ].filter(Boolean));

  for (const userId of recipients) emitToUser(userId, "notification", notification);
  emitToDelivery(delivery.id, "delivery:status", {
    deliveryId: delivery.id,
    orderId: order?.id,
    status: delivery.status,
    delivery,
  });
  if (order?.id) emitToOrder(order.id, "delivery:status", { deliveryId: delivery.id, status: delivery.status });
  return notification;
}

/** Broadcast a driver's latest location to clients authorized in the delivery room. */
export function notifyDriverLocation(deliveryId, location) {
  if (typeof deliveryId !== "string" || !deliveryId) throw new TypeError("A delivery ID is required");
  if (location?.latitude == null || location?.longitude == null) {
    throw new TypeError("A valid latitude and longitude are required");
  }
  if (!Number.isFinite(Number(location?.latitude)) || !Number.isFinite(Number(location?.longitude))) {
    throw new TypeError("A valid latitude and longitude are required");
  }

  const payload = {
    deliveryId,
    latitude: Number(location.latitude),
    longitude: Number(location.longitude),
    recordedAt: location.recordedAt instanceof Date ? location.recordedAt.toISOString() : location.recordedAt ?? new Date().toISOString(),
  };
  emitToDelivery(deliveryId, "delivery:location", payload);
  return payload;
}

function formatStatus(status) {
  return String(status).toLowerCase().replaceAll("_", " ");
}
