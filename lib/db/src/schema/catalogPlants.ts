import { pgTable, serial, text, integer, jsonb } from "drizzle-orm/pg-core";

export type ArticleRef = { title: string; url: string; source: string };
export type VideoRef = {
  title: string;
  url: string;
  thumbnailUrl: string;
  durationSeconds?: number;
};

export const catalogPlantsTable = pgTable("catalog_plants", {
  id: serial("id").primaryKey(),
  commonName: text("common_name").notNull(),
  scientificName: text("scientific_name").notNull(),
  category: text("category").notNull(),
  difficulty: text("difficulty").notNull(),
  imageUrl: text("image_url").notNull(),
  summary: text("summary").notNull(),
  description: text("description").notNull(),
  sunlight: text("sunlight").notNull(),
  waterFrequencyDays: integer("water_frequency_days").notNull(),
  idealTemperatureC: text("ideal_temperature_c").notNull(),
  soilType: text("soil_type").notNull(),
  articles: jsonb("articles").$type<ArticleRef[]>().notNull().default([]),
  videos: jsonb("videos").$type<VideoRef[]>().notNull().default([]),
});

export type CatalogPlant = typeof catalogPlantsTable.$inferSelect;
export type InsertCatalogPlant = typeof catalogPlantsTable.$inferInsert;
