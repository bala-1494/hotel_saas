import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import GenerationForm from "@/components/generation-form";
import LoadingState from "@/components/loading-state";
import GeneratedPage from "@/components/generated-page";
import type { HotelPageData } from "@shared/schema";

type ViewState = 'form' | 'storing-hotel' | 'generating-ai' | 'creating-url' | 'generated';

export default function Home() {
  const [viewState, setViewState] = useState<ViewState>('form');
  const [hotelId, setHotelId] = useState<string | null>(null);
  const [shareableUrl, setShareableUrl] = useState<string | null>(null);
  const [generatedData, setGeneratedData] = useState<HotelPageData | null>(null);
  const { toast } = useToast();

  // STEP 2: Store hotel data from Google Maps URL
  const storeHotelMutation = useMutation({
    mutationFn: api.storeHotelData,
    onMutate: () => {
      setViewState('storing-hotel');
    },
    onSuccess: (data) => {
      console.log('✅ STEP 2: Hotel data stored:', data.hotel_id);
      setHotelId(data.hotel_id);
      // Automatically proceed to STEP 3
      generateAIMutation.mutate({ hotel_id: data.hotel_id });
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

  // STEP 3: Generate AI content from stored DB records
  const generateAIMutation = useMutation({
    mutationFn: api.generateAIContent,
    onMutate: () => {
      setViewState('generating-ai');
    },
    onSuccess: (data) => {
      console.log('✅ STEP 3: AI content generated for hotel:', data.hotel_id);
      // Automatically proceed to STEP 4
      createUrlMutation.mutate({ hotel_id: data.hotel_id });
    },
    onError: (error: any) => {
      console.error('❌ STEP 3 Failed:', error);
      const message = error.message || "Failed to generate AI content. Please try again.";
      toast({
        title: "Step 3 Failed - AI Content Generation",
        description: message,
        variant: "destructive",
      });
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
