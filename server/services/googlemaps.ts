interface GoogleMapsPlace {
  place_id: string;
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  website?: string;
  rating?: number;
  photos?: Array<{
    photo_reference: string;
    width: number;
    height: number;
  }>;
  reviews?: Array<{
    author_name: string;
    text: string;
    rating: number;
    relative_time_description: string;
  }>;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types: string[];
}

interface GoogleMapsResponse {
  result: GoogleMapsPlace;
  status: string;
}

export class GoogleMapsService {
  private apiKey: string;
  private baseUrl = 'https://maps.googleapis.com/maps/api/place';

  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('Google Maps API key is required');
    }
  }

  extractPlaceIdFromUrl(url: string): string | null {
    // Handle different Google Maps URL formats
    const patterns = [
      /maps\.app\.goo\.gl\/([^\/\?]+)/,
      /place\/[^\/]+\/data=.*!3m1!4b1!4m.*!3m.*!1s([^!]+)/,
      /place_id=([^&]+)/,
      /@[\d\.-]+,[\d\.-]+.*data=.*!3m.*!1s([^!]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  async resolveShortUrl(shortUrl: string): Promise<string> {
    try {
      const response = await fetch(shortUrl, { 
        method: 'HEAD',
        redirect: 'follow'
      });
      return response.url;
    } catch (error) {
      console.error('Error resolving short URL:', error);
      return shortUrl;
    }
  }

  async getPlaceDetails(placeId: string): Promise<GoogleMapsPlace> {
    const fields = [
      'place_id',
      'name',
      'formatted_address',
      'formatted_phone_number',
      'website',
      'rating',
      'photos',
      'reviews',
      'geometry/location',
      'types'
    ].join(',');

    const url = `${this.baseUrl}/details/json?place_id=${placeId}&fields=${fields}&key=${this.apiKey}`;
    console.log('Making Google Maps API request to:', url.replace(this.apiKey, 'REDACTED'));

    const response = await fetch(url);
    if (!response.ok) {
      console.error('Google Maps API HTTP error:', response.status, response.statusText);
      throw new Error(`Google Maps API HTTP error: ${response.status} ${response.statusText}`);
    }

    const data: GoogleMapsResponse = await response.json();
    console.log('Google Maps API response status:', data.status);
    
    if (data.status !== 'OK') {
      console.error('Google Maps API error response:', data);
      
      // Provide more specific error messages
      switch (data.status) {
        case 'REQUEST_DENIED':
          throw new Error('Google Maps API access denied. Please check that the Places API is enabled and your API key has the correct permissions.');
        case 'INVALID_REQUEST':
          throw new Error('Invalid request to Google Maps API. Please check the place ID format.');
        case 'OVER_QUERY_LIMIT':
          throw new Error('Google Maps API quota exceeded. Please check your billing settings.');
        case 'ZERO_RESULTS':
          throw new Error('No place found with the provided ID.');
        default:
          throw new Error(`Google Maps API error: ${data.status}`);
      }
    }

    return data.result;
  }

  async getPhotoUrl(photoReference: string, maxWidth: number = 800): Promise<string> {
    return `${this.baseUrl}/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${this.apiKey}`;
  }

  async fetchHotelFromUrl(mapsUrl: string) {
    try {
      // If it's a short URL, resolve it first
      let resolvedUrl = mapsUrl;
      if (mapsUrl.includes('maps.app.goo.gl')) {
        resolvedUrl = await this.resolveShortUrl(mapsUrl);
      }

      // Extract place ID
      const placeId = this.extractPlaceIdFromUrl(resolvedUrl);
      if (!placeId) {
        throw new Error('Could not extract place ID from URL');
      }

      // Fetch place details
      const place = await this.getPlaceDetails(placeId);

      // Process photos
      const photos: string[] = [];
      if (place.photos) {
        for (const photo of place.photos.slice(0, 8)) {
          const photoUrl = await this.getPhotoUrl(photo.photo_reference);
          photos.push(photoUrl);
        }
      }

      // Process reviews
      const reviews = place.reviews?.slice(0, 6).map(review => ({
        author: review.author_name,
        text: review.text,
        rating: review.rating,
        date: review.relative_time_description,
      })) || [];

      // Extract city from address
      const addressParts = place.formatted_address.split(', ');
      const city = addressParts.length > 2 ? addressParts[addressParts.length - 3] : '';

      // Determine category based on types and rating
      let category = 'Hotel';
      if (place.types.includes('luxury_hotel') || (place.rating && place.rating >= 4.5)) {
        category = '5-Star Luxury';
      } else if (place.rating && place.rating >= 4.0) {
        category = '4-Star Premium';
      } else if (place.rating && place.rating >= 3.5) {
        category = '3-Star Standard';
      }

      return {
        placeId: place.place_id,
        name: place.name,
        address: place.formatted_address,
        city,
        phone: place.formatted_phone_number || null,
        email: null, // Not available from Google Maps
        website: place.website || null,
        rating: place.rating || null,
        category,
        yearsInService: null, // Not available from Google Maps
        photos,
        reviews,
        coordinates: {
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
        },
      };
    } catch (error) {
      console.error('Error fetching hotel from Google Maps:', error);
      throw new Error(`Failed to fetch hotel data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const googleMapsService = new GoogleMapsService();
