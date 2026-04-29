import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { gardenPlantsTable } from "./gardenPlants";

export type CareTask = {
  title: string;
  frequency: string;
  description: string;
};

export const careRoutinesTable = pgTable("care_routines", {
  id: serial("id").primaryKey(),
  gardenPlantId: integer("garden_plant_id")
    .notNull()
    .references(() => gardenPlantsTable.id, { onDelete: "cascade" })
    .unique(),
  wateringFrequencyDays: integer("watering_frequency_days").notNull(),
  wateringAmountMl: integer("watering_amount_ml").notNull(),
  sunlight: text("sunlight").notNull(),
  soilNotes: text("soil_notes").notNull(),
  fertilizerNotes: text("fertilizer_notes").notNull(),
  tasks: jsonb("tasks").$type<CareTask[]>().notNull().default([]),
  generatedAt: timestamp("generated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type CareRoutine = typeof careRoutinesTable.$inferSelect;
export type InsertCareRoutine = typeof careRoutinesTable.$inferInsert;
