import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { googleMapsService } from "./services/googlemaps";
import { geminiService } from "./services/gemini";
import { mailgunService } from "./services/mailgun";
import { insertBookingSchema, insertHotelSchema, insertUserSchema, insertHotelImageSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Generate hotel page from Google Maps URL
  app.post("/api/generate-page", async (req, res) => {
    try {
      const { mapsUrl, userId } = req.body;
      
      if (!mapsUrl || typeof mapsUrl !== 'string') {
        return res.status(400).json({ 
          message: "Google Maps URL is required" 
        });
      }

      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ 
          message: "User ID is required" 
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

      // Check if user can create a hotel (one per user constraint)
      const canCreateHotel = await storage.canUserCreateHotel(userId);
      if (!canCreateHotel) {
        const existingHotel = await storage.getHotelByUserId(userId);
        if (existingHotel) {
          return res.json({
            hotel: existingHotel,
            images: await storage.getHotelImages(existingHotel.id),
            message: "User already has a hotel page"
          });
        }
      }

      // Fetch hotel data from Google Maps
      const hotelData = await googleMapsService.fetchHotelFromUrl(mapsUrl);
      
      // Check if hotel already exists by place ID
      let hotel = await storage.getHotelByPlaceId(hotelData.placeId);
      
      if (hotel) {
        return res.status(409).json({ 
          message: "A hotel page already exists for this location",
          existingHotel: hotel
        });
      }

      // Generate AI content for the new hotel
      const generatedContent = await geminiService.generateHotelContent({
        hotelName: hotelData.name,
        address: hotelData.address,
        category: hotelData.category || 'Hotel',
        rating: hotelData.rating || 0,
        reviews: hotelData.reviews || [],
      });

      // Create new hotel record with AI-generated content
      const hotelCreateData = {
        ...hotelData,
        userId,
        googleMapsUrl: mapsUrl,
        headline: generatedContent.headline,
        story: generatedContent.story,
        reviewSummary: generatedContent.reviewSummary,
        // Convert null values to undefined for schema compatibility
        email: hotelData.email || undefined,
        website: hotelData.website || undefined,
        rating: hotelData.rating || undefined,
      };

      hotel = await storage.createHotel(hotelCreateData);

      // Create hotel images from the photos data
      const images = [];
      if (hotelData.photos && Array.isArray(hotelData.photos)) {
        for (let i = 0; i < hotelData.photos.length; i++) {
          const photo = hotelData.photos[i];
          const image = await storage.createHotelImage({
            hotelId: hotel.id,
            imageUrl: photo,
            isPrimary: i === 0, // First image is primary
            displayOrder: i,
          });
          images.push(image);
        }
      }

      res.json({
        hotel,
        images,
        message: "Hotel page generated successfully"
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

      // Send confirmation email (only if Mailgun is configured)
      let emailStatus = 'skipped';
      let responseMessage = 'Booking confirmed successfully';
      
      if (mailgunService.isConfigured()) {
        try {
          await mailgunService.sendBookingConfirmation({
            email: booking.email,
            hotelName: hotel.name,
            checkinDate: booking.checkinDate,
            checkoutDate: booking.checkoutDate,
            roomType: booking.roomType,
            hotelAddress: hotel.address,
            hotelPhone: hotel.phone || undefined,
            bookingId: booking.id,
          });
          emailStatus = 'sent';
        } catch (emailError) {
          console.error('Email sending failed:', emailError);
          emailStatus = 'failed';
          responseMessage = 'Booking created successfully, but confirmation email could not be sent';
        }
      } else {
        console.warn('Mailgun not configured - skipping email');
        responseMessage = 'Booking confirmed successfully (email service not configured)';
      }

      res.status(201).json({
        booking,
        emailStatus,
        message: responseMessage,
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

  // User management routes
  app.post("/api/users", async (req, res) => {
    try {
      const validationResult = insertUserSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid user data",
          errors: validationResult.error.errors,
        });
      }

      const userData = validationResult.data;
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(409).json({ 
          message: "User with this email already exists" 
        });
      }

      const user = await storage.createUser(userData);
      res.status(201).json(user);

    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to create user" 
      });
    }
  });

  // Get user with their hotel
  app.get("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const userWithHotel = await storage.getUserWithHotel(id);
      
      if (!userWithHotel) {
        return res.status(404).json({ 
          message: "User not found" 
        });
      }

      res.json(userWithHotel);

    } catch (error) {
      console.error('Error fetching user data:', error);
      res.status(500).json({ 
        message: "Failed to fetch user data" 
      });
    }
  });

  // Hotel Images management routes
  app.post("/api/hotels/:id/images", async (req, res) => {
    try {
      const { id } = req.params;
      const validationResult = insertHotelImageSchema.safeParse({
        ...req.body,
        hotelId: id,
      });
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid image data",
          errors: validationResult.error.errors,
        });
      }

      const imageData = validationResult.data;
      
      // Verify hotel exists
      const hotel = await storage.getHotel(id);
      if (!hotel) {
        return res.status(404).json({ 
          message: "Hotel not found" 
        });
      }

      const image = await storage.createHotelImage(imageData);
      res.status(201).json(image);

    } catch (error) {
      console.error('Error creating hotel image:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to create hotel image" 
      });
    }
  });

  app.get("/api/hotels/:id/images", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verify hotel exists
      const hotel = await storage.getHotel(id);
      if (!hotel) {
        return res.status(404).json({ 
          message: "Hotel not found" 
        });
      }

      const images = await storage.getHotelImages(id);
      res.json(images);

    } catch (error) {
      console.error('Error fetching hotel images:', error);
      res.status(500).json({ 
        message: "Failed to fetch hotel images" 
      });
    }
  });

  app.put("/api/hotels/:hotelId/images/:imageId/primary", async (req, res) => {
    try {
      const { hotelId, imageId } = req.params;
      
      const success = await storage.setPrimaryImage(hotelId, imageId);
      
      if (!success) {
        return res.status(404).json({ 
          message: "Hotel or image not found" 
        });
      }

      res.json({ message: "Primary image updated successfully" });

    } catch (error) {
      console.error('Error setting primary image:', error);
      res.status(500).json({ 
        message: "Failed to set primary image" 
      });
    }
  });

  // Get hotel bookings (for hotel management)
  app.get("/api/hotels/:id/bookings", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verify hotel exists
      const hotel = await storage.getHotel(id);
      if (!hotel) {
        return res.status(404).json({ 
          message: "Hotel not found" 
        });
      }

      const bookings = await storage.getHotelBookings(id);
      res.json(bookings);

    } catch (error) {
      console.error('Error fetching hotel bookings:', error);
      res.status(500).json({ 
        message: "Failed to fetch hotel bookings" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
