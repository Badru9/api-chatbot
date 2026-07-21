import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { prisma } from "../services/database.js";

const router = Router();

router.get("/", async (req: any, res: any) => {
  try {
    let menus = await prisma.portalMenu.findMany({
      orderBy: { order: "asc" },
    });

    if (menus.length === 0) {
      const defaultMenus = [
        {
          title: "Monitoring Kinerja",
          description:
            "Analisis dan evaluasi kinerja akademik dosen secara real-time.",
          icon: "ChartBar",
          href: "/admin/kinerja",
          order: 1,
          visibleToRoles: ["admin", "dosen"],
          createdBy: "system",
        },
        {
          title: "AISNET ITG",
          description:
            "Sistem informasi akademik mahasiswa berbasis Artificial Intelligence dengan integrasi Chatbot untuk pelayanan informasi akademik, akademik, presensi kehadiran, laporan kerja harian, serta evaluasi mahasiswa.",
          icon: "Monitor",
          href: "https://aisnet.itg.ac.id/",
          order: 2,
          visibleToRoles: ["admin", "dosen"],
          createdBy: "system",
        },
        {
          title: "E-Learning ITG",
          description:
            "Pengumpulan Tugas, Materi Pembelajaran, Ujian Online, Forum Diskusi, Penilaian Otomatis dan Analisis Kinerja Mahasiswa.",
          icon: "Folder",
          href: "https://elearning.itg.ac.id/",
          order: 3,
          visibleToRoles: ["admin", "dosen"],
          createdBy: "system",
        },
        {
          title: "Bimbingan Mahasiswa",
          description:
            "Akses data mahasiswa bimbingan akademik, laporan magang, konsultasi skripsi, dan KRS.",
          icon: "Student",
          href: "https://pessta.itg.ac.id/",
          order: 4,
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

      menus = await prisma.portalMenu.findMany({
        orderBy: { order: "asc" },
      });
    }

    res.status(200).json(menus);
  } catch (error) {
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Gagal memuat menu portal.",
    });
  }
});

// POST create a new menu (requires admin)
router.post("/", requireAuth, requireAdmin, async (req: any, res: any) => {
  try {
    const { title, description, icon, href, visibleToRoles, order } = req.body;
    const session = (req as any).session;

    if (
      !title ||
      !description ||
      !icon ||
      !href ||
      !Array.isArray(visibleToRoles)
    ) {
      res.status(400).json({
        error:
          "Kolom title, description, icon, href, dan visibleToRoles wajib diisi.",
      });
      return;
    }

    let menuOrder = typeof order === "number" ? order : 0;
    if (typeof order !== "number") {
      const lastMenu = await prisma.portalMenu.findFirst({
        orderBy: { order: "desc" },
      });
      menuOrder = lastMenu ? lastMenu.order + 1 : 1;
    }

    const menu = await prisma.portalMenu.create({
      data: {
        title,
        description,
        icon,
        href,
        visibleToRoles,
        order: menuOrder,
        createdBy: session?.user?.id || "admin",
      },
    });

    res.status(201).json(menu);
  } catch (error) {
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Gagal membuat menu baru.",
    });
  }
});

// PUT update a menu (requires admin)
router.put("/:id", requireAuth, requireAdmin, async (req: any, res: any) => {
  try {
    const id = req.params.id as string;
    const { title, description, icon, href, visibleToRoles, order } = req.body;

    const existing = await prisma.portalMenu.findUnique({
      where: { id },
    });

    if (!existing) {
      res.status(404).json({ error: "Menu tidak ditemukan." });
      return;
    }

    const updated = await prisma.portalMenu.update({
      where: { id },
      data: {
        title: title !== undefined ? title : existing.title,
        description:
          description !== undefined ? description : existing.description,
        icon: icon !== undefined ? icon : existing.icon,
        href: href !== undefined ? href : existing.href,
        visibleToRoles:
          visibleToRoles !== undefined
            ? visibleToRoles
            : existing.visibleToRoles,
        order: order !== undefined ? order : existing.order,
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Gagal memperbarui menu.",
    });
  }
});

// DELETE a menu (requires admin)
router.delete("/:id", requireAuth, requireAdmin, async (req: any, res: any) => {
  try {
    const id = req.params.id as string;

    const existing = await prisma.portalMenu.findUnique({
      where: { id },
    });

    if (!existing) {
      res.status(404).json({ error: "Menu tidak ditemukan." });
      return;
    }

    await prisma.portalMenu.delete({
      where: { id },
    });

    res.json({ message: "Menu berhasil dihapus." });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Gagal menghapus menu.",
    });
  }
});

// PUT reorder multiple menus (requires admin)
router.put(
  "/reorder",
  requireAuth,
  requireAdmin,
  async (req: any, res: any) => {
    try {
      const { reorders } = req.body; // Array of { id: string, order: number }

      if (!Array.isArray(reorders)) {
        res.status(400).json({ error: "Payload reorders wajib berupa array." });
        return;
      }

      await prisma.$transaction(
        reorders.map((item: any) =>
          prisma.portalMenu.update({
            where: { id: item.id },
            data: { order: item.order },
          }),
        ),
      );

      res.json({ message: "Urutan menu berhasil diperbarui." });
    } catch (error) {
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Gagal memperbarui urutan menu.",
      });
    }
  },
);

export default router;
