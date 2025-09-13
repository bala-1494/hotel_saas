import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Globe } from "lucide-react";

export default function MySites() {
  const { data: userHotelsData, isLoading, error } = useQuery<{hotels: any[]}>({
    queryKey: ['/api/user/hotels'],
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Loading your sites...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-red-600">Error loading sites</h2>
          <p className="text-muted-foreground">Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  const hotelsWithUrls = userHotelsData?.hotels?.filter((hotel: any) => hotel.shareableUrl) || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h2 className="text-3xl font-bold mb-2 flex items-center gap-2" data-testid="text-sites-title">
          <Globe className="h-8 w-8" />
          My Sites
        </h2>
        <p className="text-muted-foreground">All your generated hotel websites in one place</p>
      </div>

      {hotelsWithUrls.length === 0 ? (
        <div className="text-center py-12">
          <Globe className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-xl font-semibold mb-2">No sites generated yet</p>
          <p className="text-muted-foreground mb-4">Generate your first hotel website to see it here</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {hotelsWithUrls.map((hotel: any) => (
            <Card key={hotel.id} className="shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg" data-testid={`text-site-name-${hotel.id}`}>
                  {hotel.name}
                </CardTitle>
                {hotel.headline && (
                  <p className="text-sm text-muted-foreground mt-2" data-testid={`text-site-headline-${hotel.id}`}>
                    {hotel.headline}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {hotel.address && (
                    <p className="text-sm text-muted-foreground" data-testid={`text-site-address-${hotel.id}`}>
                      {hotel.address}
                    </p>
                  )}
                  <div className="flex justify-between items-center">
                    <div>
                      {hotel.rating && (
                        <p className="text-sm" data-testid={`text-site-rating-${hotel.id}`}>
                          ⭐ {hotel.rating}/5
                        </p>
                      )}
                      {hotel.category && (
                        <p className="text-xs text-muted-foreground" data-testid={`text-site-category-${hotel.id}`}>
                          {hotel.category}
                        </p>
                      )}
                    </div>
                    <Button 
                      onClick={() => window.open(hotel.shareableUrl, '_blank')}
                      variant="default"
                      data-testid={`button-view-site-${hotel.id}`}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View Site
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}