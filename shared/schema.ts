import { pgTable, text, serial, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define the Bay status enum
export const bayStatusEnum = pgEnum('bay_status', ['free', 'occupied', 'pending']);

// Define the Request status enum
export const requestStatusEnum = pgEnum('request_status', ['pending', 'approved', 'denied']);

// Bay table to represent airport parking bays
export const bays = pgTable("bays", {
  id: serial("id").primaryKey(),
  bayNumber: integer("bay_number").notNull().unique(),
  status: bayStatusEnum("status").notNull().default('free'),
  currentFlight: text("current_flight"),
});

// Request table for bay allocation requests
export const requests = pgTable("requests", {
  id: serial("id").primaryKey(),
  flightCallsign: text("flight_callsign").notNull(),
  requestedBayId: integer("requested_bay_id").notNull(),
  suggestedBayId: integer("suggested_bay_id"),
  status: requestStatusEnum("status").notNull().default('pending'),
  notes: text("notes"),
  responseNotes: text("response_notes"),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  respondedAt: timestamp("responded_at"),
  userId: text("user_id").notNull(),
});

// User table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(), // 'atc' or 'stakeholder'
  displayName: text("display_name").notNull(),
});

// Zod schemas for insertion
export const insertBaySchema = createInsertSchema(bays).omit({ id: true });
export const insertRequestSchema = createInsertSchema(requests).omit({ id: true, requestedAt: true, respondedAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true });

// Type definitions based on the schemas
export type Bay = typeof bays.$inferSelect;
export type InsertBay = z.infer<typeof insertBaySchema>;

export type Request = typeof requests.$inferSelect;
export type InsertRequest = z.infer<typeof insertRequestSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Additional custom types for socket messages
export type BayUpdate = Bay;
export type RequestUpdate = Request & { bayNumber?: number };

export type WebSocketMessage = {
  type: 'BAY_UPDATE' | 'REQUEST_UPDATE' | 'NEW_REQUEST' | 'REQUEST_RESPONSE' | 'REQUEST_ALTERNATIVE';
  payload: BayUpdate | RequestUpdate;
};
