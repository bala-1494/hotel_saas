import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarCheck, Heart, Quote, MapPin, Phone, Mail, Globe, Compass, Images, Plus, Star } from "lucide-react";
import BookingModal from "./booking-modal";
import type { HotelPageData } from "@shared/schema";

interface GeneratedPageProps {
  data: HotelPageData;
  onGenerateAnother: () => void;
}

export default function GeneratedPage({ data, onGenerateAnother }: GeneratedPageProps) {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const { hotel, content } = data;

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <div className="min-h-screen">
      {/* Floating Book Now Button */}
      <Button
        className="fixed top-5 right-5 z-50 bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-lg"
        onClick={() => setIsBookingModalOpen(true)}
        data-testid="button-book-now"
      >
        <CalendarCheck className="mr-2 h-4 w-4" />
        Book Now
      </Button>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div 
          className="h-96 bg-cover bg-center relative"
          style={{
            backgroundImage: hotel.photos?.[0] 
              ? `url(${hotel.photos[0]})`
              : "url('https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=1080')"
          }}
        >
          <div className="absolute inset-0 bg-black bg-opacity-40" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white px-4">
              <h1 className="text-4xl md:text-6xl font-bold mb-4" data-testid="text-hotel-name">
                {hotel.name}
              </h1>
              <p className="text-xl md:text-2xl mb-6" data-testid="text-hotel-headline">
                {content.headline}
              </p>
              <div className="flex items-center justify-center space-x-6 text-lg flex-wrap gap-4">
                <div className="flex items-center">
                  <div className="flex text-yellow-400 mr-2">
                    {renderStars(hotel.rating || 0)}
                  </div>
                  <span data-testid="text-hotel-rating">{hotel.rating?.toFixed(1) || 'N/A'}</span>
                </div>
                {hotel.category && (
                  <div className="border-l border-white/30 pl-6">
                    <span data-testid="text-hotel-category">{hotel.category}</span>
                  </div>
                )}
                {hotel.yearsInService && (
                  <div className="border-l border-white/30 pl-6">
                    <span data-testid="text-hotel-years">{hotel.yearsInService}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Photo Gallery */}
      {hotel.photos && hotel.photos.length > 0 && (
        <div className="container mx-auto px-4 py-12">
          <h2 className="text-3xl font-bold text-center mb-8 text-foreground">
            <Images className="inline-block mr-3 h-6 w-6 text-primary" />
            Hotel Gallery
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {hotel.photos.slice(0, 8).map((photo, index) => (
              <div 
                key={index}
                className="cursor-pointer rounded-lg overflow-hidden shadow-md hover:scale-105 transition-transform duration-300"
                data-testid={`img-gallery-${index}`}
              >
                <img 
                  src={photo}
                  alt={`Hotel gallery image ${index + 1}`}
                  className="w-full h-32 md:h-48 object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Our Story Section */}
      <div className="bg-muted py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-8 text-foreground">
              <Heart className="inline-block mr-3 h-6 w-6 text-secondary" />
              Our Story
            </h2>
            <Card className="shadow-lg">
              <CardContent className="p-8">
                <div className="prose prose-lg max-w-none text-foreground" data-testid="text-hotel-story">
                  {content.story.split('\n').map((paragraph, index) => (
                    <p key={index} className="mb-6 leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Guest Reviews Section */}
      <div className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8 text-foreground">
            <Quote className="inline-block mr-3 h-6 w-6 text-accent" />
            What Our Guests Say
          </h2>
          
          {/* AI Summary */}
          <div className="max-w-4xl mx-auto mb-12">
            <Card className="bg-accent/10 border-accent/20">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4 text-foreground flex items-center">
                  <div className="w-6 h-6 bg-accent rounded mr-2 flex items-center justify-center">
                    <span className="text-accent-foreground text-sm font-bold">AI</span>
                  </div>
                  Review Summary
                </h3>
                <p className="text-lg text-foreground" data-testid="text-review-summary">
                  {content.reviewSummary}
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Individual Reviews */}
          {hotel.reviews && hotel.reviews.length > 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {hotel.reviews.slice(0, 6).map((review, index) => (
                <Card key={index} className="shadow-lg" data-testid={`card-review-${index}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center mb-4">
                      <div className="flex text-yellow-400 mr-3">
                        {renderStars(review.rating)}
                      </div>
                      <span className="font-semibold text-foreground">{review.author}</span>
                    </div>
                    <p className="text-muted-foreground italic mb-4">
                      "{review.text}"
                    </p>
                    <span className="text-sm text-muted-foreground">{review.date}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Location & Map Section */}
      <div className="bg-muted py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8 text-foreground">
            <MapPin className="inline-block mr-3 h-6 w-6 text-primary" />
            Location & Address
          </h2>
          
          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-8">
            {/* Address Info */}
            <Card className="shadow-lg">
              <CardContent className="p-8">
                <h3 className="text-xl font-semibold mb-6 text-foreground">Get Directions</h3>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <MapPin className="text-primary mt-1 mr-3 h-4 w-4" />
                    <div>
                      <p className="font-medium text-foreground" data-testid="text-hotel-address">
                        {hotel.address}
                      </p>
                      {hotel.city && (
                        <p className="text-muted-foreground" data-testid="text-hotel-city">
                          {hotel.city}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {hotel.phone && (
                    <div className="flex items-center">
                      <Phone className="text-primary mr-3 h-4 w-4" />
                      <p className="text-foreground" data-testid="text-hotel-phone">{hotel.phone}</p>
                    </div>
                  )}
                  
                  {hotel.email && (
                    <div className="flex items-center">
                      <Mail className="text-primary mr-3 h-4 w-4" />
                      <p className="text-foreground" data-testid="text-hotel-email">{hotel.email}</p>
                    </div>
                  )}
                  
                  {hotel.website && (
                    <div className="flex items-center">
                      <Globe className="text-primary mr-3 h-4 w-4" />
                      <a 
                        href={hotel.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                        data-testid="link-hotel-website"
                      >
                        {hotel.website}
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Map Placeholder */}
            <Card className="shadow-lg overflow-hidden">
              <div className="h-full min-h-[400px] bg-gray-200 flex items-center justify-center relative">
                <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
                  <div className="bg-white rounded-lg p-4 shadow-lg text-center">
                    <MapPin className="mx-auto h-8 w-8 text-primary mb-2" />
                    <p className="text-sm font-medium text-foreground">Interactive Map</p>
                    <p className="text-xs text-muted-foreground">
                      {hotel.coordinates ? 
                        `${hotel.coordinates.lat.toFixed(4)}, ${hotel.coordinates.lng.toFixed(4)}` :
                        'Location coordinates'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Generate Another Page Button */}
      <div className="py-12 text-center">
        <Button 
          onClick={onGenerateAnother}
          className="bg-accent hover:bg-accent/90 text-accent-foreground"
          data-testid="button-generate-another"
        >
          <Plus className="mr-2 h-4 w-4" />
          Generate Another Page
        </Button>
      </div>

      {/* Booking Modal */}
      <BookingModal 
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        hotelId={hotel.id}
        hotelName={hotel.name}
      />
    </div>
  );
}
