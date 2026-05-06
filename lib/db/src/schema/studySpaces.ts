import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { conversations } from "./conversations";

export const studySpacesTable = pgTable("study_spaces", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  materialText: text("material_text"),
  youtubeUrl: text("youtube_url"),
  lastVisitedPage: text("last_visited_page").default("chat"),
  conversationId: integer("conversation_id").references(() => conversations.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type StudySpace = typeof studySpacesTable.$inferSelect;
export type InsertStudySpace = typeof studySpacesTable.$inferInsert;
