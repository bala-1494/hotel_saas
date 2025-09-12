// Test script to create test data and verify endpoints
const http = require('http');

async function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
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

async function testEndpoints() {
  console.log('Testing hotel page generation and display flow...\n');

  // Test 1: Check non-existent hotel
  console.log('1. Testing non-existent hotel endpoint...');
  try {
    const response = await makeRequest('GET', '/api/hotels/test-hotel-123');
    console.log(`Status: ${response.statusCode}`);
    console.log(`Response: ${response.body}\n`);
  } catch (error) {
    console.log(`Error: ${error.message}\n`);
  }

  // Test 2: Test booking endpoint with invalid data
  console.log('2. Testing booking endpoint...');
  try {
    const bookingData = {
      hotelId: 'test-hotel-123',
      email: 'test@example.com',
      checkinDate: '2025-12-25',
      checkoutDate: '2025-12-26',
      roomType: 'Standard Room'
    };
    const response = await makeRequest('POST', '/api/bookings', bookingData);
    console.log(`Status: ${response.statusCode}`);
    console.log(`Response: ${response.body}\n`);
  } catch (error) {
    console.log(`Error: ${error.message}\n`);
  }

  // Test 3: Test hotel generation endpoint (will fail due to auth)
  console.log('3. Testing hotel generation endpoint (expect auth error)...');
  try {
    const generationData = {
      mapsUrl: 'https://maps.app.goo.gl/example'
    };
    const response = await makeRequest('POST', '/api/generate-page', generationData);
    console.log(`Status: ${response.statusCode}`);
    console.log(`Response: ${response.body}\n`);
  } catch (error) {
    console.log(`Error: ${error.message}\n`);
  }

  console.log('Test complete!');
}

testEndpoints().catch(console.error);