import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp, real, integer, boolean, uuid, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - Store Supabase user information
export const users = pgTable("users", {
  id: uuid("id").primaryKey(), // Supabase auth user ID
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Hotels table - Consolidated with AI-generated content
export const hotels = pgTable("hotels", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  
  // Google Maps data
  placeId: text("place_id").notNull().unique(),
  googleMapsUrl: text("google_maps_url").notNull(),
  
  // Basic hotel information
  name: text("name").notNull(),
  description: text("description"),
  address: text("address").notNull(),
  city: text("city"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  rating: real("rating"),
  category: text("category"),
  yearsInService: text("years_in_service"),
  
  // AI-generated content (previously in separate table)
  headline: text("headline"),
  story: text("story"),
  reviewSummary: text("review_summary"),
  features: jsonb("features").$type<string[]>().default([]),
  
  // Pricing information
  priceRange: text("price_range"), // e.g., "$100-200 per night"
  currency: text("currency").default("USD"),
  
  // Location data
  coordinates: jsonb("coordinates").$type<{
    lat: number;
    lng: number;
  }>(),
  
  // Reviews from Google Maps
  reviews: jsonb("reviews").$type<Array<{
    author: string;
    text: string;
    rating: number;
    date: string;
  }>>().default([]),
  
  // URL for shareable page
  sitePath: text("site_path").unique(),
  
  // Status and metadata
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Hotel Images table - Store hotel photos
export const hotelImages = pgTable("hotel_images", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  hotelId: uuid("hotel_id").references(() => hotels.id).notNull(),
  
  // Image data
  imageUrl: text("image_url").notNull(),
  altText: text("alt_text"),
  caption: text("caption"),
  
  // Display settings
  isPrimary: boolean("is_primary").default(false),
  displayOrder: integer("display_order").default(0),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
});

// Bookings table - Updated for new schema
export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  hotelId: uuid("hotel_id").references(() => hotels.id).notNull(),
  
  // Booking details
  email: text("email").notNull(),
  checkinDate: text("checkin_date").notNull(),
  checkoutDate: text("checkout_date").notNull(),
  roomType: text("room_type").notNull(),
  
  // Guest information
  guestCount: integer("guest_count").default(1),
  specialRequests: text("special_requests"),
  
  // Booking status
  status: text("status").default("confirmed"), // confirmed, cancelled, completed
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas with validation
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
}).extend({
  email: z.string().email("Invalid email address"),
});

export const insertHotelSchema = createInsertSchema(hotels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  googleMapsUrl: z.string().url("Invalid Google Maps URL"),
  name: z.string().min(1, "Hotel name is required"),
  address: z.string().min(1, "Hotel address is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  website: z.string().url("Invalid website URL").optional().or(z.literal("")),
  rating: z.number().min(0).max(5).optional(),
});

export const insertHotelImageSchema = createInsertSchema(hotelImages).omit({
  id: true,
  createdAt: true,
}).extend({
  imageUrl: z.string().url("Invalid image URL"),
  displayOrder: z.number().min(0).optional(),
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
}).extend({
  checkinDate: z.string().min(1, "Check-in date is required"),
  checkoutDate: z.string().min(1, "Check-out date is required"),
  email: z.string().email("Invalid email address"),
  roomType: z.string().min(1, "Room type is required"),
  guestCount: z.number().min(1, "At least 1 guest is required").optional(),
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Hotel = typeof hotels.$inferSelect;
export type InsertHotel = z.infer<typeof insertHotelSchema>;

export type HotelImage = typeof hotelImages.$inferSelect;
export type InsertHotelImage = z.infer<typeof insertHotelImageSchema>;

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;

// Combined data interfaces
export interface HotelWithImages {
  hotel: Hotel;
  images: HotelImage[];
}

export interface HotelPageData {
  hotel: Hotel;
  images: HotelImage[];
  user: User;
}

export interface UserWithHotel {
  user: User;
  hotel: Hotel | null;
}
