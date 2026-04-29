import { Router, type IRouter } from "express";
import {
  CreateReminderBody,
  UpdateReminderBody,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import {
  getStore,
  saveStore,
  type Reminder,
  type GardenPlant,
} from "../lib/json-store";

const router: IRouter = Router();

type ReminderRow = Reminder;
type GardenRow = GardenPlant;

function serialize(r: ReminderRow, nickname: string) {
  return {
    id: r.id,
    gardenPlantId: r.gardenPlantId,
    gardenPlantNickname: nickname,
    title: r.title,
    type: r.type as "water" | "fertilize" | "prune" | "inspect" | "other",
    scheduledAt: r.scheduledAt.toISOString(),
    completed: r.completed,
    repeatDays: r.repeatDays,
    notes: r.notes,
  };
}

function getOwnedPlant(
  store: Awaited<ReturnType<typeof getStore>>,
  plantId: number,
  userId: number,
) {
  return (
    store.gardenPlants.find(
      (entry) => entry.id === plantId && entry.userId === userId,
    ) ?? null
  );
}

router.get("/reminders", requireAuth, async (req, res) => {
  const gardenPlantId =
    typeof req.query.gardenPlantId === "string"
      ? Number(req.query.gardenPlantId)
      : undefined;
  const upcoming = req.query.upcoming === "true";
  const store = await getStore();
  const cutoff = new Date(Date.now() - 1000 * 60 * 60);
  const rows = store.reminders
    .map((reminder) => {
      const garden = store.gardenPlants.find(
        (entry) => entry.id === reminder.gardenPlantId,
      );
      return garden ? { reminder, garden } : null;
    })
    .filter(
      (row): row is { reminder: ReminderRow; garden: GardenRow } =>
        Boolean(row) && row!.garden.userId === req.user!.id,
    )
    .filter((row) => {
      if (gardenPlantId && Number.isFinite(gardenPlantId)) {
        if (row.reminder.gardenPlantId !== gardenPlantId) return false;
      }
      if (upcoming) {
        if (row.reminder.completed) return false;
        if (row.reminder.scheduledAt < cutoff) return false;
      }
      return true;
    })
    .sort((a, b) => a.reminder.scheduledAt.getTime() - b.reminder.scheduledAt.getTime());

  res.json(
    rows.map(({ reminder, garden }) => serialize(reminder, garden.nickname)),
  );
});

router.post("/reminders", requireAuth, async (req, res) => {
  const parsed = CreateReminderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload" });
    return;
  }
  const store = await getStore();
  const owned = getOwnedPlant(store, parsed.data.gardenPlantId, req.user!.id);
  if (!owned) {
    res.status(404).json({ message: "Plant not found" });
    return;
  }
  const created: Reminder = {
    id: store.nextIds.reminders++,
    gardenPlantId: parsed.data.gardenPlantId,
    title: parsed.data.title,
    type: parsed.data.type,
    scheduledAt: parsed.data.scheduledAt,
    repeatDays: parsed.data.repeatDays ?? 0,
    notes: parsed.data.notes ?? null,
    completed: false,
    createdAt: new Date(),
  };
  store.reminders.push(created);
  await saveStore(store);
  res.json(serialize(created, owned.nickname));
});

function loadReminderForUser(
  store: Awaited<ReturnType<typeof getStore>>,
  reminderId: number,
  userId: number,
) {
  const reminder = store.reminders.find((entry) => entry.id === reminderId);
  if (!reminder) return null;
  const garden = store.gardenPlants.find(
    (entry) => entry.id === reminder.gardenPlantId,
  );
  if (!garden || garden.userId !== userId) return null;
  return { reminder, garden };
}

router.patch("/reminders/:reminderId", requireAuth, async (req, res) => {
  const reminderId = Number(req.params.reminderId);
  if (!Number.isFinite(reminderId)) {
    res.status(400).json({ message: "Invalid id" });
    return;
  }
  const parsed = UpdateReminderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid payload" });
    return;
  }
  const store = await getStore();
  const owned = loadReminderForUser(store, reminderId, req.user!.id);
  if (!owned) {
    res.status(404).json({ message: "Not found" });
    return;
  }
  const update: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) update.title = parsed.data.title;
  if (parsed.data.type !== undefined) update.type = parsed.data.type;
  if (parsed.data.scheduledAt !== undefined)
    update.scheduledAt = parsed.data.scheduledAt;
  if (parsed.data.repeatDays !== undefined)
    update.repeatDays = parsed.data.repeatDays;
  if (parsed.data.notes !== undefined) update.notes = parsed.data.notes;
  if (parsed.data.completed !== undefined)
    update.completed = parsed.data.completed;

  const target = owned.reminder;
  if (update.title !== undefined) target.title = update.title as ReminderRow["title"];
  if (update.type !== undefined) target.type = update.type as ReminderRow["type"];
  if (update.scheduledAt !== undefined)
    target.scheduledAt = update.scheduledAt as Date;
  if (update.repeatDays !== undefined)
    target.repeatDays = update.repeatDays as number;
  if (update.notes !== undefined) target.notes = update.notes as string | null;
  if (update.completed !== undefined)
    target.completed = update.completed as boolean;
  await saveStore(store);
  res.json(serialize(target, owned.garden.nickname));
});

router.delete("/reminders/:reminderId", requireAuth, async (req, res) => {
  const reminderId = Number(req.params.reminderId);
  if (!Number.isFinite(reminderId)) {
    res.status(400).json({ message: "Invalid id" });
    return;
  }
  const store = await getStore();
  const owned = loadReminderForUser(store, reminderId, req.user!.id);
  if (!owned) {
    res.status(404).json({ message: "Not found" });
    return;
  }
  store.reminders = store.reminders.filter((entry) => entry.id !== reminderId);
  await saveStore(store);
  res.json({ ok: true });
});

router.post(
  "/reminders/:reminderId/complete",
  requireAuth,
  async (req, res) => {
    const reminderId = Number(req.params.reminderId);
    if (!Number.isFinite(reminderId)) {
      res.status(400).json({ message: "Invalid id" });
      return;
    }
    const store = await getStore();
    const owned = loadReminderForUser(store, reminderId, req.user!.id);
    if (!owned) {
      res.status(404).json({ message: "Not found" });
      return;
    }
    const update: Record<string, unknown> = { completed: true };
    if (owned.reminder.repeatDays > 0) {
      update.completed = false;
      update.scheduledAt = new Date(
        owned.reminder.scheduledAt.getTime() +
          owned.reminder.repeatDays * 24 * 60 * 60 * 1000,
      );
    }
    if (update.completed !== undefined)
      owned.reminder.completed = update.completed as boolean;
    if (update.scheduledAt !== undefined)
      owned.reminder.scheduledAt = update.scheduledAt as Date;
    await saveStore(store);
    res.json(serialize(owned.reminder, owned.garden.nickname));
  },
);

export default router;
