import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarCheck, X, Check } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  hotelId: string;
  hotelName: string;
}

export default function BookingModal({ isOpen, onClose, hotelId, hotelName }: BookingModalProps) {
  const [checkinDate, setCheckinDate] = useState("");
  const [checkoutDate, setCheckoutDate] = useState("");
  const [roomType, setRoomType] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const { toast } = useToast();

  const bookingMutation = useMutation({
    mutationFn: api.createBooking,
    onSuccess: (data) => {
      toast({
        title: "Booking Confirmed!",
        description: data.emailStatus === 'sent' 
          ? "Check your email for confirmation details."
          : "Booking created, but confirmation email failed to send.",
      });
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      const message = error.message || "Failed to create booking";
      setError(message);
    },
  });

  const resetForm = () => {
    setCheckinDate("");
    setCheckoutDate("");
    setRoomType("");
    setEmail("");
    setError("");
  };

  const validateForm = () => {
    if (!checkinDate || !checkoutDate || !roomType || !email) {
      setError("Please fill in all required fields");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return false;
    }

    const checkin = new Date(checkinDate);
    const checkout = new Date(checkoutDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkin < today) {
      setError("Check-in date cannot be in the past");
      return false;
    }

    if (checkout <= checkin) {
      setError("Check-out date must be after check-in date");
      return false;
    }

    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    bookingMutation.mutate({
      hotelId,
      email,
      checkinDate,
      checkoutDate,
      roomType,
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      resetForm();
    }
  };

  // Set minimum dates
  const today = new Date().toISOString().split('T')[0];
  const nextDay = checkinDate 
    ? new Date(new Date(checkinDate).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    : today;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" data-testid="dialog-booking">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <CalendarCheck className="mr-2 h-5 w-5 text-secondary" />
            Book Your Stay
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="checkin-date">Check-in Date</Label>
            <Input
              id="checkin-date"
              type="date"
              value={checkinDate}
              onChange={(e) => setCheckinDate(e.target.value)}
              min={today}
              data-testid="input-checkin-date"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="checkout-date">Check-out Date</Label>
            <Input
              id="checkout-date"
              type="date"
              value={checkoutDate}
              onChange={(e) => setCheckoutDate(e.target.value)}
              min={nextDay}
              data-testid="input-checkout-date"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="room-type">Room Type</Label>
            <Select value={roomType} onValueChange={setRoomType}>
              <SelectTrigger data-testid="select-room-type">
                <SelectValue placeholder="Select room type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard-ocean">Standard Ocean View - $299/night</SelectItem>
                <SelectItem value="deluxe-suite">Deluxe Suite - $449/night</SelectItem>
                <SelectItem value="presidential">Presidential Suite - $899/night</SelectItem>
                <SelectItem value="villa">Private Villa - $1,299/night</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="booking-email">Email Address</Label>
            <Input
              id="booking-email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="input-booking-email"
            />
          </div>
          
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3" data-testid="text-booking-error">
              {error}
            </div>
          )}
          
          <Button 
            type="submit" 
            className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground"
            disabled={bookingMutation.isPending}
            data-testid="button-confirm-booking"
          >
            {bookingMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Confirm Booking
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
