import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { catalogPlantsTable } from "./catalogPlants";

export const gardenPlantsTable = pgTable("garden_plants", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  catalogPlantId: integer("catalog_plant_id")
    .notNull()
    .references(() => catalogPlantsTable.id, { onDelete: "restrict" }),
  nickname: text("nickname").notNull(),
  location: text("location").notNull(),
  notes: text("notes"),
  healthStatus: text("health_status").notNull().default("healthy"),
  plantedAt: timestamp("planted_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type GardenPlant = typeof gardenPlantsTable.$inferSelect;
export type InsertGardenPlant = typeof gardenPlantsTable.$inferInsert;
