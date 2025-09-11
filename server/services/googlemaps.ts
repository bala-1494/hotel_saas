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
  private baseUrl = 'https://places.googleapis.com/v1';

  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('Google Maps API key is required');
    }
  }

  async extractPlaceIdFromUrl(url: string): Promise<string | null> {
    try {
      const urlObj = new URL(url);
      const params = new URLSearchParams(urlObj.search);
      
      // Check for direct place_id parameters
      const placeIdParams = [
        'place_id',
        'query_place_id',
        'origin_place_id', 
        'destination_place_id'
      ];
      
      for (const param of placeIdParams) {
        const placeId = params.get(param);
        if (placeId && placeId.startsWith('ChIJ')) {
          return placeId;
        }
      }
      
      // Check for q=place_id: format
      const qParam = params.get('q');
      if (qParam && qParam.startsWith('place_id:')) {
        const placeId = qParam.replace('place_id:', '');
        if (placeId.startsWith('ChIJ')) {
          return placeId;
        }
      }
      
      // Handle URLs with embedded place data - look for ftid parameter
      const ftid = params.get('ftid');
      if (ftid && ftid.startsWith('0x')) {
        // Try to extract place_id from the URL path or other parameters
        const pathMatch = url.match(/\/maps\/place\/[^@]+@[^\/]+\/data=([^!]+)/);
        if (pathMatch) {
          // Look for place_id in the data parameter
          const dataMatch = pathMatch[1].match(/!1s([A-Za-z0-9_-]+)/);
          if (dataMatch && dataMatch[1].startsWith('ChIJ')) {
            return dataMatch[1];
          }
        }
      }
      
      // Fallback: extract place name from URL and use Text Search
      const placeName = this.extractPlaceNameFromUrl(url);
      if (placeName) {
        console.log('No direct place_id found, attempting text search for:', placeName);
        return await this.getPlaceIdFromTextSearch(placeName);
      }
      
      console.log('Could not extract valid place_id or place name from URL:', url);
      return null;
    } catch (error) {
      console.error('Error parsing URL:', error);
      return null;
    }
  }

  extractPlaceNameFromUrl(url: string): string | null {
    try {
      // Extract place name from various Google Maps URL formats
      const patterns = [
        /\/maps\/place\/([^@/?]+)/,  // Standard place URLs
        /\/maps\/search\/([^@/?]+)/, // Search URLs
        /[?&]q=([^&]+)/              // Query parameter
      ];
      
      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
          const placeName = decodeURIComponent(match[1].replace(/\+/g, ' '));
          // Clean up the place name
          return placeName.replace(/[^\w\s,-]/g, ' ').trim();
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting place name:', error);
      return null;
    }
  }

  async getPlaceIdFromTextSearch(placeName: string): Promise<string | null> {
    try {
      const url = `${this.baseUrl}/places:searchText`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName'
        },
        body: JSON.stringify({
          textQuery: placeName,
          maxResultCount: 1
        })
      });

      if (!response.ok) {
        console.error('Text search failed:', response.status, response.statusText);
        return null;
      }

      const data = await response.json();
      if (data.places && data.places.length > 0) {
        const placeId = data.places[0].id;
        console.log('Found place_id via text search:', placeId);
        return placeId;
      }

      return null;
    } catch (error) {
      console.error('Error in text search:', error);
      return null;
    }
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
    // Field mask for new Places API - specify which fields we want
    const fieldMask = [
      'id',
      'displayName',
      'formattedAddress', 
      'nationalPhoneNumber',
      'websiteUri',
      'rating',
      'photos',
      'reviews',
      'location',
      'types'
    ].join(',');

    const url = `${this.baseUrl}/places/${placeId}`;
    console.log('Making Google Maps API (New) request to:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey,
        'X-Goog-FieldMask': fieldMask
      }
    });

    if (!response.ok) {
      console.error('Google Maps API HTTP error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error response body:', errorText);
      
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.status === 'INVALID_ARGUMENT' && errorData.error?.message?.includes('Place ID')) {
          throw new Error('Invalid place ID. Please check that you\'re using a valid Google Maps URL for a hotel.');
        }
      } catch (parseError) {
        // If we can't parse the error, fall back to generic message
      }
      
      throw new Error(`Google Maps API HTTP error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Google Maps API response received successfully');
    
    // Transform new API response to match legacy format for compatibility
    const transformedData: GoogleMapsPlace = {
      place_id: data.id || placeId,
      name: data.displayName?.text || '',
      formatted_address: data.formattedAddress || '',
      formatted_phone_number: data.nationalPhoneNumber || undefined,
      website: data.websiteUri || undefined,
      rating: data.rating || undefined,
      photos: data.photos?.map((photo: any) => ({
        photo_reference: photo.name, // New API uses 'name' field
        width: photo.widthPx || 800,
        height: photo.heightPx || 600
      })) || [],
      reviews: data.reviews?.map((review: any) => ({
        author_name: review.authorAttribution?.displayName || 'Anonymous',
        text: review.text?.text || '',
        rating: review.rating || 0,
        relative_time_description: review.relativePublishTimeDescription || ''
      })) || [],
      geometry: {
        location: {
          lat: data.location?.latitude || 0,
          lng: data.location?.longitude || 0
        }
      },
      types: data.types || []
    };

    return transformedData;
  }

  async getPhotoUrl(photoName: string, maxWidth: number = 800): Promise<string> {
    // New Places API uses a different photo endpoint format
    return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth}&key=${this.apiKey}`;
  }

  async fetchHotelFromUrl(mapsUrl: string) {
    try {
      // If it's a short URL, resolve it first
      let resolvedUrl = mapsUrl;
      if (mapsUrl.includes('maps.app.goo.gl')) {
        resolvedUrl = await this.resolveShortUrl(mapsUrl);
      }

      // Extract place ID
      const placeId = await this.extractPlaceIdFromUrl(resolvedUrl);
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
