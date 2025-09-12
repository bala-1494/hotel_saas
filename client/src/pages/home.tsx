import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import GenerationForm from "@/components/generation-form";
import LoadingState from "@/components/loading-state";
import GeneratedPage from "@/components/generated-page";
import type { HotelPageData } from "@shared/schema";

type ViewState = 'form' | 'fetching' | 'generating' | 'generated';

export default function Home() {
  const [viewState, setViewState] = useState<ViewState>('form');
  const [generatedData, setGeneratedData] = useState<HotelPageData | null>(null);
  const { toast } = useToast();

  const generatePageMutation = useMutation({
    mutationFn: api.generatePage,
    onMutate: () => {
      setViewState('fetching');
    },
    onSuccess: (data) => {
      // Simulate the two-phase loading experience
      setViewState('generating');
      setTimeout(() => {
        setGeneratedData(data);
        setViewState('generated');
      }, 2000);
    },
    onError: (error: any) => {
      console.error('Error generating page:', error);
      const message = error.message || "Failed to generate hotel page. Please try again.";
      toast({
        title: "Generation Failed",
        description: message,
        variant: "destructive",
      });
      setViewState('form');
    },
  });

  const handleGenerateSubmit = (mapsUrl: string) => {
    generatePageMutation.mutate({ mapsUrl });
  };

  const handleGenerateAnother = () => {
    setViewState('form');
    setGeneratedData(null);
    generatePageMutation.reset();
  };

  const renderCurrentView = () => {
    switch (viewState) {
      case 'form':
        return (
          <GenerationForm 
            onSubmit={handleGenerateSubmit}
            isLoading={generatePageMutation.isPending}
          />
        );
      case 'fetching':
        return <LoadingState phase="fetching" />;
      case 'generating':
        return <LoadingState phase="generating" />;
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
