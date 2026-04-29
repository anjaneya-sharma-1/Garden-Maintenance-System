import { Router, type IRouter } from "express";
import { LogWateringBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import {
  getStore,
  saveStore,
  type WateringLog,
  type GardenPlant,
} from "../lib/json-store";

const router: IRouter = Router();

type LogRow = WateringLog;

function serialize(row: LogRow, nickname: string) {
  return {
    id: row.id,
    gardenPlantId: row.gardenPlantId,
    gardenPlantNickname: nickname,
    wateredAt: row.wateredAt.toISOString(),
    amountMl: row.amountMl,
    source: row.source as "manual" | "reminder" | "auto",
    notes: row.notes,
  };
}

router.get("/watering", requireAuth, async (req, res) => {
  const gardenPlantId =
    typeof req.query.gardenPlantId === "string"
      ? Number(req.query.gardenPlantId)
      : undefined;
  const store = await getStore();
  const rows = store.wateringLogs
    .map((log) => {
      const garden = store.gardenPlants.find(
        (entry) => entry.id === log.gardenPlantId,
      );
      return garden ? { log, garden } : null;
    })
    .filter(
      (row): row is { log: LogRow; garden: GardenPlant } =>
        Boolean(row) && row!.garden.userId === req.user!.id,
    )
    .filter((row) => {
      if (gardenPlantId && Number.isFinite(gardenPlantId)) {
        return row.log.gardenPlantId === gardenPlantId;
      }
      return true;
    })
    .sort((a, b) => b.log.wateredAt.getTime() - a.log.wateredAt.getTime())
    .slice(0, 200);
  res.json(rows.map(({ log, garden }) => serialize(log, garden.nickname)));
});

router.post("/watering", requireAuth, async (req, res) => {
  const parsed = LogWateringBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload" });
    return;
  }
  const store = await getStore();
  const garden = store.gardenPlants.find(
    (entry) =>
      entry.id === parsed.data.gardenPlantId &&
      entry.userId === req.user!.id,
  );
  if (!garden) {
    res.status(404).json({ message: "Plant not found" });
    return;
  }
  const created: WateringLog = {
    id: store.nextIds.wateringLogs++,
    gardenPlantId: parsed.data.gardenPlantId,
    amountMl: parsed.data.amountMl,
    source: parsed.data.source ?? "manual",
    notes: parsed.data.notes ?? null,
    wateredAt: new Date(),
  };
  store.wateringLogs.push(created);
  await saveStore(store);
  res.json(serialize(created, garden.nickname));
});

router.get("/watering/report", requireAuth, async (req, res) => {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const store = await getStore();
  const rows = store.wateringLogs
    .map((log) => {
      const garden = store.gardenPlants.find(
        (entry) => entry.id === log.gardenPlantId,
      );
      return garden ? { log, garden } : null;
    })
    .filter(
      (row): row is { log: LogRow; garden: GardenPlant } =>
        Boolean(row) &&
        row!.garden.userId === req.user!.id &&
        row!.log.wateredAt >= since,
    );

  const dailyMap = new Map<string, { amountMl: number; events: number }>();
  const perPlantMap = new Map<
    number,
    { gardenPlantId: number; nickname: string; events: number; amountMl: number }
  >();

  for (let i = 0; i < 30; i++) {
    const d = new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    dailyMap.set(key, { amountMl: 0, events: 0 });
  }

  let totalEvents = 0;
  let totalAmountMl = 0;
  for (const { log, garden } of rows) {
    totalEvents++;
    totalAmountMl += log.amountMl;
    const dayKey = log.wateredAt.toISOString().slice(0, 10);
    const day = dailyMap.get(dayKey) ?? { amountMl: 0, events: 0 };
    day.amountMl += log.amountMl;
    day.events += 1;
    dailyMap.set(dayKey, day);

    const existing = perPlantMap.get(garden.id);
    if (existing) {
      existing.events += 1;
      existing.amountMl += log.amountMl;
    } else {
      perPlantMap.set(garden.id, {
        gardenPlantId: garden.id,
        nickname: garden.nickname,
        events: 1,
        amountMl: log.amountMl,
      });
    }
  }

  res.json({
    totalEvents,
    totalAmountMl,
    dailyTotals: Array.from(dailyMap.entries()).map(([date, value]) => ({
      date,
      amountMl: value.amountMl,
      events: value.events,
    })),
    perPlant: Array.from(perPlantMap.values()).sort(
      (a, b) => b.amountMl - a.amountMl,
    ),
  });
});

export default router;
