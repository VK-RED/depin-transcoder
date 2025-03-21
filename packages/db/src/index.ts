import { PrismaClient } from "@prisma/client";
export { type Prisma } from "@prisma/client";

export const dbClient = new PrismaClient();
