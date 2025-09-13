import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { googleMapsService } from "./services/googlemaps";
import { geminiService } from "./services/gemini";
import { mailgunService } from "./services/mailgun";
import { insertBookingSchema, insertHotelSchema, insertUserSchema, insertHotelImageSchema } from "@shared/schema";
import { z } from "zod";
import { authenticateUser, rateLimit } from "./middleware/auth";
import { createClient } from '@supabase/supabase-js';

// Create Supabase client for user data retrieval
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function registerRoutes(app: Express): Promise<Server> {
  
  // STEP 1: Create user in database immediately upon OAuth success
  app.post("/api/create-user", async (req, res) => {
    try {
      const { id, email, fullName, avatarUrl } = req.body;
      
      if (!id || !email) {
        return res.status(400).json({ message: "User ID and email are required" });
      }

      // Check if user already exists
      let user = await storage.getUser(id);
      
      if (!user) {
        // Create new user record
        user = await storage.createUser({
          id,
          email,
          fullName: fullName || null,
          avatarUrl: avatarUrl || null,
        });
        console.log(`✅ Created user in database: ${id}`);
      } else {
        console.log(`✅ User already exists in database: ${id}`);
      }

      res.json({ success: true, user });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to create user" 
      });
    }
  });

  // STEP 2: Fetch and store hotel data from Google Maps URL - SECURED with authentication
  app.post("/api/store-hotel-data", authenticateUser, rateLimit(300000, 10), async (req, res) => {
    try {
      const { mapsUrl } = req.body;
      const userId = req.user!.id; // Get userId from authenticated session
      
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

      // Check if user has an active hotel and deactivate it
      const hasActiveHotel = await storage.hasActiveHotel(userId);
      if (hasActiveHotel) {
        console.log(`User ${userId} has existing active hotel(s), deactivating them...`);
        const deactivatedCount = await storage.deactivateUserHotels(userId);
        console.log(`Deactivated ${deactivatedCount} hotels for user ${userId}`);
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

      // STEP 2: User should already exist (created during OAuth)
      console.log(`Fetching user from database: ${userId}`);
      let user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(400).json({ 
          message: "User not found in database. Please sign in again." 
        });
      }
      
      console.log(`✅ User found in database:`, user);

      // STEP 2: Store hotel data in database FIRST (without AI content)
      const hotelCreateData = {
        ...hotelData,
        userId,
        googleMapsUrl: mapsUrl,
        // No AI content yet - will be added in next step
        headline: null,
        story: null,
        reviewSummary: null,
        // Convert null values to undefined for schema compatibility
        email: hotelData.email || undefined,
        website: hotelData.website || undefined,
        rating: hotelData.rating || undefined,
      };

      hotel = await storage.createHotel(hotelCreateData);
      console.log(`✅ Hotel data stored in database:`, hotel.id);

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
        hotel_id: hotel.id,
        hotel,
        images,
        message: hasActiveHotel 
          ? "Previous hotel page deactivated and hotel data stored successfully"
          : "Hotel data stored successfully. Ready for AI generation."
      });

    } catch (error) {
      console.error('Error generating hotel page:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to generate hotel page" 
      });
    }
  });

  // STEP 3: Generate AI content from stored DB records
  app.post("/api/generate-ai-content", authenticateUser, async (req, res) => {
    try {
      const { hotel_id } = req.body;
      const userId = req.user!.id;

      if (!hotel_id) {
        return res.status(400).json({ message: "Hotel ID is required" });
      }

      // Get hotel data from database
      const hotel = await storage.getHotel(hotel_id);
      if (!hotel) {
        return res.status(404).json({ message: "Hotel not found" });
      }

      // Verify user owns this hotel
      if (hotel.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Generate AI content using DB records
      console.log(`✅ Generating AI content from DB records for hotel: ${hotel_id}`);
      const generatedContent = await geminiService.generateHotelContent({
        hotelName: hotel.name,
        address: hotel.address,
        category: hotel.category || 'Hotel',
        rating: hotel.rating || 0,
        reviews: hotel.reviews || [],
      });

      // Update hotel record with AI-generated content and set sitePath if not already set
      const updateData: any = {
        headline: generatedContent.headline,
        story: generatedContent.story,
        reviewSummary: generatedContent.reviewSummary,
      };

      // Automatically set sitePath when AI content is generated (if not already set)
      if (!hotel.sitePath) {
        updateData.sitePath = `/hotel/${hotel_id}`;
        console.log(`✅ Setting sitePath for hotel: ${hotel_id} → ${updateData.sitePath}`);
      }

      const updatedHotel = await storage.updateHotel(hotel_id, updateData);

      console.log(`✅ AI content generated and stored for hotel: ${hotel_id}`);

      // Build the full shareable URL if sitePath is set
      const shareableUrl = updatedHotel?.sitePath 
        ? `${req.protocol}://${req.get('Host')}${updatedHotel.sitePath}`
        : null;

      res.json({
        hotel_id: hotel_id,
        content: generatedContent,
        hotel: updatedHotel,
        shareableUrl: shareableUrl,
        message: "AI content generated successfully from database records"
      });

    } catch (error) {
      console.error('Error generating AI content:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to generate AI content" 
      });
    }
  });

  // STEP 4: Create shareable URL and return unique URL for copying (idempotent)
  app.post("/api/create-shareable-url", authenticateUser, async (req, res) => {
    try {
      const { hotel_id } = req.body;
      const userId = req.user!.id;

      if (!hotel_id) {
        return res.status(400).json({ message: "Hotel ID is required" });
      }

      // Get hotel data from database
      const hotel = await storage.getHotel(hotel_id);
      if (!hotel) {
        return res.status(404).json({ message: "Hotel not found" });
      }

      // Verify user owns this hotel
      if (hotel.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Ensure hotel has AI-generated content
      if (!hotel.headline || !hotel.story) {
        return res.status(400).json({ 
          message: "Hotel must have AI-generated content before creating shareable URL" 
        });
      }

      // If sitePath already exists, return it (idempotent)
      if (hotel.sitePath) {
        const shareableUrl = `${req.protocol}://${req.get('Host')}${hotel.sitePath}`;
        console.log(`✅ Returning existing shareable URL for hotel: ${hotel_id} → ${shareableUrl}`);
        
        res.json({
          hotel_id: hotel_id,
          shareableUrl: shareableUrl,
          hotel: hotel,
          message: "Shareable URL already exists. Copy and share this link!"
        });
        return;
      }

      // Create and persist sitePath
      const sitePath = `/hotel/${hotel_id}`;
      const updatedHotel = await storage.updateHotel(hotel_id, { sitePath });

      if (!updatedHotel) {
        throw new Error("Failed to update hotel with sitePath");
      }

      // Create full shareable URL
      const shareableUrl = `${req.protocol}://${req.get('Host')}${sitePath}`;
      
      console.log(`✅ Shareable URL created and persisted for hotel: ${hotel_id} → ${shareableUrl}`);

      res.json({
        hotel_id: hotel_id,
        shareableUrl: shareableUrl,
        hotel: updatedHotel,
        message: "Shareable URL created successfully. Copy and share this link!"
      });

    } catch (error) {
      console.error('Error creating shareable URL:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to create shareable URL" 
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

  // User management routes - SECURED
  app.post("/api/users", authenticateUser, async (req, res) => {
    try {
      const authenticatedUserId = req.user!.id;
      const validationResult = insertUserSchema.safeParse({
        ...req.body,
        id: authenticatedUserId, // Use authenticated user ID
      });
      
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

  // Get user with their hotel - SECURED
  app.get("/api/users/:id", authenticateUser, async (req, res) => {
    try {
      const { id } = req.params;
      const authenticatedUserId = req.user!.id;
      
      // Users can only access their own data
      if (id !== authenticatedUserId) {
        return res.status(403).json({ 
          message: "Access denied. You can only access your own user data." 
        });
      }
      
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

  // Get user's saved hotels - SECURED
  app.get("/api/user/hotels", authenticateUser, async (req, res) => {
    try {
      const authenticatedUserId = req.user!.id;
      const hotels = await storage.getHotelsByUserId(authenticatedUserId);
      
      // Add full shareableUrl to each hotel that has a sitePath
      const hotelsWithUrls = hotels.map(hotel => ({
        ...hotel,
        shareableUrl: hotel.sitePath 
          ? `${req.protocol}://${req.get('Host')}${hotel.sitePath}`
          : null
      }));
      
      res.json({ 
        hotels: hotelsWithUrls,
        message: `Found ${hotels.length} saved hotels` 
      });

    } catch (error) {
      console.error('Error fetching user hotels:', error);
      res.status(500).json({ 
        message: "Failed to fetch your saved hotels" 
      });
    }
  });

  // Hotel Images management routes - SECURED
  app.post("/api/hotels/:id/images", authenticateUser, async (req, res) => {
    try {
      const { id } = req.params;
      const authenticatedUserId = req.user!.id;
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
      
      // Verify hotel exists and user owns it
      const hotel = await storage.getHotel(id);
      if (!hotel) {
        return res.status(404).json({ 
          message: "Hotel not found" 
        });
      }
      
      if (hotel.userId !== authenticatedUserId) {
        return res.status(403).json({ 
          message: "Access denied. You can only manage your own hotel's images." 
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

  app.put("/api/hotels/:hotelId/images/:imageId/primary", authenticateUser, async (req, res) => {
    try {
      const { hotelId, imageId } = req.params;
      const authenticatedUserId = req.user!.id;
      
      // Verify hotel exists and user owns it
      const hotel = await storage.getHotel(hotelId);
      if (!hotel) {
        return res.status(404).json({ 
          message: "Hotel not found" 
        });
      }
      
      if (hotel.userId !== authenticatedUserId) {
        return res.status(403).json({ 
          message: "Access denied. You can only manage your own hotel's images." 
        });
      }
      
      const success = await storage.setPrimaryImage(hotelId, imageId);
      
      if (!success) {
        return res.status(404).json({ 
          message: "Image not found" 
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

  // Get hotel bookings (for hotel management) - SECURED
  app.get("/api/hotels/:id/bookings", authenticateUser, async (req, res) => {
    try {
      const { id } = req.params;
      const authenticatedUserId = req.user!.id;
      
      // Verify hotel exists and user owns it
      const hotel = await storage.getHotel(id);
      if (!hotel) {
        return res.status(404).json({ 
          message: "Hotel not found" 
        });
      }
      
      if (hotel.userId !== authenticatedUserId) {
        return res.status(403).json({ 
          message: "Access denied. You can only view bookings for your own hotel." 
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
