import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { getAuthenticatedUser } from "../services/auth.services.js";
import { verifyAccessToken } from "../services/token.services.js";
import { getOrder } from "../services/order.services.js";
import { getDelivery } from "../services/delivery.services.js";

let io;

function readCookie(cookieHeader, name) {
  const pair = cookieHeader?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  if (!pair) return undefined;
  try { return decodeURIComponent(pair.slice(name.length + 1)); } catch { return undefined; }
}

function getHandshakeToken(socket) {
  const authToken = socket.handshake.auth?.token;
  if (typeof authToken === "string" && authToken.trim()) return authToken.trim();

  const authorization = socket.handshake.headers.authorization;
  if (typeof authorization === "string" && /^Bearer\s+/i.test(authorization)) {
    return authorization.replace(/^Bearer\s+/i, "").trim();
  }

  return readCookie(socket.handshake.headers.cookie, "accessToken");
}

function acknowledge(callback, result) {
  if (typeof callback === "function") callback(result);
}

function validId(value) {
  return typeof value === "string" && value.length > 0 && value.length <= 100;
}

export function initializeSockets(httpServer, options = {}) {
  if (io) throw new Error("Socket.IO has already been initialized");

  const configuredOrigins = process.env.CLIENT_ORIGIN
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  io = new Server(httpServer, {
    cors: {
      ...(configuredOrigins?.length ? { origin: configuredOrigins } : {}),
      credentials: true,
    },
    ...options,
  });

  io.use(async (socket, next) => {
    try {
      const token = getHandshakeToken(socket);
      if (!token) return next(new Error("Authentication required"));

      const { userId } = verifyAccessToken(token);
      const user = await getAuthenticatedUser(userId);
      socket.data.user = { userId: user.id, role: user.role };
      return next();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError || error?.statusCode === 401) {
        return next(new Error("Invalid or expired session"));
      }
      return next(new Error("Unable to authenticate socket connection"));
    }
  });

  io.on("connection", (socket) => {
    const { userId } = socket.data.user;
    socket.join(userRoom(userId));

    socket.on("order:join", async (orderId, callback) => {
      if (!validId(orderId)) return acknowledge(callback, { ok: false, error: "Invalid order ID" });
      try {
        await getOrder(orderId, userId, socket.data.user.role === "ADMIN");
        await socket.join(orderRoom(orderId));
        return acknowledge(callback, { ok: true });
      } catch (error) {
        return acknowledge(callback, { ok: false, error: error?.statusCode === 403 ? "Forbidden" : "Order not found" });
      }
    });

    socket.on("order:leave", (orderId, callback) => {
      if (!validId(orderId)) return acknowledge(callback, { ok: false, error: "Invalid order ID" });
      socket.leave(orderRoom(orderId));
      return acknowledge(callback, { ok: true });
    });

    socket.on("delivery:join", async (deliveryId, callback) => {
      if (!validId(deliveryId)) return acknowledge(callback, { ok: false, error: "Invalid delivery ID" });
      try {
        await getDelivery(deliveryId, userId, socket.data.user.role === "ADMIN");
        await socket.join(deliveryRoom(deliveryId));
        return acknowledge(callback, { ok: true });
      } catch (error) {
        return acknowledge(callback, { ok: false, error: error?.statusCode === 403 ? "Forbidden" : "Delivery not found" });
      }
    });

    socket.on("delivery:leave", (deliveryId, callback) => {
      if (!validId(deliveryId)) return acknowledge(callback, { ok: false, error: "Invalid delivery ID" });
      socket.leave(deliveryRoom(deliveryId));
      return acknowledge(callback, { ok: true });
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error("Socket.IO has not been initialized");
  return io;
}

export function userRoom(userId) { return `user:${userId}`; }
export function orderRoom(orderId) { return `order:${orderId}`; }
export function deliveryRoom(deliveryId) { return `delivery:${deliveryId}`; }

export function emitToUser(userId, event, payload) {
  getIO().to(userRoom(userId)).emit(event, payload);
}

export function emitToOrder(orderId, event, payload) {
  getIO().to(orderRoom(orderId)).emit(event, payload);
}

export function emitToDelivery(deliveryId, event, payload) {
  getIO().to(deliveryRoom(deliveryId)).emit(event, payload);
}
