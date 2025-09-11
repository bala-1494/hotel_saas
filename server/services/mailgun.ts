interface BookingConfirmationData {
  email: string;
  hotelName: string;
  checkinDate: string;
  checkoutDate: string;
  roomType: string;
  hotelAddress: string;
  hotelPhone?: string;
  bookingId: string;
}

export class MailgunService {
  private apiKey: string;
  private domain: string;
  private senderEmail: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.MAILGUN_API_KEY || '';
    this.domain = process.env.MAILGUN_DOMAIN || '';
    this.senderEmail = process.env.MAILGUN_SENDER_EMAIL || 'Mailgun Sandbox <postmaster@www.kutkrew.com>';
    this.baseUrl = `https://api.mailgun.net/v3/${this.domain}`;
  }

  isConfigured(): boolean {
    return !!(this.apiKey && this.domain);
  }

  async sendBookingConfirmation(bookingData: BookingConfirmationData): Promise<void> {
    try {
      const emailContent = this.generateBookingEmail(bookingData);
      
      const formData = new FormData();
      formData.append('from', this.senderEmail);
      formData.append('to', bookingData.email);
      formData.append('subject', `Booking Confirmation - ${bookingData.hotelName}`);
      formData.append('html', emailContent);

      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Mailgun API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Email sent successfully:', result.id);
    } catch (error) {
      console.error('Error sending booking confirmation email:', error);
      throw new Error(`Failed to send confirmation email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private generateBookingEmail(data: BookingConfirmationData): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Confirmation</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { background: #f9fafb; padding: 30px; }
            .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-label { font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🏨 Booking Confirmation</h1>
                <p>Your reservation has been confirmed!</p>
            </div>
            
            <div class="content">
                <h2>Thank you for your booking!</h2>
                <p>We're excited to welcome you to <strong>${data.hotelName}</strong>. Here are your booking details:</p>
                
                <div class="booking-details">
                    <h3>Booking Details</h3>
                    
                    <div class="detail-row">
                        <span class="detail-label">Booking ID:</span>
                        <span>${data.bookingId}</span>
                    </div>
                    
                    <div class="detail-row">
                        <span class="detail-label">Hotel:</span>
                        <span>${data.hotelName}</span>
                    </div>
                    
                    <div class="detail-row">
                        <span class="detail-label">Check-in:</span>
                        <span>${new Date(data.checkinDate).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}</span>
                    </div>
                    
                    <div class="detail-row">
                        <span class="detail-label">Check-out:</span>
                        <span>${new Date(data.checkoutDate).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}</span>
                    </div>
                    
                    <div class="detail-row">
                        <span class="detail-label">Room Type:</span>
                        <span>${data.roomType}</span>
                    </div>
                    
                    <div class="detail-row">
                        <span class="detail-label">Address:</span>
                        <span>${data.hotelAddress}</span>
                    </div>
                    
                    ${data.hotelPhone ? `
                    <div class="detail-row">
                        <span class="detail-label">Phone:</span>
                        <span>${data.hotelPhone}</span>
                    </div>
                    ` : ''}
                </div>
                
                <h3>Important Information</h3>
                <ul>
                    <li>Please bring a valid photo ID for check-in</li>
                    <li>Standard check-in time is 3:00 PM</li>
                    <li>Standard check-out time is 11:00 AM</li>
                    <li>If you need to modify or cancel your reservation, please contact the hotel directly</li>
                </ul>
                
                <p>We look forward to providing you with an exceptional stay!</p>
            </div>
            
            <div class="footer">
                <p>This is an automated confirmation email from Hotel Page Generator.</p>
                <p>Please contact the hotel directly for any changes to your reservation.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }
}

export const mailgunService = new MailgunService();
