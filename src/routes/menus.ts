import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { requireAdmin } from "../middleware/requireAdmin";
import { prisma } from "../services/database";

const router = Router();

router.get("/", async (req: any, res: any) => {
  try {
    const menus = await prisma.portalMenu.findMany({
      orderBy: { order: "asc" },
    });

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

module.exports = router;
