import bcrypt from "bcrypt";
import crypto from "crypto";
import { prisma } from "./database.js";
import { v4 as uuid } from 'uuid'

const SALT_ROUNDS = 10;
const SESSION_TTL_DAYS = 30;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function login(email: string, password: string, ipAddress?: string, userAgent?: string) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.password) {
    return null;
  }

  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    return null;
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);

  const session = await prisma.session.create({
    data: {
      id: uuid(),
      token,
      userId: user.id,
      expiresAt,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      image: user.image,
    },
    session,
  };
}

export async function getSession(token: string) {
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
        },
      },
    },
  });

  if (!session) return null;

  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => { });
    return null;
  }

  return {
    session: {
      id: session.id,
      userId: session.userId,
      token: session.token,
      expiresAt: session.expiresAt,
    },
    user: session.user,
  };
}

export async function logout(token: string): Promise<boolean> {
  if (!token) return false;
  try {
    await prisma.session.delete({ where: { token } });
    return true;
  } catch {
    return false;
  }
}
