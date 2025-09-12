// Script to manually add test data to memory storage for testing
// Since we don't have authentication working, we'll bypass the generation endpoint
// and directly test hotel page display and booking functionality

import { storage } from './server/storage.js';
import { randomUUID } from 'crypto';

async function createTestData() {
  console.log('Creating test data for hotel page display and booking tests...\n');

  // Create a test user first
  const testUserId = randomUUID();
  const testUser = await storage.createUser({
    id: testUserId,
    email: 'test@example.com',
    fullName: 'Test User',
    avatarUrl: 'https://via.placeholder.com/150'
  });
  console.log('✓ Created test user:', testUser.id);

  // Create a test hotel with realistic data
  const testHotelId = randomUUID();
  const testHotel = await storage.createHotel({
    userId: testUserId,
    placeId: 'ChIJD3uTd9hx5kcR1IQvGfr8dbk',
    googleMapsUrl: 'https://maps.app.goo.gl/test123',
    name: 'The Grand Plaza Hotel',
    description: 'A luxury hotel in the heart of the city',
    address: '123 Main Street, New York, NY 10001, USA',
    city: 'New York',
    phone: '+1 (555) 123-4567',
    email: 'info@grandplaza.com',
    website: 'https://grandplaza.com',
    rating: 4.5,
    category: 'Luxury Hotel',
    yearsInService: '15 years',
    headline: 'Experience Luxury in the Heart of Manhattan',
    story: 'The Grand Plaza Hotel has been a beacon of luxury and elegance in Manhattan for over 15 years. Our commitment to exceptional service and attention to detail has made us a favorite among discerning travelers from around the world. Each room is thoughtfully designed with modern amenities while maintaining the classic charm that defines our brand.',
    reviewSummary: 'Guests consistently praise our impeccable service, prime location, and stunning city views. Many highlight our rooftop restaurant and the warmth of our staff as standout features.',
    features: [
      'Rooftop Restaurant with City Views',
      'State-of-the-art Fitness Center',
      '24/7 Concierge Service',
      'Business Center',
      'Complimentary Wi-Fi',
      'Valet Parking',
      'Pet-Friendly',
      'Spa and Wellness Center'
    ],
    priceRange: '$200-400 per night',
    currency: 'USD',
    coordinates: { lat: 40.7589, lng: -73.9851 },
    reviews: [
      {
        author: 'Sarah Johnson',
        text: 'Absolutely wonderful stay! The staff was incredibly helpful and the room was spotless.',
        rating: 5,
        date: '2024-11-15'
      },
      {
        author: 'Michael Chen',
        text: 'Great location and fantastic amenities. The rooftop restaurant is a must-visit.',
        rating: 4,
        date: '2024-11-10'
      }
    ]
  });
  console.log('✓ Created test hotel:', testHotel.id);

  // Create test images for the hotel
  const imageUrls = [
    'https://images.unsplash.com/photo-1564501049412-61c2a3083791?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1571896349842-33c89424de2d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80'
  ];

  for (let i = 0; i < imageUrls.length; i++) {
    const image = await storage.createHotelImage({
      hotelId: testHotel.id,
      imageUrl: imageUrls[i],
      altText: `The Grand Plaza Hotel - Image ${i + 1}`,
      isPrimary: i === 0,
      displayOrder: i
    });
    console.log(`✓ Created test image ${i + 1}:`, image.id);
  }

  // Create a test booking
  const testBooking = await storage.createBooking({
    hotelId: testHotel.id,
    email: 'guest@example.com',
    checkinDate: '2025-12-25',
    checkoutDate: '2025-12-26',
    roomType: 'Deluxe King Room',
    guestCount: 2,
    specialRequests: 'Late check-in requested'
  });
  console.log('✓ Created test booking:', testBooking.id);

  console.log('\n=== TEST DATA SUMMARY ===');
  console.log(`User ID: ${testUser.id}`);
  console.log(`Hotel ID: ${testHotel.id}`);
  console.log(`Booking ID: ${testBooking.id}`);
  console.log(`\nTest URLs to try:`);
  console.log(`- Hotel page: http://localhost:5000/hotel_id=${testHotel.id}`);
  console.log(`- Hotel page (quoted): http://localhost:5000/hotel_id="${testHotel.id}"`);
  
  return {
    user: testUser,
    hotel: testHotel,
    booking: testBooking
  };
}

// Execute the test data creation
createTestData()
  .then(() => {
    console.log('\n✅ Test data creation completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error creating test data:', error);
    process.exit(1);
  });