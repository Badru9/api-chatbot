import { hashPassword } from "./services/auth.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seed() {
  try {
    // 1. Seed Admin
    console.log("Checking admin user...");
    const existingAdmin = await prisma.user.findFirst({
      where: { role: "admin" },
    });
    console.log("Existing admin user:", existingAdmin);

    if (existingAdmin) {
      console.log("Admin user already exists:", existingAdmin.email);
    } else {
      const passwordHash = await hashPassword("password123");
      const adminUser = await prisma.user.create({
        data: {
          email: "admin@mb.ai",
          password: passwordHash,
          name: "Super Admin",
          role: "admin",
        },
      });

      console.log("Admin user created successfully:", adminUser.email);
    }

    // 2. Seed Dosen
    console.log("Checking dosen user...");
    const existingDosen = await prisma.user.findFirst({
      where: { email: "dosen@mb.ai" },
    });

    if (existingDosen) {
      console.log("Dosen user already exists:", existingDosen.email);
    } else {
      const passwordHash = await hashPassword("password123");
      const dosenUser = await prisma.user.create({
        data: {
          email: "dosen@mb.ai",
          password: passwordHash,
          name: "Dr. Budi Dosen",
          role: "dosen",
        },
      });

      console.log("Dosen user created successfully:", dosenUser.email);
    }

    // 3. Seed Menus
    console.log("Checking portal menus...");
    const menuCount = await prisma.portalMenu.count();
    if (menuCount === 0) {
      const defaultMenus = [
        {
          title: "AISNET ITG",
          description:
            "Sistem informasi akademik mahasiswa berbasis Artificial Intelligence dengan integrasi Chatbot untuk pelayanan informasi akademik, akademik, presensi kehadiran, laporan kerja harian, serta evaluasi mahasiswa.",
          icon: "Monitor",
          href: "https://aisnet.itg.ac.id/",
          order: 1,
          visibleToRoles: ["admin", "dosen"],
          createdBy: "system",
        },
        {
          title: "E-Learning ITG",
          description:
            "Pengumpulan Tugas, Materi Pembelajaran, Ujian Online, Forum Diskusi, Penilaian Otomatis dan Analisis Kinerja Mahasiswa.",
          icon: "Folder",
          href: "https://elearning.itg.ac.id/",
          order: 2,
          visibleToRoles: ["admin", "dosen"],
          createdBy: "system",
        },
        {
          title: "Bimbingan Mahasiswa",
          description:
            "Akses data mahasiswa bimbingan akademik, laporan magang, konsultasi skripsi, dan KRS.",
          icon: "Student",
          href: "https://pessta.itg.ac.id/",
          order: 3,
          visibleToRoles: ["admin", "dosen"],
          createdBy: "system",
        },
        {
          title: "Portal SINTA",
          description:
            "Integrasi dan sinkronisasi otomatis skor SINTA, Scopus, Google Scholar, dan H-index.",
          icon: "TrendUp",
          href: "https://sinta.kemdikbud.go.id/",
          order: 5,
          visibleToRoles: ["admin", "dosen"],
          createdBy: "system",
        },
      ];

      await prisma.portalMenu.createMany({
        data: defaultMenus,
      });
      console.log("Portal menus seeded successfully!");
    } else {
      console.log("Portal menus already exist.");
    }
  } catch (error) {
    console.error("Failed to seed users/menus:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();

export {};
