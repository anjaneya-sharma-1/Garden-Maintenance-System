import { Router, type IRouter } from "express";
import { getStore } from "../lib/json-store";
import { serializeCatalog } from "./plants";

const router: IRouter = Router();

router.get("/knowledge/search", async (req, res) => {
  const q =
    typeof req.query.q === "string" ? req.query.q.trim() : "";

  if (!q) {
    res.json({ query: "", plants: [], articles: [], videos: [] });
    return;
  }

  const store = await getStore();
  const key = q.toLowerCase();
  const rows = store.catalogPlants
    .filter((plant) => {
      return (
        plant.commonName.toLowerCase().includes(key) ||
        plant.scientificName.toLowerCase().includes(key) ||
        plant.summary.toLowerCase().includes(key) ||
        plant.description.toLowerCase().includes(key)
      );
    })
    .sort((a, b) => a.commonName.localeCompare(b.commonName))
    .slice(0, 20);

  const articles = rows.flatMap((r) => r.articles).slice(0, 8);
  const videos = rows.flatMap((r) => r.videos).slice(0, 8);

  res.json({
    query: q,
    plants: rows.map(serializeCatalog),
    articles,
    videos,
  });
});

export default router;
