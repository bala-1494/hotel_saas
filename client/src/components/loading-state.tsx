import React from "react";
import { Card, CardContent } from "@/components/ui/card";

interface LoadingStateProps {
  phase: 'fetching' | 'generating';
}

export default function LoadingState({ phase }: LoadingStateProps) {
  const getLoadingContent = () => {
    if (phase === 'fetching') {
      return {
        title: "Fetching hotel data from Google Maps...",
        subtitle: "This may take a few moments"
      };
    } else {
      return {
        title: "Generating creative content with Gemini AI...",
        subtitle: "Creating your unique hotel page"
      };
    }
  };

  const { title, subtitle } = getLoadingContent();

  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <Card className="shadow-lg p-12 max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-6" />
          <h3 className="text-xl font-semibold text-foreground mb-2" data-testid="text-loading-title">
            {title}
          </h3>
          <p className="text-muted-foreground" data-testid="text-loading-subtitle">
            {subtitle}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
