import { 
  type User, 
  type InsertUser,
  type Hotel, 
  type InsertHotel,
  type HotelImage,
  type InsertHotelImage,
  type Booking, 
  type InsertBooking, 
  type HotelPageData,
  type HotelWithImages,
  type UserWithHotel
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined>;
  
  // Hotel operations  
  getHotel(id: string): Promise<Hotel | undefined>;
  getHotelByPlaceId(placeId: string): Promise<Hotel | undefined>;
  getHotelByUserId(userId: string): Promise<Hotel | undefined>;
  getActiveHotelByUserId(userId: string): Promise<Hotel | undefined>;
  createHotel(hotel: InsertHotel): Promise<Hotel>;
  updateHotel(id: string, updates: Partial<InsertHotel>): Promise<Hotel | undefined>;
  deleteHotel(id: string): Promise<boolean>;
  deactivateUserHotels(userId: string): Promise<number>;
  
  // Hotel Images operations
  getHotelImages(hotelId: string): Promise<HotelImage[]>;
  createHotelImage(image: InsertHotelImage): Promise<HotelImage>;
  updateHotelImage(id: string, updates: Partial<InsertHotelImage>): Promise<HotelImage | undefined>;
  deleteHotelImage(id: string): Promise<boolean>;
  setPrimaryImage(hotelId: string, imageId: string): Promise<boolean>;
  
  // Booking operations
  createBooking(booking: InsertBooking): Promise<Booking>;
  getBooking(id: string): Promise<Booking | undefined>;
  getHotelBookings(hotelId: string): Promise<Booking[]>;
  
  // Combined operations
  getHotelPageData(hotelId: string): Promise<HotelPageData | undefined>;
  getHotelWithImages(hotelId: string): Promise<HotelWithImages | undefined>;
  getUserWithHotel(userId: string): Promise<UserWithHotel | undefined>;
  
  // Validation and utilities
  canUserCreateHotel(userId: string): Promise<boolean>;
  hasActiveHotel(userId: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private hotels: Map<string, Hotel>;
  private hotelImages: Map<string, HotelImage>;
  private bookings: Map<string, Booking>;

  constructor() {
    this.users = new Map();
    this.hotels = new Map();
    this.hotelImages = new Map();
    this.bookings = new Map();
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      ...insertUser,
      fullName: insertUser.fullName ?? null,
      avatarUrl: insertUser.avatarUrl ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) return undefined;

    const updatedUser: User = {
      ...existingUser,
      ...updates,
      updatedAt: new Date(),
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Hotel operations
  async getHotel(id: string): Promise<Hotel | undefined> {
    return this.hotels.get(id);
  }

  async getHotelByPlaceId(placeId: string): Promise<Hotel | undefined> {
    return Array.from(this.hotels.values()).find(hotel => hotel.placeId === placeId);
  }

  async getHotelByUserId(userId: string): Promise<Hotel | undefined> {
    return Array.from(this.hotels.values()).find(hotel => hotel.userId === userId);
  }

  async getActiveHotelByUserId(userId: string): Promise<Hotel | undefined> {
    return Array.from(this.hotels.values()).find(hotel => hotel.userId === userId && hotel.isActive);
  }

  async createHotel(insertHotel: InsertHotel): Promise<Hotel> {
    const id = randomUUID();
    const hotel: Hotel = {
      ...insertHotel,
      id,
      description: insertHotel.description ?? null,
      city: insertHotel.city ?? null,
      phone: insertHotel.phone ?? null,
      email: insertHotel.email ?? null,
      website: insertHotel.website ?? null,
      rating: insertHotel.rating ?? null,
      category: insertHotel.category ?? null,
      yearsInService: insertHotel.yearsInService ?? null,
      headline: insertHotel.headline ?? null,
      story: insertHotel.story ?? null,
      reviewSummary: insertHotel.reviewSummary ?? null,
      features: Array.isArray(insertHotel.features) ? insertHotel.features as string[] : [],
      priceRange: insertHotel.priceRange ?? null,
      currency: insertHotel.currency ?? "USD",
      coordinates: insertHotel.coordinates ?? null,
      reviews: Array.isArray(insertHotel.reviews) ? insertHotel.reviews as Array<{author: string; text: string; rating: number; date: string}> : [],
      isActive: insertHotel.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.hotels.set(id, hotel);
    return hotel;
  }

  async deactivateUserHotels(userId: string): Promise<number> {
    const userHotels = Array.from(this.hotels.values()).filter(hotel => hotel.userId === userId && hotel.isActive);
    let deactivatedCount = 0;
    
    for (const hotel of userHotels) {
      const updated = await this.updateHotel(hotel.id, { isActive: false });
      if (updated) {
        deactivatedCount++;
      }
    }
    
    return deactivatedCount;
  }

  async updateHotel(id: string, updates: Partial<InsertHotel>): Promise<Hotel | undefined> {
    const existingHotel = this.hotels.get(id);
    if (!existingHotel) return undefined;

    const updatedHotel: Hotel = {
      ...existingHotel,
      ...updates,
      // Ensure proper array types for features and reviews
      features: updates.features ? (Array.isArray(updates.features) ? updates.features as string[] : []) : existingHotel.features,
      reviews: updates.reviews ? (Array.isArray(updates.reviews) ? updates.reviews as Array<{author: string; text: string; rating: number; date: string}> : []) : existingHotel.reviews,
      updatedAt: new Date(),
    };
    this.hotels.set(id, updatedHotel);
    return updatedHotel;
  }

  async deleteHotel(id: string): Promise<boolean> {
    return this.hotels.delete(id);
  }

  // Hotel Images operations
  async getHotelImages(hotelId: string): Promise<HotelImage[]> {
    return Array.from(this.hotelImages.values())
      .filter(image => image.hotelId === hotelId)
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  }

  async createHotelImage(insertImage: InsertHotelImage): Promise<HotelImage> {
    const id = randomUUID();
    const image: HotelImage = {
      ...insertImage,
      id,
      altText: insertImage.altText ?? null,
      caption: insertImage.caption ?? null,
      isPrimary: insertImage.isPrimary ?? false,
      displayOrder: insertImage.displayOrder ?? 0,
      createdAt: new Date(),
    };
    this.hotelImages.set(id, image);
    return image;
  }

  async updateHotelImage(id: string, updates: Partial<InsertHotelImage>): Promise<HotelImage | undefined> {
    const existingImage = this.hotelImages.get(id);
    if (!existingImage) return undefined;

    const updatedImage: HotelImage = {
      ...existingImage,
      ...updates,
    };
    this.hotelImages.set(id, updatedImage);
    return updatedImage;
  }

  async deleteHotelImage(id: string): Promise<boolean> {
    return this.hotelImages.delete(id);
  }

  async setPrimaryImage(hotelId: string, imageId: string): Promise<boolean> {
    // First, unset all primary flags for this hotel
    const hotelImages = await this.getHotelImages(hotelId);
    for (const image of hotelImages) {
      if (image.isPrimary) {
        await this.updateHotelImage(image.id, { isPrimary: false });
      }
    }

    // Set the specified image as primary
    const targetImage = this.hotelImages.get(imageId);
    if (!targetImage || targetImage.hotelId !== hotelId) return false;

    await this.updateHotelImage(imageId, { isPrimary: true });
    return true;
  }

  // Booking operations
  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const id = randomUUID();
    const booking: Booking = {
      ...insertBooking,
      id,
      guestCount: insertBooking.guestCount ?? 1,
      specialRequests: insertBooking.specialRequests ?? null,
      status: insertBooking.status ?? "confirmed",
      createdAt: new Date(),
    };
    this.bookings.set(id, booking);
    return booking;
  }

  async getBooking(id: string): Promise<Booking | undefined> {
    return this.bookings.get(id);
  }

  async getHotelBookings(hotelId: string): Promise<Booking[]> {
    return Array.from(this.bookings.values())
      .filter(booking => booking.hotelId === hotelId)
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  // Combined operations
  async getHotelPageData(hotelId: string): Promise<HotelPageData | undefined> {
    const hotel = await this.getHotel(hotelId);
    if (!hotel) return undefined;

    const user = await this.getUser(hotel.userId);
    if (!user) return undefined;

    const images = await this.getHotelImages(hotelId);

    return { hotel, images, user };
  }

  async getHotelWithImages(hotelId: string): Promise<HotelWithImages | undefined> {
    const hotel = await this.getHotel(hotelId);
    if (!hotel) return undefined;

    const images = await this.getHotelImages(hotelId);
    return { hotel, images };
  }

  async getUserWithHotel(userId: string): Promise<UserWithHotel | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;

    const hotel = await this.getActiveHotelByUserId(userId);
    return { user, hotel: hotel || null };
  }

  // Validation and utilities
  async canUserCreateHotel(userId: string): Promise<boolean> {
    // Users can always create hotels, but existing active hotels will be deactivated
    return true;
  }

  async hasActiveHotel(userId: string): Promise<boolean> {
    const activeHotel = await this.getActiveHotelByUserId(userId);
    return !!activeHotel;
  }
}

export const storage = new MemStorage();
