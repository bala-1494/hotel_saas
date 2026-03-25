# Hotel Page Generator

A full-stack SaaS application that transforms Google Maps hotel links into AI-powered landing pages with booking functionality — in just a few clicks.

---

## Table of Contents

- [Overview](#overview)
- [Live Features](#live-features)
- [Application Flows](#application-flows)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)

---

## Overview

Hotel Page Generator lets hotel owners paste a Google Maps URL and instantly receive a branded, SEO-ready landing page with AI-generated content, a photo gallery, and a working booking system — all without writing a single line of code.

---

## Live Features

### Authentication
- **Google OAuth** via Supabase — one-click sign-in with a Google account
- **JWT-based API security** — every protected request is verified against a Supabase-issued token
- **Automatic user sync** — a database record is created on first login

### 4-Step Hotel Page Generation

| Step | Action | What Happens |
|------|--------|--------------|
| 1 | Sign in | Google OAuth creates/retrieves your account |
| 2 | Paste Google Maps URL | Hotel data (name, address, phone, photos, reviews, rating, coordinates) is fetched from the Google Places API and stored |
| 3 | Generate AI Content | Gemini 2.5 Pro writes a marketing headline, a 2–3 paragraph brand story, and a review summary |
| 4 | Create Shareable URL | A unique public link (`/hotel/{id}`) is generated and made live |

### Public Hotel Landing Pages
- Accessible to anyone — no login required
- **Hero section** with full-bleed background image
- **Photo gallery** with Embla carousel and selected-image preview
- **Hotel details**: name, AI headline, star rating, category, years in service
- **Contact section**: address, phone, email, website
- **AI-generated brand story** with styled typography
- **AI review summary** and individual guest reviews from Google Maps
- **Amenities / features list**
- **SEO optimization**: dynamic `<title>`, meta description, Open Graph tags for social sharing
- **Floating "Book Now" button**

### Booking System
- Guest fills in check-in / check-out dates, room type, and email
- Validation: no past dates, checkout must be after check-in
- Booking record saved to database
- **HTML confirmation email** sent via Mailgun (check-in times, booking ID, room type, guest count, important info section)
- Returns booking ID and email delivery status

### My Sites Dashboard
- Lists all hotel pages the user has generated
- Shows hotel name, AI headline, star rating, and address
- One-click link to view each live page
- Clean empty state when no sites exist yet

### Image Management
- Hotel photos imported automatically from Google Maps during generation
- Add additional images via API
- Set a primary (hero) image
- Display order control for gallery

### User & Hotel Management
- **One active hotel per user** — previous hotel is deactivated when a new one is generated
- View all hotels associated with an account
- Per-hotel booking history (owner-only)

### Security & Reliability
- **Rate limiting** on expensive endpoints (10 requests / 5 min per user)
- **Idempotent URL creation** — re-running Step 4 returns the existing URL
- **Retry logic with exponential backoff** on Gemini AI calls (handles 503 overload errors)
- **Zod schema validation** on all inputs (email format, date ranges, URL patterns, rating 0–5)
- **Drizzle ORM parameterized queries** — SQL injection prevention
- **User isolation** — users can only read/write their own data

### Responsive UI
- Mobile-first design with Tailwind CSS
- Dark mode support via CSS variables
- 40+ accessible components from shadcn/ui (built on Radix UI)

---

## Application Flows

### 1. Authentication Flow
- User clicks "Sign In" and is redirected to Google OAuth via Supabase.
- Upon successful authentication, Supabase issues a JWT.
- The client application intercepts this JWT and sends it to the backend `/api/create-user` endpoint to sync the user record to the application's PostgreSQL database.
- Future requests to protected endpoints include the JWT in the `Authorization` header.

### 2. Hotel Page Generation Flow
- **Step 1:** The authenticated user pastes a Google Maps URL for a hotel.
- **Step 2:** The system calls the backend to fetch data (name, address, coordinates, reviews, photos) from the Google Places API. This data is stored in the database.
- **Step 3:** The system sends the hotel data to Gemini 2.5 Pro via a background job to generate marketing copy (headline, brand story, review summary).
- **Step 4:** A unique, shareable public URL (`/hotel_id={uuid}`) is generated and made live. Any previous active hotel for the user is deactivated.

### 3. Public Hotel Viewing Flow
- A visitor opens the generated shareable link.
- The system fetches the hotel details, generated AI content, and image gallery from the database (no authentication required).
- The visitor sees a fully styled, mobile-responsive landing page with the hero image, hotel details, photo carousel, AI story, and reviews.

### 4. Booking Flow
- A visitor clicks the "Book Now" button on the public hotel page.
- A modal opens, prompting the visitor to select check-in/check-out dates, room type, guest count, and provide their email.
- Upon submission, the backend validates the dates (e.g., checkout after check-in, no past dates).
- The booking is recorded in the database with a "confirmed" status.
- The system sends an HTML confirmation email to the guest via the Mailgun API.

### 5. User Dashboard / My Sites Flow
- An authenticated user navigates to the "My Sites" dashboard.
- The system fetches all hotels generated by the user from the database.
- The user can view the list of their generated hotels (including name, address, and rating) and click a link to view the live public page for each.
- The user can initiate the process to generate a new hotel page.

### 6. Image Management Flow
- During generation, images are automatically imported from the Google Maps listing.
- Authenticated users can upload additional images to their hotel gallery via the API.
- Users can set a specific image as the primary "hero" image, which updates the `isPrimary` flag in the database.
- Users can reorder images to control the gallery display order.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript, Wouter (routing), TanStack React Query |
| UI | shadcn/ui, Radix UI, Tailwind CSS, Framer Motion, Embla Carousel |
| Forms | React Hook Form + Zod |
| Backend | Node.js, Express 4, TypeScript |
| Database | PostgreSQL 16 (Neon serverless), Drizzle ORM |
| Auth | Supabase (Google OAuth + JWT) |
| AI | Google Gemini 2.5 Pro (`@google/genai`) |
| Maps | Google Places API v1 |
| Email | Mailgun REST API v3 |
| Build | Vite (frontend), ESBuild (backend) |

---

## Architecture

```
hotel_saas/
├── client/src/
│   ├── pages/
│   │   ├── home.tsx          # Dashboard + 4-step generation workflow
│   │   ├── hotel-page.tsx    # Public hotel landing page
│   │   ├── my-sites.tsx      # User's generated pages list
│   │   ├── booking-config.tsx# (Coming soon)
│   │   └── login.tsx         # Google OAuth sign-in
│   ├── components/
│   │   ├── generation-form.tsx   # Google Maps URL input
│   │   ├── generated-page.tsx    # Full hotel landing page component
│   │   ├── booking-modal.tsx     # Guest booking dialog
│   │   ├── navigation.tsx        # App header + user menu
│   │   └── loading-state.tsx     # Step progress indicator
│   ├── contexts/
│   │   └── auth-context.tsx  # Supabase session + signIn/signOut
│   └── lib/
│       ├── api.ts            # Typed API client with JWT injection
│       ├── supabase.ts       # Supabase JS client
│       └── queryClient.ts    # React Query config
├── server/
│   ├── routes.ts             # All API endpoint handlers
│   ├── storage.ts            # Data access layer (DB + in-memory fallback)
│   ├── middleware/
│   │   └── auth.ts           # JWT verification + rate limiting
│   └── services/
│       ├── gemini.ts         # Gemini AI content generation
│       ├── googlemaps.ts     # Google Places API integration
│       └── mailgun.ts        # Booking confirmation emails
└── shared/
    └── schema.ts             # Drizzle schema + Zod validation schemas
```

---

## API Reference

### Public Endpoints (no auth required)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/hotels/:id` | Fetch hotel page data (hotel + images + owner) |
| `GET` | `/api/hotels/:id/images` | Fetch hotel image gallery |
| `POST` | `/api/bookings` | Submit a booking + receive confirmation email |
| `POST` | `/api/create-user` | Sync OAuth user to database (called on first login) |

### Protected Endpoints (JWT required)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/store-hotel-data` | Step 2 — fetch & store hotel from Google Maps URL _(rate limited)_ |
| `POST` | `/api/generate-ai-content` | Step 3 — run Gemini AI to generate headline, story, review summary |
| `POST` | `/api/create-shareable-url` | Step 4 — create/return the public shareable URL |
| `GET` | `/api/user/hotels` | List all hotels for the authenticated user |
| `GET` | `/api/users/:id` | Get user profile with associated hotel |
| `POST` | `/api/hotels/:id/images` | Add an image to a hotel's gallery |
| `PUT` | `/api/hotels/:hotelId/images/:imageId/primary` | Set the primary/hero image |
| `GET` | `/api/hotels/:id/bookings` | View bookings for a hotel (owner only) |

---

## Database Schema

### `users`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | Supabase auth user ID |
| `email` | TEXT UNIQUE | |
| `fullName` | TEXT | |
| `avatarUrl` | TEXT | |
| `createdAt` | TIMESTAMP | |
| `updatedAt` | TIMESTAMP | |

### `hotels`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `userId` | UUID (FK) | References `users.id` |
| `placeId` | TEXT UNIQUE | Google Maps place ID |
| `googleMapsUrl` | TEXT | Original URL submitted |
| `name` | TEXT | |
| `description` | TEXT | |
| `address` | TEXT | |
| `city` | TEXT | |
| `phone` | TEXT | |
| `email` | TEXT | |
| `website` | TEXT | |
| `rating` | REAL | 0–5 |
| `category` | TEXT | Hotel type |
| `yearsInService` | TEXT | |
| `headline` | TEXT | AI-generated |
| `story` | TEXT | AI-generated |
| `reviewSummary` | TEXT | AI-generated |
| `features` | JSONB | Amenities array |
| `priceRange` | TEXT | e.g. "$100–200 per night" |
| `currency` | TEXT | Default: USD |
| `coordinates` | JSONB | `{lat, lng}` |
| `reviews` | JSONB | Google Maps reviews array |
| `sitePath` | TEXT UNIQUE | Public URL path |
| `isActive` | BOOLEAN | Only one active per user |
| `createdAt` / `updatedAt` | TIMESTAMP | |

### `hotel_images`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `hotelId` | UUID (FK) | References `hotels.id` |
| `imageUrl` | TEXT | |
| `altText` | TEXT | |
| `caption` | TEXT | |
| `isPrimary` | BOOLEAN | Hero image flag |
| `displayOrder` | INTEGER | Gallery sort order |
| `createdAt` | TIMESTAMP | |

### `bookings`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `hotelId` | UUID (FK) | References `hotels.id` |
| `email` | TEXT | Guest email |
| `checkinDate` | TEXT | |
| `checkoutDate` | TEXT | |
| `roomType` | TEXT | |
| `guestCount` | INTEGER | Default: 1 |
| `specialRequests` | TEXT | |
| `status` | TEXT | `confirmed` \| `cancelled` \| `completed` |
| `createdAt` | TIMESTAMP | |

---

## Environment Variables

### Backend
```env
DATABASE_URL=postgresql://user:password@host/database
GEMINI_API_KEY=your-gemini-api-key
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
MAILGUN_API_KEY=your-mailgun-api-key          # optional — emails skipped if absent
MAILGUN_DOMAIN=your-mailgun-domain
MAILGUN_SENDER_EMAIL=noreply@your-domain.com
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
PORT=5000
NODE_ENV=development
```

### Frontend (also picked up by Vite)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

---

## Getting Started

```bash
# Install dependencies
npm install

# Push schema to database
npm run db:push

# Start development server (hot reload)
npm run dev

# Type-check
npm run check

# Production build
npm run build
npm start
```

The app is served on **port 5000** by default. Both the React frontend and the Express API are served from the same port in production.
