import { Router, type IRouter } from "express";
import { AddGardenPlantBody, UpdateGardenPlantBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { serializeCatalog } from "./plants";
import { simulateLatestSoil } from "../lib/soil";
import {
  getStore,
  saveStore,
  type CatalogPlant,
  type GardenPlant,
} from "../lib/json-store";

const router: IRouter = Router();

type GardenRow = GardenPlant;
type CatalogRow = CatalogPlant;

function loadLastWateredAt(
  store: Awaited<ReturnType<typeof getStore>>,
  plantId: number,
): Date | null {
  const latest = store.wateringLogs
    .filter((log) => log.gardenPlantId === plantId)
    .sort((a, b) => b.wateredAt.getTime() - a.wateredAt.getTime())[0];
  return latest?.wateredAt ?? null;
}

export function serializeGarden(
  g: GardenRow,
  c: CatalogRow,
  lastWateredAt: Date | null,
) {
  return {
    id: g.id,
    nickname: g.nickname,
    location: g.location,
    plantedAt: g.plantedAt.toISOString(),
    notes: g.notes,
    healthStatus: g.healthStatus as
      | "thriving"
      | "healthy"
      | "watch"
      | "struggling",
    lastWateredAt: lastWateredAt ? lastWateredAt.toISOString() : null,
    catalogPlant: serializeCatalog(c),
  };
}

router.get("/garden", requireAuth, async (req, res) => {
  const store = await getStore();
  const plants = store.gardenPlants
    .filter((garden) => garden.userId === req.user!.id)
    .sort((a, b) => b.plantedAt.getTime() - a.plantedAt.getTime());

  const enriched = plants
    .map((garden) => {
      const catalog = store.catalogPlants.find(
        (entry) => entry.id === garden.catalogPlantId,
      );
      if (!catalog) return null;
      const lastWateredAt = loadLastWateredAt(store, garden.id);
      return serializeGarden(garden, catalog, lastWateredAt);
    })
    .filter((item): item is ReturnType<typeof serializeGarden> => Boolean(item));

  res.json(enriched);
});

router.post("/garden", requireAuth, async (req, res) => {
  const parsed = AddGardenPlantBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload" });
    return;
  }
  const store = await getStore();
  const catalog = store.catalogPlants.find(
    (entry) => entry.id === parsed.data.catalogPlantId,
  );
  if (!catalog) {
    res.status(404).json({ message: "Catalog plant not found" });
    return;
  }
  const created: GardenPlant = {
    id: store.nextIds.gardenPlants++,
    userId: req.user!.id,
    catalogPlantId: catalog.id,
    nickname: parsed.data.nickname,
    location: parsed.data.location,
    notes: parsed.data.notes ?? null,
    healthStatus: "healthy",
    plantedAt: new Date(),
  };
  store.gardenPlants.push(created);
  await saveStore(store);
  res.json(serializeGarden(created, catalog, null));
});

