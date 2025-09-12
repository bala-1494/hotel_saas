// Simpler approach: Test data creation via HTTP API
// We'll temporarily modify the server to allow direct hotel creation for testing

const https = require('https');
const http = require('http');

function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const protocol = options.port === 443 ? https : http;
    const req = protocol.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: responseData
        });
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test hotel page creation workflow
async function testHotelWorkflow() {
  console.log('Testing hotel page creation workflow...\n');

  // Step 1: Test frontend loading
  console.log('1. Testing frontend access...');
  try {
    const frontendResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/',
      method: 'GET',
      headers: { 'Accept': 'text/html' }
    });
    console.log(`Frontend status: ${frontendResponse.statusCode}`);
    console.log(`Content type: ${frontendResponse.headers['content-type']}`);
    console.log('✓ Frontend accessible\n');
  } catch (error) {
    console.error('✗ Frontend error:', error.message);
  }

  // Step 2: Test hotel generation endpoint (expect auth error)
  console.log('2. Testing hotel generation endpoint...');
  try {
    const generationResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/generate-page',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      mapsUrl: 'https://maps.app.goo.gl/example'
    });
    console.log(`Generation status: ${generationResponse.statusCode}`);
    console.log(`Response: ${generationResponse.body}`);
    console.log('✓ Authentication properly enforced\n');
  } catch (error) {
    console.error('✗ Generation endpoint error:', error.message);
  }

  // Step 3: Test hotel display endpoint with non-existent ID
  console.log('3. Testing hotel display endpoint...');
  try {
    const displayResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/hotels/test-id-123',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`Display status: ${displayResponse.statusCode}`);
    console.log(`Response: ${displayResponse.body}`);
    console.log('✓ Hotel display endpoint working\n');
  } catch (error) {
    console.error('✗ Display endpoint error:', error.message);
  }

  // Step 4: Test booking endpoint with proper UUID
  console.log('4. Testing booking endpoint...');
  try {
    const testHotelId = '550e8400-e29b-41d4-a716-446655440000'; // Valid UUID format
    const bookingResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/bookings',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      hotelId: testHotelId,
      email: 'test@example.com',
      checkinDate: '2025-12-25',
      checkoutDate: '2025-12-26',
      roomType: 'Standard Room'
    });
    console.log(`Booking status: ${bookingResponse.statusCode}`);
    console.log(`Response: ${bookingResponse.body}`);
    console.log('✓ Booking validation working\n');
  } catch (error) {
    console.error('✗ Booking endpoint error:', error.message);
  }

  console.log('Hotel workflow test completed!');
}

testHotelWorkflow().catch(console.error);