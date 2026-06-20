import { auth } from './services/auth.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  try {
    // 1. Seed Admin
    console.log('Checking admin user...');
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'admin' },
    });

    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.email);
    } else {
      const adminUser = await auth.api.signUpEmail({
        body: {
          email: 'admin@mb.ai',
          password: 'password123',
          name: 'Super Admin',
        },
      });

      await prisma.user.update({
        where: { id: adminUser.user.id },
        data: { role: 'admin' },
      });

      console.log('Admin user created successfully: admin@mb.ai / password123');
    }

    // 2. Seed Dosen
    console.log('Checking dosen user...');
    const existingDosen = await prisma.user.findFirst({
      where: { email: 'dosen@mb.ai' },
    });

    if (existingDosen) {
      console.log('Dosen user already exists:', existingDosen.email);
    } else {
      const dosenUser = await auth.api.signUpEmail({
        body: {
          email: 'dosen@mb.ai',
          password: 'password123',
          name: 'Dr. Budi Dosen',
        },
      });

      await prisma.user.update({
        where: { id: dosenUser.user.id },
        data: { role: 'dosen' },
      });

      console.log('Dosen user created successfully: dosen@mb.ai / password123');
    }
  } catch (error) {
    console.error('Failed to seed users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
