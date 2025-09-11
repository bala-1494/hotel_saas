import { type Hotel, type InsertHotel, type GeneratedContent, type InsertGeneratedContent, type Booking, type InsertBooking, type HotelPageData } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Hotel operations
  getHotel(id: string): Promise<Hotel | undefined>;
  getHotelByPlaceId(placeId: string): Promise<Hotel | undefined>;
  createHotel(hotel: InsertHotel): Promise<Hotel>;
  
  // Generated content operations
  getGeneratedContent(hotelId: string): Promise<GeneratedContent | undefined>;
  createGeneratedContent(content: InsertGeneratedContent): Promise<GeneratedContent>;
  
  // Booking operations
  createBooking(booking: InsertBooking): Promise<Booking>;
  
  // Combined operations
  getHotelPageData(hotelId: string): Promise<HotelPageData | undefined>;
}

export class MemStorage implements IStorage {
  private hotels: Map<string, Hotel>;
  private generatedContent: Map<string, GeneratedContent>;
  private bookings: Map<string, Booking>;

  constructor() {
    this.hotels = new Map();
    this.generatedContent = new Map();
    this.bookings = new Map();
  }

  async getHotel(id: string): Promise<Hotel | undefined> {
    return this.hotels.get(id);
  }

  async getHotelByPlaceId(placeId: string): Promise<Hotel | undefined> {
    return Array.from(this.hotels.values()).find(
      (hotel) => hotel.placeId === placeId,
    );
  }

  async createHotel(insertHotel: InsertHotel): Promise<Hotel> {
    const id = randomUUID();
    const hotel: Hotel = { 
      ...insertHotel,
      id,
      createdAt: new Date(),
      city: insertHotel.city ?? null,
      phone: insertHotel.phone ?? null,
      email: insertHotel.email ?? null,
      website: insertHotel.website ?? null,
      rating: insertHotel.rating ?? null,
      category: insertHotel.category ?? null,
      yearsInService: insertHotel.yearsInService ?? null,
      photos: Array.isArray(insertHotel.photos) ? insertHotel.photos as string[] : [],
      reviews: Array.isArray(insertHotel.reviews) ? insertHotel.reviews as Array<{
        author: string;
        text: string;
        rating: number;
        date: string;
      }> : [],
      coordinates: insertHotel.coordinates ?? null,
    };
    this.hotels.set(id, hotel);
    return hotel;
  }

  async getGeneratedContent(hotelId: string): Promise<GeneratedContent | undefined> {
    return Array.from(this.generatedContent.values()).find(
      (content) => content.hotelId === hotelId,
    );
  }

  async createGeneratedContent(insertContent: InsertGeneratedContent): Promise<GeneratedContent> {
    const id = randomUUID();
    const content: GeneratedContent = { 
      ...insertContent, 
      id,
      createdAt: new Date(),
    };
    this.generatedContent.set(id, content);
    return content;
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const id = randomUUID();
    const booking: Booking = { 
      ...insertBooking, 
      id,
      createdAt: new Date(),
    };
    this.bookings.set(id, booking);
    return booking;
  }

  async getHotelPageData(hotelId: string): Promise<HotelPageData | undefined> {
    const hotel = await this.getHotel(hotelId);
    if (!hotel) return undefined;
    
    const content = await this.getGeneratedContent(hotelId);
    if (!content) return undefined;
    
    return { hotel, content };
  }
}

export const storage = new MemStorage();
