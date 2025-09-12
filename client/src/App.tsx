import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import Navigation from "@/components/navigation";
import Home from "@/pages/home";
import BookingConfig from "@/pages/booking-config";
import HotelPage from "@/pages/hotel-page";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";

function AppContent() {
  const { user, loading } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Switch>
        {/* Public hotel pages - no authentication required */}
        <Route path="/hotel_id=:hotelId">
          <HotelPage />
        </Route>
        
        {/* Support quoted hotel_id format */}
        <Route path='/hotel_id=":hotelId"'>
          <HotelPage />
        </Route>
        
        {/* Authenticated routes - order matters to prevent shadowing */}
        <Route path="/booking-config">
          {user ? (
            <div>
              <Navigation />
              <BookingConfig />
            </div>
          ) : (
            <Login />
          )}
        </Route>
        
        <Route path="/">
          {user ? (
            <div>
              <Navigation />
              <Home />
            </div>
          ) : (
            <Login />
          )}
        </Route>
        
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
