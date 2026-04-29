import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { getStore } from "../lib/json-store";

const router: IRouter = Router();

router.get("/dashboard/summary", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const store = await getStore();
  const plants = store.gardenPlants.filter((plant) => plant.userId === userId);

  const totalPlants = plants.length;
  const healthBreakdownMap = new Map<string, number>();
  for (const p of plants) {
    healthBreakdownMap.set(
      p.healthStatus,
      (healthBreakdownMap.get(p.healthStatus) ?? 0) + 1,
    );
  }
  const healthyPlants =
    (healthBreakdownMap.get("thriving") ?? 0) +
    (healthBreakdownMap.get("healthy") ?? 0);
  const plantsNeedingAttention =
    (healthBreakdownMap.get("watch") ?? 0) +
    (healthBreakdownMap.get("struggling") ?? 0);

  const userPlantIds = new Set(plants.map((plant) => plant.id));
  const dueRemindersToday = store.reminders.filter(
    (reminder) =>
      userPlantIds.has(reminder.gardenPlantId) &&
      !reminder.completed &&
      reminder.scheduledAt >= startOfDay &&
      reminder.scheduledAt < endOfDay,
  ).length;

  const overdueReminders = store.reminders.filter(
    (reminder) =>
      userPlantIds.has(reminder.gardenPlantId) &&
      !reminder.completed &&
      reminder.scheduledAt < startOfDay,
  ).length;

  const wateredThisWeek = store.wateringLogs.filter(
    (log) =>
      userPlantIds.has(log.gardenPlantId) && log.wateredAt >= weekAgo,
  ).length;

  res.json({
    totalPlants,
    healthyPlants,
    plantsNeedingAttention,
    dueRemindersToday,
    overdueReminders,
    wateredThisWeek,
    healthBreakdown: Array.from(healthBreakdownMap.entries()).map(
      ([status, count]) => ({ status, count }),
    ),
  });
});

router.get("/dashboard/activity", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const store = await getStore();
  const userPlants = store.gardenPlants.filter(
    (plant) => plant.userId === userId,
  );
  const userPlantIds = new Set(userPlants.map((plant) => plant.id));

  const watering = store.wateringLogs
    .filter(
      (log) => userPlantIds.has(log.gardenPlantId) && log.wateredAt >= since,
    )
    .map((log) => ({
      log,
      garden: store.gardenPlants.find((plant) => plant.id === log.gardenPlantId),
    }))
    .filter((row) => Boolean(row.garden))
    .sort((a, b) => b.log.wateredAt.getTime() - a.log.wateredAt.getTime())
    .slice(0, 15) as Array<{
      log: typeof store.wateringLogs[number];
      garden: typeof store.gardenPlants[number];
    }>;

  const completedReminders = store.reminders
    .filter(
      (reminder) =>
        userPlantIds.has(reminder.gardenPlantId) && reminder.completed,
    )
    .map((reminder) => ({
      reminder,
      garden: store.gardenPlants.find(
        (plant) => plant.id === reminder.gardenPlantId,
      ),
    }))
    .filter((row) => Boolean(row.garden))
    .sort((a, b) => b.reminder.scheduledAt.getTime() - a.reminder.scheduledAt.getTime())
    .slice(0, 10) as Array<{
      reminder: typeof store.reminders[number];
      garden: typeof store.gardenPlants[number];
    }>;

  const newPlants = userPlants
    .filter((plant) => plant.plantedAt >= since)
    .sort((a, b) => b.plantedAt.getTime() - a.plantedAt.getTime())
    .slice(0, 10);

  const careRoutines = store.careRoutines
    .filter(
      (care) =>
        userPlantIds.has(care.gardenPlantId) && care.generatedAt >= since,
    )
    .map((care) => ({
      care,
      garden: store.gardenPlants.find(
        (plant) => plant.id === care.gardenPlantId,
      ),
    }))
    .filter((row) => Boolean(row.garden))
    .sort((a, b) => b.care.generatedAt.getTime() - a.care.generatedAt.getTime())
    .slice(0, 10) as Array<{
      care: typeof store.careRoutines[number];
      garden: typeof store.gardenPlants[number];
    }>;

  type Item = {
    id: string;
    kind: "watering" | "reminder" | "plant_added" | "care_generated";
    title: string;
    description: string;
    occurredAt: string;
    gardenPlantId: number | null;
  };

  const items: Item[] = [];
  for (const { log, garden } of watering) {
    items.push({
      id: `w-${log.id}`,
      kind: "watering",
      title: `Watered ${garden.nickname}`,
      description: `${log.amountMl}ml — ${log.source}`,
      occurredAt: log.wateredAt.toISOString(),
      gardenPlantId: garden.id,
    });
  }
  for (const { reminder, garden } of completedReminders) {
    items.push({
      id: `r-${reminder.id}`,
      kind: "reminder",
      title: reminder.title,
      description: `Completed for ${garden.nickname}`,
      occurredAt: reminder.scheduledAt.toISOString(),
      gardenPlantId: garden.id,
    });
  }
  for (const p of newPlants) {
    items.push({
      id: `p-${p.id}`,
      kind: "plant_added",
      title: `Added ${p.nickname}`,
      description: `New plant in ${p.location}`,
      occurredAt: p.plantedAt.toISOString(),
      gardenPlantId: p.id,
    });
  }
  for (const { care, garden } of careRoutines) {
    items.push({
      id: `c-${care.id}`,
      kind: "care_generated",
      title: `Care plan refreshed for ${garden.nickname}`,
      description: `Watering every ${care.wateringFrequencyDays} day${care.wateringFrequencyDays > 1 ? "s" : ""}`,
      occurredAt: care.generatedAt.toISOString(),
      gardenPlantId: garden.id,
    });
  }

  items.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  res.json(items.slice(0, 25));
});

export default router;
