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

export const api = {
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
