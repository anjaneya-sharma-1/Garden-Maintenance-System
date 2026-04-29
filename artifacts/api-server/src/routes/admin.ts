import { Router, type IRouter } from "express";
import {
  AdminCreateCatalogPlantBody,
  AdminUpdateCatalogPlantBody,
} from "@workspace/api-zod";
import { requireAdmin } from "../lib/auth";
import { serializeCatalog } from "./plants";
import { getStore, saveStore, type CatalogPlant } from "../lib/json-store";

const router: IRouter = Router();

router.get("/admin/users", requireAdmin, async (_req, res) => {
  const store = await getStore();
  const plantCounts = new Map<number, number>();
  for (const plant of store.gardenPlants) {
    plantCounts.set(plant.userId, (plantCounts.get(plant.userId) ?? 0) + 1);
  }

  const rows = [...store.users].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );

  res.json(
    rows.map((r) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      region: r.region,
      role: r.role as "user" | "admin",
      createdAt: r.createdAt.toISOString(),
      plantCount: plantCounts.get(r.id) ?? 0,
    })),
  );
});

router.delete("/admin/users/:userId", requireAdmin, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isFinite(userId)) {
    res.status(400).json({ message: "Invalid id" });
    return;
  }
  if (userId === req.user!.id) {
    res.status(400).json({ message: "Cannot delete yourself" });
    return;
  }
  const store = await getStore();
  store.users = store.users.filter((user) => user.id !== userId);
  const ownedGardenIds = new Set(
    store.gardenPlants.filter((p) => p.userId === userId).map((p) => p.id),
  );
  store.sessions = store.sessions.filter((session) => session.userId !== userId);
  store.gardenPlants = store.gardenPlants.filter((p) => p.userId !== userId);
  store.careRoutines = store.careRoutines.filter(
    (care) => !ownedGardenIds.has(care.gardenPlantId),
  );
  store.reminders = store.reminders.filter(
    (reminder) => !ownedGardenIds.has(reminder.gardenPlantId),
  );
  store.wateringLogs = store.wateringLogs.filter(
    (log) => !ownedGardenIds.has(log.gardenPlantId),
  );
  await saveStore(store);
  res.json({ ok: true });
});

router.get("/admin/catalog", requireAdmin, async (_req, res) => {
  const store = await getStore();
  const rows = [...store.catalogPlants].sort((a, b) =>
    a.commonName.localeCompare(b.commonName),
  );
  res.json(rows.map(serializeCatalog));
});

router.post("/admin/catalog", requireAdmin, async (req, res) => {
  const parsed = AdminCreateCatalogPlantBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload" });
    return;
  }
  const store = await getStore();
  const created: CatalogPlant = {
    id: store.nextIds.catalogPlants++,
    ...parsed.data,
    articles: [],
    videos: [],
  };
  store.catalogPlants.push(created);
  await saveStore(store);
  res.json(serializeCatalog(created));
});

router.patch("/admin/catalog/:plantId", requireAdmin, async (req, res) => {
  const plantId = Number(req.params.plantId);
  if (!Number.isFinite(plantId)) {
    res.status(400).json({ message: "Invalid id" });
    return;
  }
  const parsed = AdminUpdateCatalogPlantBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload" });
    return;
  }
  const store = await getStore();
  const target = store.catalogPlants.find((p) => p.id === plantId);
  if (!target) {
    res.status(404).json({ message: "Not found" });
    return;
  }
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) {
      (target as Record<string, unknown>)[k] = v;
    }
  }
  await saveStore(store);
  res.json(serializeCatalog(target));
});

router.delete("/admin/catalog/:plantId", requireAdmin, async (req, res) => {
  const plantId = Number(req.params.plantId);
  if (!Number.isFinite(plantId)) {
    res.status(400).json({ message: "Invalid id" });
    return;
  }
  const store = await getStore();
  store.catalogPlants = store.catalogPlants.filter((p) => p.id !== plantId);
  await saveStore(store);
  res.json({ ok: true });
});

router.get("/admin/stats", requireAdmin, async (_req, res) => {
  const store = await getStore();
  res.json({
    totalUsers: store.users.length,
    totalCatalogPlants: store.catalogPlants.length,
    totalGardenPlants: store.gardenPlants.length,
    totalReminders: store.reminders.length,
    totalWateringLogs: store.wateringLogs.length,
  });
});

export default router;
