import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { googleMapsService } from "./services/googlemaps";
import { geminiService } from "./services/gemini";
import { mailgunService } from "./services/mailgun";
import { insertBookingSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Generate hotel page from Google Maps URL
  app.post("/api/generate-page", async (req, res) => {
    try {
      const { mapsUrl } = req.body;
      
      if (!mapsUrl || typeof mapsUrl !== 'string') {
        return res.status(400).json({ 
          message: "Google Maps URL is required" 
        });
      }

      // Validate URL format
      const urlPatterns = [
        /^https:\/\/maps\.app\.goo\.gl\/\w+/,
        /^https:\/\/www\.google\.com\/maps/,
        /^https:\/\/maps\.google\.com/
      ];
      
      const isValidUrl = urlPatterns.some(pattern => pattern.test(mapsUrl));
      if (!isValidUrl) {
        return res.status(400).json({ 
          message: "Invalid Google Maps URL format" 
        });
      }

      // Fetch hotel data from Google Maps
      const hotelData = await googleMapsService.fetchHotelFromUrl(mapsUrl);
      
      // Check if hotel already exists
      let hotel = await storage.getHotelByPlaceId(hotelData.placeId);
      
      if (!hotel) {
        // Create new hotel record
        hotel = await storage.createHotel(hotelData);
      }

      // Check if content already exists
      let content = await storage.getGeneratedContent(hotel.id);
      
      if (!content) {
        // Generate AI content
        const generatedContent = await geminiService.generateHotelContent({
          hotelName: hotel.name,
          address: hotel.address,
          category: hotel.category || 'Hotel',
          rating: hotel.rating || 0,
          reviews: hotel.reviews || [],
        });

        // Save generated content
        content = await storage.createGeneratedContent({
          hotelId: hotel.id,
          headline: generatedContent.headline,
          story: generatedContent.story,
          reviewSummary: generatedContent.reviewSummary,
        });
      }

      res.json({
        hotel,
        content,
      });

    } catch (error) {
      console.error('Error generating hotel page:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to generate hotel page" 
      });
    }
  });

  // Create booking and send confirmation email
  app.post("/api/bookings", async (req, res) => {
    try {
      // Validate booking data
      const validationResult = insertBookingSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid booking data",
          errors: validationResult.error.errors,
        });
      }

      const bookingData = validationResult.data;

      // Validate dates
      const checkinDate = new Date(bookingData.checkinDate);
      const checkoutDate = new Date(bookingData.checkoutDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (checkinDate < today) {
        return res.status(400).json({ 
          message: "Check-in date cannot be in the past" 
        });
      }

      if (checkoutDate <= checkinDate) {
        return res.status(400).json({ 
          message: "Check-out date must be after check-in date" 
        });
      }

      // Get hotel information
      const hotel = await storage.getHotel(bookingData.hotelId);
      if (!hotel) {
        return res.status(404).json({ 
          message: "Hotel not found" 
        });
      }

      // Create booking
      const booking = await storage.createBooking(bookingData);

      // Send confirmation email
      try {
        await mailgunService.sendBookingConfirmation({
          email: booking.email,
          hotelName: hotel.name,
          checkinDate: booking.checkinDate,
          checkoutDate: booking.checkoutDate,
          roomType: booking.roomType,
          hotelAddress: hotel.address,
          hotelPhone: hotel.phone,
          bookingId: booking.id,
        });
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        // Don't fail the booking if email fails
        return res.status(201).json({
          booking,
          emailStatus: 'failed',
          message: 'Booking created successfully, but confirmation email could not be sent',
        });
      }

      res.status(201).json({
        booking,
        emailStatus: 'sent',
        message: 'Booking confirmed successfully',
      });

    } catch (error) {
      console.error('Error creating booking:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to create booking" 
      });
    }
  });

  // Get hotel page data
  app.get("/api/hotels/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      const hotelPageData = await storage.getHotelPageData(id);
      
      if (!hotelPageData) {
        return res.status(404).json({ 
          message: "Hotel not found" 
        });
      }

      res.json(hotelPageData);

    } catch (error) {
      console.error('Error fetching hotel data:', error);
      res.status(500).json({ 
        message: "Failed to fetch hotel data" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
