const { betterAuth } = require("better-auth");
const { prismaAdapter } = require("@better-auth/prisma-adapter");
const { prisma } = require("./database");
const { dash } = require("@better-auth/infra");

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  trustedOrigins: ["http://localhost:3000"],
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "dosen",
      },
    },
  },
  plugins: [dash()],
  advanced: {
    trustedProxyHeaders: true,
  },
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
});
