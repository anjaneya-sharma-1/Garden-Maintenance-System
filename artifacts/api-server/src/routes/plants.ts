import { Router, type IRouter } from "express";
import type { CatalogPlant } from "../lib/json-store";
import { getStore } from "../lib/json-store";

const router: IRouter = Router();

function summarize(plant: CatalogPlant) {
  return {
    id: plant.id,
    commonName: plant.commonName,
    scientificName: plant.scientificName,
    category: plant.category,
    difficulty: plant.difficulty as "easy" | "medium" | "hard",
    imageUrl: plant.imageUrl,
    summary: plant.summary,
    sunlight: plant.sunlight,
    waterFrequencyDays: plant.waterFrequencyDays,
    idealTemperatureC: plant.idealTemperatureC,
    soilType: plant.soilType,
  };
}

export function serializeCatalog(p: CatalogPlant) {
  return summarize(p);
}

export function serializeCatalogDetail(p: CatalogPlant) {
  return {
    ...summarize(p),
    description: p.description,
    articles: p.articles,
    videos: p.videos,
  };
}

router.get("/plants/catalog", async (req, res) => {
  const search =
    typeof req.query.search === "string" ? req.query.search.trim() : "";
  const category =
    typeof req.query.category === "string" ? req.query.category.trim() : "";

  const store = await getStore();
  const q = search.toLowerCase();
  const categoryKey = category.toLowerCase();

  const rows = store.catalogPlants
    .filter((plant) => {
      if (q) {
        const matches =
          plant.commonName.toLowerCase().includes(q) ||
          plant.scientificName.toLowerCase().includes(q) ||
          plant.summary.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (categoryKey) {
        if (plant.category.toLowerCase() !== categoryKey) return false;
      }
      return true;
    })
    .sort((a, b) => a.commonName.localeCompare(b.commonName));

  res.json(rows.map(summarize));
});

router.get("/plants/catalog/:plantId", async (req, res) => {
  const plantId = Number(req.params.plantId);
  if (!Number.isFinite(plantId)) {
    res.status(400).json({ message: "Invalid plant id" });
    return;
  }
  const store = await getStore();
  const plant = store.catalogPlants.find((entry) => entry.id === plantId);
  if (!plant) {
    res.status(404).json({ message: "Not found" });
    return;
  }
  res.json(serializeCatalogDetail(plant));
});

export default router;
