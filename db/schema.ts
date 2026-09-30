import { pgTable, text, bigint } from "drizzle-orm/pg-core";

const ts = (name: string) => bigint(name, { mode: "number" });

export const carts = pgTable("carts", {
  id: text("id").primaryKey(),
  lines: text("lines").notNull().default("[]"),
  updatedAt: ts("updated_at").notNull(),
});
export const subscribers = pgTable("subscribers", {
  email: text("email").primaryKey(),
  createdAt: ts("created_at").notNull(),
});
export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  createdAt: ts("created_at").notNull(),
});
export const checkoutSessions = pgTable("checkout_sessions", {
  id: text("id").primaryKey(),
  cartId: text("cart_id").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: ts("created_at").notNull(),
});
