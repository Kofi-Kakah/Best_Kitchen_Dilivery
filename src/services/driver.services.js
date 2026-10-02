import { prisma } from "../lib/prisma.js";

export class DriverError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "DriverError";
    this.statusCode = statusCode;
  }
}

const driverInclude = { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } };

export async function getDriverProfile(userId) {
  const profile = await prisma.driverProfile.findUnique({ where: { userId }, include: driverInclude });
  if (!profile) throw new DriverError("Driver profile not found", 404);
  return profile;
}

export async function ensureDriverProfile(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
  if (!user || user.role !== "DRIVER") throw new DriverError("A driver account is required", 403);
  return prisma.driverProfile.upsert({
    where: { userId },
    create: { userId },
    update: {},
    include: driverInclude,
  });
}

export async function updateDriverProfile(userId, input) {
  const profile = await ensureDriverProfile(userId);
  return prisma.driverProfile.update({ where: { id: profile.id }, data: input, include: driverInclude });
}

export async function setDriverAvailability(userId, availability) {
  const profile = await ensureDriverProfile(userId);
  if (availability === "OFFLINE") {
    const active = await prisma.delivery.count({ where: { driverId: profile.id, status: { in: ["ASSIGNED", "ACCEPTED", "PICKED_UP"] } } });
    if (active) throw new DriverError("Complete or cancel your active delivery before going offline", 409);
  }
  if (availability === "ONLINE") {
    const active = await prisma.delivery.count({ where: { driverId: profile.id, status: { in: ["ASSIGNED", "ACCEPTED", "PICKED_UP"] } } });
    if (active) throw new DriverError("You have an active delivery and cannot change availability", 409);
  }
  return prisma.driverProfile.update({ where: { id: profile.id }, data: { availability }, include: driverInclude });
}

export async function recordDriverLocation(userId, { latitude, longitude }) {
  const profile = await ensureDriverProfile(userId);
  await prisma.driverLocation.create({ data: { driverId: profile.id, latitude, longitude } });
  return { latitude, longitude, recordedAt: new Date() };
}
