import { apiRequest } from "./queryClient";
import type { HotelPageData, Booking } from "@shared/schema";

export interface GeneratePageRequest {
  mapsUrl: string;
}

export interface CreateBookingRequest {
  hotelId: string;
  email: string;
  checkinDate: string;
  checkoutDate: string;
  roomType: string;
}

export interface CreateBookingResponse {
  booking: Booking;
  emailStatus: 'sent' | 'failed';
  message: string;
}

export interface StoreHotelDataRequest {
  mapsUrl: string;
}

export interface StoreHotelDataResponse {
  hotel_id: string;
  hotel: any;
  images: any[];
  message: string;
}

export interface GenerateAIContentRequest {
  hotel_id: string;
}

export interface GenerateAIContentResponse {
  hotel_id: string;
  content: any;
  hotel: any;
  message: string;
}

export interface CreateShareableUrlRequest {
  hotel_id: string;
}

export interface CreateShareableUrlResponse {
  hotel_id: string;
  shareableUrl: string;
  hotel: any;
  message: string;
}

export const api = {
  // STEP 2: Store hotel data from Google Maps URL
  async storeHotelData(data: StoreHotelDataRequest): Promise<StoreHotelDataResponse> {
    const response = await apiRequest('POST', '/api/store-hotel-data', data);
    return response.json();
  },

  // STEP 3: Generate AI content from stored DB records
  async generateAIContent(data: GenerateAIContentRequest): Promise<GenerateAIContentResponse> {
    const response = await apiRequest('POST', '/api/generate-ai-content', data);
    return response.json();
  },

  // STEP 4: Create shareable URL and return for copying
  async createShareableUrl(data: CreateShareableUrlRequest): Promise<CreateShareableUrlResponse> {
    const response = await apiRequest('POST', '/api/create-shareable-url', data);
    return response.json();
  },

  // Legacy single-step endpoint (for backward compatibility during transition)
  async generatePage(data: GeneratePageRequest): Promise<HotelPageData> {
    const response = await apiRequest('POST', '/api/generate-page', data);
    return response.json();
  },

  async createBooking(data: CreateBookingRequest): Promise<CreateBookingResponse> {
    const response = await apiRequest('POST', '/api/bookings', data);
    return response.json();
  },

  async getHotelPageData(hotelId: string): Promise<HotelPageData> {
    const response = await apiRequest('GET', `/api/hotels/${hotelId}`);
    return response.json();
  },
};
