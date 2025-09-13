import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import GenerationForm from "@/components/generation-form";
import LoadingState from "@/components/loading-state";
import GeneratedPage from "@/components/generated-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HotelPageData } from "@shared/schema";

type ViewState = 'form' | 'storing-hotel' | 'hotels-list' | 'generating-ai' | 'creating-url' | 'generated';

export default function Home() {
  const [viewState, setViewState] = useState<ViewState>('form');
  const [hotelId, setHotelId] = useState<string | null>(null);
  const [shareableUrl, setShareableUrl] = useState<string | null>(null);
  const [generatedData, setGeneratedData] = useState<HotelPageData | null>(null);
  const { toast } = useToast();

  // Query to get user's saved hotels
  const { data: userHotelsData, refetch: refetchHotels } = useQuery<{ hotels: any[], message: string }>({
    queryKey: ['/api/user/hotels'],
    enabled: viewState === 'hotels-list', // Only fetch when viewing hotels list
  });

  // STEP 2: Store hotel data from Google Maps URL
  const storeHotelMutation = useMutation({
    mutationFn: api.storeHotelData,
    onMutate: () => {
      setViewState('storing-hotel');
    },
    onSuccess: (data) => {
      console.log('✅ STEP 2: Hotel data stored:', data.hotel_id);
      setHotelId(data.hotel_id);
      toast({
        title: "✅ Hotel Saved!",
        description: "Hotel data stored successfully. You can now generate a page for it.",
        variant: "default",
      });
      // Switch to hotels list view instead of auto-proceeding
      setViewState('hotels-list');
      refetchHotels(); // Refresh the hotels list
    },
    onError: (error: any) => {
      console.error('❌ STEP 2 Failed:', error);
      const message = error.message || "Failed to store hotel data. Please try again.";
      toast({
        title: "Step 2 Failed - Hotel Data Storage",
        description: message,
        variant: "destructive",
      });
      setViewState('form');
    },
  });

  // STEP 3: Generate AI content from stored DB records (ONLY - no auto Step 4)
  const generateAIMutation = useMutation({
    mutationFn: api.generateAIContent,
    onMutate: () => {
      setViewState('generating-ai');
    },
    onSuccess: (data) => {
      console.log('✅ STEP 3: AI content generated for hotel:', data.hotel_id);
      toast({
        title: "✅ AI Content Generated!",
        description: "Marketing content created successfully. You can now create a shareable URL.",
        variant: "default",
      });
      // Return to hotels list instead of auto-proceeding to Step 4
      setViewState('hotels-list');
      refetchHotels(); // Refresh to show updated hotel data
    },
    onError: (error: any) => {
      console.error('❌ STEP 3 Failed:', error);
      
      // Check if it's a Google AI overload error
      const isAIOverloaded = error.message?.includes('overloaded') || 
                            error.message?.includes('503') ||
                            error.message?.includes('UNAVAILABLE');
      
      if (isAIOverloaded) {
        toast({
          title: "⏳ Google AI Temporarily Overloaded",
          description: "Google's AI is experiencing high traffic. Please try again in a few minutes!",
          variant: "destructive",
        });
      } else {
        const message = error.message || "Failed to generate AI content. Please try again.";
        toast({
          title: "Step 3 Failed - AI Content Generation",
          description: message,
          variant: "destructive",
        });
      }
      setViewState('form');
    },
  });

  // STEP 4: Create shareable URL and return unique URL for copying
  const createUrlMutation = useMutation({
    mutationFn: api.createShareableUrl,
    onMutate: () => {
      setViewState('creating-url');
    },
    onSuccess: (data) => {
      console.log('✅ STEP 4: Shareable URL created:', data.shareableUrl);
      setShareableUrl(data.shareableUrl);
      
      // Convert to the format expected by GeneratedPage component
      const hotelPageData: HotelPageData = {
        hotel: data.hotel,
        images: [], // Will be populated from API if needed
        user: {} as any, // Will be populated if needed
      };
      
      // Store shareableUrl separately for display
      (hotelPageData as any).shareableUrl = data.shareableUrl;
      
      setGeneratedData(hotelPageData);
      setViewState('generated');
      
      toast({
        title: "🎉 Hotel Page Generated Successfully!",
        description: "Your unique URL is ready to share!",
        variant: "default",
      });
    },
    onError: (error: any) => {
      console.error('❌ STEP 4 Failed:', error);
      const message = error.message || "Failed to create shareable URL. Please try again.";
      toast({
        title: "Step 4 Failed - URL Creation",
        description: message,
        variant: "destructive",
      });
      setViewState('form');
    },
  });

  const handleGenerateSubmit = (mapsUrl: string) => {
    console.log('🚀 Starting step-by-step hotel page generation...');
    console.log('📍 STEP 1: User already saved to database (automatic on OAuth)');
    console.log('📡 STEP 2: Starting - Store hotel data from Maps URL');
    storeHotelMutation.mutate({ mapsUrl });
  };

  const handleGenerateAnother = () => {
    setViewState('form');
    setHotelId(null);
    setShareableUrl(null);
    setGeneratedData(null);
    storeHotelMutation.reset();
    generateAIMutation.reset();
    createUrlMutation.reset();
  };

  const handleGeneratePageForHotel = (hotel_id: string) => {
    console.log('🎯 Starting AI generation for existing hotel:', hotel_id);
    setHotelId(hotel_id);
    generateAIMutation.mutate({ hotel_id });
  };

  const renderHotelsList = () => {
    if (!userHotelsData) {
      return (
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Loading your hotels...</h2>
          </div>
        </div>
      );
    }

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-2" data-testid="text-hotels-title">Your Saved Hotels</h2>
          <p className="text-muted-foreground">Choose a hotel to generate its marketing page</p>
          <Button 
            onClick={() => setViewState('form')} 
            variant="outline" 
            className="mt-4"
            data-testid="button-add-hotel"
          >
            + Add Another Hotel
          </Button>
        </div>

        {userHotelsData.hotels.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No hotels saved yet</p>
            <Button onClick={() => setViewState('form')} data-testid="button-add-first-hotel">
              Add Your First Hotel
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {userHotelsData.hotels.map((hotel: any) => (
              <Card key={hotel.id} className="shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg" data-testid={`text-hotel-name-${hotel.id}`}>
                    {hotel.name}
                  </CardTitle>
                  {hotel.address && (
                    <p className="text-sm text-muted-foreground" data-testid={`text-hotel-address-${hotel.id}`}>
                      {hotel.address}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div>
                      {hotel.rating && (
                        <p className="text-sm" data-testid={`text-hotel-rating-${hotel.id}`}>
                          ⭐ {hotel.rating}/5
                        </p>
                      )}
                      {hotel.category && (
                        <p className="text-xs text-muted-foreground" data-testid={`text-hotel-category-${hotel.id}`}>
                          {hotel.category}
                        </p>
                      )}
                    </div>
                    {hotel.shareableUrl ? (
                      <Button 
                        onClick={() => window.open(hotel.shareableUrl, '_blank')}
                        variant="default"
                        data-testid={`button-view-site-${hotel.id}`}
                      >
                        View Site
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => handleGeneratePageForHotel(hotel.id)}
                        disabled={generateAIMutation.isPending || createUrlMutation.isPending}
                        data-testid={`button-generate-page-${hotel.id}`}
                      >
                        {generateAIMutation.isPending || createUrlMutation.isPending ? 'Generating...' : 'Generate Page'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderCurrentView = () => {
    const isLoading = storeHotelMutation.isPending || generateAIMutation.isPending || createUrlMutation.isPending;
    
    switch (viewState) {
      case 'form':
        return (
          <GenerationForm 
            onSubmit={handleGenerateSubmit}
            isLoading={isLoading}
          />
        );
      case 'storing-hotel':
        return (
          <LoadingState 
            phase="fetching" 
            customMessage="Step 2: Storing hotel data from Google Maps..." 
          />
        );
      case 'hotels-list':
        return renderHotelsList();
      case 'generating-ai':
        return (
          <LoadingState 
            phase="generating" 
            customMessage="Step 3: Generating AI content from database records..." 
          />
        );
      case 'creating-url':
        return (
          <LoadingState 
            phase="generating" 
            customMessage="Step 4: Creating unique shareable URL..." 
          />
        );
      case 'generated':
        return generatedData ? (
          <GeneratedPage 
            data={generatedData}
            onGenerateAnother={handleGenerateAnother}
          />
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div>
      {renderCurrentView()}
    </div>
  );
}
