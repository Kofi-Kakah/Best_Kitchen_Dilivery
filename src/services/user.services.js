import { prisma } from "../lib/prisma.js";

const publicUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  role: true,
  createdAt: true,
};

export async function createCustomerUser({ email, passwordHash, firstName, lastName, phone }) {
  return prisma.user.create({
    data: { email, passwordHash, firstName, lastName, phone },
    select: publicUserSelect,
  });
}

export async function findUserByEmail(email) {
  return prisma.user.findUnique({ where: { email } });
}

export async function findPublicUserById(id) {
  return prisma.user.findUnique({
    where: { id },
    select: publicUserSelect,
  });
}
