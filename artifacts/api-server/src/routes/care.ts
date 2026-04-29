import { Router, type IRouter } from "express";
import { GenerateCareRoutineBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import type { CareTask } from "../lib/json-store";
import { getStore, saveStore } from "../lib/json-store";

const router: IRouter = Router();

function regionAdjust(region: string) {
  const r = region.toLowerCase();
  if (
    /(desert|arizona|nevada|sahara|dubai|phoenix|vegas)/.test(r)
  ) {
    return { tempo: 0.7, sunlight: "Full sun, with afternoon shade" };
  }
  if (/(tropic|miami|hawaii|singapore|bali|brazil|mumbai)/.test(r)) {
    return { tempo: 0.85, sunlight: "Bright filtered light, high humidity" };
  }
  if (/(uk|london|seattle|portland|berlin|paris|rain)/.test(r)) {
    return { tempo: 1.3, sunlight: "Bright indirect light near south window" };
  }
  if (/(alpine|mountain|denver|nordic|sweden|norway)/.test(r)) {
    return { tempo: 1.2, sunlight: "Direct sun, sheltered from cold drafts" };
  }
  return { tempo: 1, sunlight: "Bright, indirect light most of the day" };
}

router.post("/care/generate", requireAuth, async (req, res) => {
  const parsed = GenerateCareRoutineBody.safeParse(req.body);
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
    res.status(404).json({ message: "Garden plant not found" });
    return;
  }
  const catalog = store.catalogPlants.find(
    (entry) => entry.id === garden.catalogPlantId,
  );
  if (!catalog) {
    res.status(404).json({ message: "Catalog plant not found" });
    return;
  }
  const { tempo, sunlight } = regionAdjust(req.user!.region);
  const wateringFrequencyDays = Math.max(
    1,
    Math.round(catalog.waterFrequencyDays * tempo),
  );
  const wateringAmountMl =
    catalog.difficulty === "hard"
      ? 350
      : catalog.difficulty === "medium"
        ? 250
        : 180;

  const tasks: CareTask[] = [
    {
      title: "Water deeply",
      frequency: `Every ${wateringFrequencyDays} day${wateringFrequencyDays > 1 ? "s" : ""}`,
      description: `Pour roughly ${wateringAmountMl}ml of room-temperature water at the base until you see runoff.`,
    },
    {
      title: "Check soil moisture",
      frequency: "Every 2 days",
      description:
        "Push a finger 2cm into the soil. If dry, it's time to water; if soggy, hold off another day.",
    },
    {
      title: "Inspect leaves",
      frequency: "Weekly",
      description:
        "Look under leaves for pests, yellowing, or curling. Wipe dust gently with a damp cloth.",
    },
    {
      title: "Feed with balanced fertilizer",
      frequency: "Every 4 weeks (growing season)",
      description: `Use a half-strength balanced (10-10-10) liquid fertilizer suitable for ${catalog.category.toLowerCase()}.`,
    },
    {
      title: "Rotate for even growth",
      frequency: "Every 2 weeks",
      description:
        "Turn the pot a quarter turn so all sides receive equal light.",
    },
  ];

  const values = {
    gardenPlantId: garden.id,
    wateringFrequencyDays,
    wateringAmountMl,
    sunlight,
    soilNotes: `Prefers ${catalog.soilType.toLowerCase()}. Keep drainage holes clear.`,
    fertilizerNotes:
      "Half-strength balanced liquid fertilizer every 4 weeks during the growing season.",
    tasks,
    generatedAt: new Date(),
  };

  const existing = store.careRoutines.find(
    (entry) => entry.gardenPlantId === garden.id,
  );

  const saved = existing
    ? Object.assign(existing, values)
    : {
        id: store.nextIds.careRoutines++,
        ...values,
      };

  if (!existing) {
    store.careRoutines.push(saved);
  }

  await saveStore(store);

  res.json({
    id: saved.id,
    gardenPlantId: saved.gardenPlantId,
    wateringFrequencyDays: saved.wateringFrequencyDays,
    wateringAmountMl: saved.wateringAmountMl,
    sunlight: saved.sunlight,
    soilNotes: saved.soilNotes,
    fertilizerNotes: saved.fertilizerNotes,
    generatedAt: saved.generatedAt.toISOString(),
    tasks: saved.tasks,
  });
});

export default router;
