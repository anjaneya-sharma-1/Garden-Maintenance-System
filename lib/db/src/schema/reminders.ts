import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { gardenPlantsTable } from "./gardenPlants";

export const remindersTable = pgTable("reminders", {
  id: serial("id").primaryKey(),
  gardenPlantId: integer("garden_plant_id")
    .notNull()
    .references(() => gardenPlantsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: text("type").notNull().default("water"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  repeatDays: integer("repeat_days").notNull().default(0),
  notes: text("notes"),
  completed: boolean("completed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Reminder = typeof remindersTable.$inferSelect;
export type InsertReminder = typeof remindersTable.$inferInsert;