router.get("/garden/:plantId", requireAuth, async (req, res) => {
  const plantId = Number(req.params.plantId);
  if (!Number.isFinite(plantId)) {
    res.status(400).json({ message: "Invalid id" });
    return;
  }
  const store = await getStore();
  const garden = store.gardenPlants.find(
    (entry) => entry.id === plantId && entry.userId === req.user!.id,
  );
  if (!garden) {
    res.status(404).json({ message: "Not found" });
    return;
  }
  const catalog = store.catalogPlants.find(
    (entry) => entry.id === garden.catalogPlantId,
  );
  if (!catalog) {
    res.status(404).json({ message: "Catalog plant not found" });
    return;
  }
  const lastWateredAt = loadLastWateredAt(store, garden.id);
  const base = serializeGarden(garden, catalog, lastWateredAt);

  const careRoutine = store.careRoutines.find(
    (entry) => entry.gardenPlantId === plantId,
  );

  const recentWatering = store.wateringLogs
    .filter((log) => log.gardenPlantId === plantId)
    .sort((a, b) => b.wateredAt.getTime() - a.wateredAt.getTime())
    .slice(0, 10);

  const upcomingCutoff = new Date(Date.now() - 1000 * 60 * 60);
  const upcomingReminders = store.reminders
    .filter(
      (reminder) =>
        reminder.gardenPlantId === plantId &&
        !reminder.completed &&
        reminder.scheduledAt >= upcomingCutoff,
    )
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
    .slice(0, 10);

  const latestSoil = simulateLatestSoil(plantId);

  res.json({
    ...base,
    careRoutine: careRoutine
      ? {
          id: careRoutine.id,
          gardenPlantId: careRoutine.gardenPlantId,
          wateringFrequencyDays: careRoutine.wateringFrequencyDays,
          wateringAmountMl: careRoutine.wateringAmountMl,
          sunlight: careRoutine.sunlight,
          soilNotes: careRoutine.soilNotes,
          fertilizerNotes: careRoutine.fertilizerNotes,
          generatedAt: careRoutine.generatedAt.toISOString(),
          tasks: careRoutine.tasks,
        }
      : null,
    recentWatering: recentWatering.map((w) => ({
      id: w.id,
      gardenPlantId: w.gardenPlantId,
      gardenPlantNickname: garden.nickname,
      wateredAt: w.wateredAt.toISOString(),
      amountMl: w.amountMl,
      source: w.source as "manual" | "reminder" | "auto",
      notes: w.notes,
    })),
    upcomingReminders: upcomingReminders.map((r) => ({
      id: r.id,
      gardenPlantId: r.gardenPlantId,
      gardenPlantNickname: garden.nickname,
      title: r.title,
      type: r.type as "water" | "fertilize" | "prune" | "inspect" | "other",
      scheduledAt: r.scheduledAt.toISOString(),
      completed: r.completed,
      repeatDays: r.repeatDays,
      notes: r.notes,
    })),
    latestSoil,
  });
});

router.patch("/garden/:plantId", requireAuth, async (req, res) => {
  const plantId = Number(req.params.plantId);
  if (!Number.isFinite(plantId)) {
    res.status(400).json({ message: "Invalid id" });
    return;
  }
  const parsed = UpdateGardenPlantBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload" });
    return;
  }
  const update: Record<string, string> = {};
  if (parsed.data.nickname !== undefined) update.nickname = parsed.data.nickname;
  if (parsed.data.location !== undefined) update.location = parsed.data.location;
  if (parsed.data.notes !== undefined) update.notes = parsed.data.notes;
  if (parsed.data.healthStatus !== undefined)
    update.healthStatus = parsed.data.healthStatus;

  const store = await getStore();
  const existing = store.gardenPlants.find(
    (entry) => entry.id === plantId && entry.userId === req.user!.id,
  );
  if (!existing) {
    res.status(404).json({ message: "Not found" });
    return;
  }

  if (update.nickname !== undefined) existing.nickname = update.nickname;
  if (update.location !== undefined) existing.location = update.location;
  if (update.notes !== undefined) existing.notes = update.notes;
  if (update.healthStatus !== undefined)
    existing.healthStatus = update.healthStatus as GardenPlant["healthStatus"];

  const catalog = store.catalogPlants.find(
    (entry) => entry.id === existing.catalogPlantId,
  );
  if (!catalog) {
    res.status(404).json({ message: "Catalog plant not found" });
    return;
  }
  const lastWateredAt = loadLastWateredAt(store, existing.id);
  await saveStore(store);
  res.json(serializeGarden(existing, catalog, lastWateredAt));
});

router.delete("/garden/:plantId", requireAuth, async (req, res) => {
  const plantId = Number(req.params.plantId);
  if (!Number.isFinite(plantId)) {
    res.status(400).json({ message: "Invalid id" });
    return;
  }
  const store = await getStore();
  const idx = store.gardenPlants.findIndex(
    (entry) => entry.id === plantId && entry.userId === req.user!.id,
  );
  if (idx < 0) {
    res.status(404).json({ message: "Not found" });
    return;
  }
  store.gardenPlants.splice(idx, 1);
  store.careRoutines = store.careRoutines.filter(
    (entry) => entry.gardenPlantId !== plantId,
  );
  store.reminders = store.reminders.filter(
    (entry) => entry.gardenPlantId !== plantId,
  );
  store.wateringLogs = store.wateringLogs.filter(
    (entry) => entry.gardenPlantId !== plantId,
  );
  await saveStore(store);
  res.json({ ok: true });
});

export default router;
