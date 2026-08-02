import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { prisma } from "../services/database.js";

const router = Router();
router.use(requireAuth);

// GET user schedules
router.get("/", async (req: any, res: any) => {
  try {
    const userId = req.session?.user?.id;
    const schedules = await prisma.schedule.findMany({
      where: { userId },
      orderBy: [
        { day: "asc" },
        { startTime: "asc" }
      ]
    });
    res.json(schedules);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Gagal memuat jadwal."
    });
  }
});

// DELETE all user schedules
router.delete("/", async (req: any, res: any) => {
  try {
    const userId = req.session?.user?.id;
    await prisma.schedule.deleteMany({
      where: { userId }
    });
    res.json({ success: true, message: "Seluruh jadwal berhasil dikosongkan." });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Gagal menghapus jadwal."
    });
  }
});

export default router;
