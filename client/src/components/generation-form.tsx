import React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Sparkles } from "lucide-react";

interface GenerationFormProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
}

export default function GenerationForm({ onSubmit, isLoading }: GenerationFormProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const validateGoogleMapsUrl = (url: string): boolean => {
    const patterns = [
      /^https:\/\/maps\.app\.goo\.gl\/\w+/,
      /^https:\/\/www\.google\.com\/maps/,
      /^https:\/\/maps\.google\.com/
    ];
    return patterns.some(pattern => pattern.test(url));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedUrl = url.trim();
    
    if (!trimmedUrl || !validateGoogleMapsUrl(trimmedUrl)) {
      setError("Please enter a valid Google Maps URL");
      return;
    }
    
    setError("");
    onSubmit(trimmedUrl);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-primary mb-4">
          <Sparkles className="inline-block mr-3 h-8 w-8" />
          Hotel Page Generator
        </h1>
        <p className="text-lg text-muted-foreground">
          Transform any Google Maps hotel link into a beautiful, AI-powered landing page
        </p>
      </div>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Generate Your Hotel Page</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="maps-url">Google Maps Hotel URL</Label>
              <div className="relative">
                <Input
                  id="maps-url"
                  type="url"
                  placeholder="Paste your Google Maps hotel link here (maps.app.goo.gl/... or full URL)"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className={error ? "border-destructive" : ""}
                  data-testid="input-maps-url"
                />
                <MapPin className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              </div>
              {error && (
                <p className="text-sm text-destructive" data-testid="text-url-error">
                  {error}
                </p>
              )}
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
              data-testid="button-generate"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Hotel Page
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>Supports both short links (maps.app.goo.gl) and full Google Maps URLs</p>
      </div>
    </div>
  );
}
