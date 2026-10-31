import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true },
  user: {
    deleteUser: {
      enabled: true,
      // Hapus transaksi dulu, supaya aman walau relasi Prisma tidak cascade.
      beforeDelete: async (user) => {
        await prisma.transaction.deleteMany({ where: { userId: user.id } });
      },
    },
  },
  plugins: [nextCookies()],
});