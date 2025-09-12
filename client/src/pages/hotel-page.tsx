import React, { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarCheck, MapPin, Phone, Mail, Globe, Star, Quote, ArrowLeft } from "lucide-react";
import BookingModal from "@/components/booking-modal";
import type { HotelPageData } from "@shared/schema";

export default function HotelPage() {
  const { hotelId } = useParams<{ hotelId: string }>();
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const { data: hotelData, isLoading, error } = useQuery<HotelPageData>({
    queryKey: ['/api/hotels', hotelId],
    queryFn: () => api.getHotelPageData(hotelId!),
    enabled: !!hotelId,
  });

  useEffect(() => {
    if (hotelData?.hotel) {
      // Set page title and meta description for SEO
      document.title = `${hotelData.hotel.name} - ${hotelData.hotel.city || 'Hotel'} | Book Your Stay`;
      
      // Update meta description - create if missing
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.setAttribute('name', 'description');
        document.head.appendChild(metaDescription);
      }
      metaDescription.setAttribute('content', 
        hotelData.hotel.headline || 
        `Experience ${hotelData.hotel.name} - ${hotelData.hotel.description || 'A wonderful hotel experience awaits you.'}`
      );

      // Add Open Graph tags for social sharing
      const ogTitle = document.querySelector('meta[property="og:title"]') || document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      ogTitle.setAttribute('content', `${hotelData.hotel.name} - Book Your Stay`);
      if (!document.querySelector('meta[property="og:title"]')) {
        document.head.appendChild(ogTitle);
      }

      const ogDescription = document.querySelector('meta[property="og:description"]') || document.createElement('meta');
      ogDescription.setAttribute('property', 'og:description');
      ogDescription.setAttribute('content', hotelData.hotel.headline || hotelData.hotel.description || 'A wonderful hotel experience awaits you.');
      if (!document.querySelector('meta[property="og:description"]')) {
        document.head.appendChild(ogDescription);
      }

      // Add additional Open Graph tags
      const ogType = document.querySelector('meta[property="og:type"]') || document.createElement('meta');
      ogType.setAttribute('property', 'og:type');
      ogType.setAttribute('content', 'website');
      if (!document.querySelector('meta[property="og:type"]')) {
        document.head.appendChild(ogType);
      }
      
      const ogUrl = document.querySelector('meta[property="og:url"]') || document.createElement('meta');
      ogUrl.setAttribute('property', 'og:url');
      ogUrl.setAttribute('content', window.location.href);
      if (!document.querySelector('meta[property="og:url"]')) {
        document.head.appendChild(ogUrl);
      }

      if (hotelData.images && hotelData.images.length > 0) {
        const primaryImage = hotelData.images.find(img => img.isPrimary) || hotelData.images[0];
        const ogImage = document.querySelector('meta[property="og:image"]') || document.createElement('meta');
        ogImage.setAttribute('property', 'og:image');
        ogImage.setAttribute('content', primaryImage.imageUrl);
        if (!document.querySelector('meta[property="og:image"]')) {
          document.head.appendChild(ogImage);
        }
      }
    }
  }, [hotelData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Loading Hero Section */}
        <div className="relative w-full h-[60vh] md:h-[70vh] overflow-hidden">
          <Skeleton className="w-full h-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            <div className="max-w-4xl mx-auto">
              <Skeleton className="h-12 w-3/4 mb-4" />
              <Skeleton className="h-6 w-1/2" />
            </div>
          </div>
        </div>

        {/* Loading Content */}
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !hotelData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="mb-6">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-12 h-12 text-gray-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-4">Hotel Not Found</h1>
          <p className="text-muted-foreground mb-6">
            Sorry, we couldn't find the hotel you're looking for. It may have been removed or the link may be incorrect.
          </p>
          <Link href="/">
            <Button 
              variant="outline"
              data-testid="button-go-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { hotel, images, user } = hotelData;
  const primaryImage = images.find(img => img.isPrimary) || images[0];
  const otherImages = images.filter(img => 
    img.id !== primaryImage?.id && !img.isPrimary
  ).slice(0, 5); // Show up to 5 additional images

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative w-full h-[60vh] md:h-[70vh] overflow-hidden">
        {primaryImage && (
          <img
            src={primaryImage.imageUrl}
            alt={primaryImage.altText || hotel.name}
            className="w-full h-full object-cover"
            data-testid="img-hero"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        {/* Hero Content */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          <div className="max-w-4xl mx-auto text-white">
            <div className="flex items-center gap-2 mb-4">
              {hotel.rating && (
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{hotel.rating.toFixed(1)}</span>
                </div>
              )}
              {hotel.category && (
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                  {hotel.category}
                </Badge>
              )}
            </div>
            
            <h1 className="text-3xl md:text-5xl font-bold mb-4" data-testid="text-hotel-name">
              {hotel.name}
            </h1>
            
            {hotel.headline && (
              <p className="text-lg md:text-xl text-white/90 max-w-2xl" data-testid="text-hotel-headline">
                {hotel.headline}
              </p>
            )}
            
            <div className="flex items-center gap-2 mt-4 text-white/80">
              <MapPin className="w-4 h-4" />
              <span data-testid="text-hotel-address">{hotel.address}</span>
            </div>
          </div>
        </div>

        {/* Booking CTA Floating Button */}
        <div className="absolute top-6 right-6">
          <Button 
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
            onClick={() => setIsBookingModalOpen(true)}
            data-testid="button-book-now"
          >
            <CalendarCheck className="w-4 h-4 mr-2" />
            Book Now
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Story Section */}
            {hotel.story && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold mb-4" data-testid="text-story-title">Our Story</h2>
                  <div className="prose prose-gray dark:prose-invert max-w-none">
                    <p className="text-muted-foreground leading-relaxed" data-testid="text-hotel-story">
                      {hotel.story}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Photo Gallery */}
            {images.length > 1 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold mb-4" data-testid="text-gallery-title">Photo Gallery</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {otherImages.map((image, index) => (
                      <div 
                        key={image.id}
                        className="relative aspect-square overflow-hidden rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setSelectedImageIndex(index + 1)}
                        data-testid={`img-gallery-${index}`}
                      >
                        <img
                          src={image.imageUrl}
                          alt={image.altText || `${hotel.name} - Image ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reviews Summary */}
            {hotel.reviewSummary && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Quote className="w-6 h-6 text-primary" />
                    <h2 className="text-2xl font-bold" data-testid="text-reviews-title">What Guests Say</h2>
                  </div>
                  <blockquote className="text-muted-foreground italic leading-relaxed" data-testid="text-review-summary">
                    "{hotel.reviewSummary}"
                  </blockquote>
                </CardContent>
              </Card>
            )}

            {/* Features */}
            {hotel.features && hotel.features.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold mb-4" data-testid="text-features-title">Amenities & Features</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {hotel.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2" data-testid={`text-feature-${index}`}>
                        <div className="w-2 h-2 bg-primary rounded-full" />
                        <span className="text-muted-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Booking & Info */}
          <div className="space-y-6">
            {/* Booking Card */}
            <Card className="sticky top-6">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold mb-2" data-testid="text-booking-title">Ready to Book?</h3>
                  <p className="text-muted-foreground text-sm">
                    Experience luxury and comfort at {hotel.name}
                  </p>
                  {hotel.priceRange && (
                    <div className="mt-3">
                      <span className="text-lg font-semibold text-primary" data-testid="text-price-range">
                        {hotel.priceRange}
                      </span>
                    </div>
                  )}
                </div>
                
                <Button 
                  className="w-full mb-4" 
                  size="lg"
                  onClick={() => setIsBookingModalOpen(true)}
                  data-testid="button-book-sidebar"
                >
                  <CalendarCheck className="w-4 h-4 mr-2" />
                  Book Your Stay
                </Button>

                <div className="text-center">
                  <p className="text-xs text-muted-foreground">
                    Instant confirmation • No booking fees
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-bold mb-4" data-testid="text-contact-title">Contact Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground" data-testid="text-contact-address">
                      {hotel.address}
                    </span>
                  </div>
                  
                  {hotel.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <a 
                        href={`tel:${hotel.phone}`}
                        className="text-sm text-primary hover:underline"
                        data-testid="link-phone"
                      >
                        {hotel.phone}
                      </a>
                    </div>
                  )}
                  
                  {hotel.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <a 
                        href={`mailto:${hotel.email}`}
                        className="text-sm text-primary hover:underline"
                        data-testid="link-email"
                      >
                        {hotel.email}
                      </a>
                    </div>
                  )}
                  
                  {hotel.website && (
                    <div className="flex items-center gap-3">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <a 
                        href={hotel.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                        data-testid="link-website"
                      >
                        Visit Website
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Hosted by */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-bold mb-4" data-testid="text-hosted-title">Hosted by</h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-primary font-semibold">
                      {user.fullName?.charAt(0) || user.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium" data-testid="text-host-name">
                      {user.fullName || user.email}
                    </p>
                    <p className="text-sm text-muted-foreground">Hotel Host</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {isBookingModalOpen && (
        <BookingModal
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          hotelId={hotel.id}
          hotelName={hotel.name}
        />
      )}
    </div>
  );
}