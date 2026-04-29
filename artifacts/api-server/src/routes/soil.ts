import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { simulateHistory, simulateLatestSoil } from "../lib/soil";
import { getStore } from "../lib/json-store";

const router: IRouter = Router();

async function ensureOwned(plantId: number, userId: number) {
  const store = await getStore();
  return (
    store.gardenPlants.find(
      (entry) => entry.id === plantId && entry.userId === userId,
    ) ?? null
  );
}

router.get("/soil/:gardenPlantId", requireAuth, async (req, res) => {
  const id = Number(req.params.gardenPlantId);
  if (!Number.isFinite(id)) {
    res.status(400).json({ message: "Invalid id" });
    return;
  }
  const owned = await ensureOwned(id, req.user!.id);
  if (!owned) {
    res.status(404).json({ message: "Not found" });
    return;
  }
  res.json(simulateLatestSoil(id));
});

router.get("/soil/:gardenPlantId/history", requireAuth, async (req, res) => {
  const id = Number(req.params.gardenPlantId);
  if (!Number.isFinite(id)) {
    res.status(400).json({ message: "Invalid id" });
    return;
  }
  const owned = await ensureOwned(id, req.user!.id);
  if (!owned) {
    res.status(404).json({ message: "Not found" });
    return;
  }
  res.json(simulateHistory(id, 24));
});

export default router;
