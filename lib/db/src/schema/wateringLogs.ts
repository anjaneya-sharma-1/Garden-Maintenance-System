import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { gardenPlantsTable } from "./gardenPlants";

export const wateringLogsTable = pgTable("watering_logs", {
  id: serial("id").primaryKey(),
  gardenPlantId: integer("garden_plant_id")
    .notNull()
    .references(() => gardenPlantsTable.id, { onDelete: "cascade" }),
  amountMl: integer("amount_ml").notNull(),
  source: text("source").notNull().default("manual"),
  notes: text("notes"),
  wateredAt: timestamp("watered_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type WateringLog = typeof wateringLogsTable.$inferSelect;
export type InsertWateringLog = typeof wateringLogsTable.$inferInsert;
