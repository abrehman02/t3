import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL is missing - database queries will fail.");
}

export const db =
  globalForPrisma.prisma ||
  new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

export default db;
