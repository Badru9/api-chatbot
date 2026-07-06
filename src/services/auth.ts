import { betterAuth } from 'better-auth';
import { prismaAdapter } from '@better-auth/prisma-adapter';
import { prisma } from './database.js';
import { dash } from '@better-auth/infra';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  trustedOrigins: ['http://localhost:3000'],
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'dosen',
      },
    },
  },
  plugins: [
    dash(),
  ],
  advanced: {
    trustedProxyHeaders: true,
  },
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
});
