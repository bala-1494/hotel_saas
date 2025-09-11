# Hotel Page Generator

## Overview

A full-stack React application that transforms Google Maps hotel links into AI-powered landing pages. Users can paste any Google Maps URL pointing to a hotel, and the system automatically generates a beautiful, mobile-friendly marketing page complete with AI-generated content, photo galleries, and booking functionality.

The application fetches hotel data from Google Maps Places API, uses Gemini AI to generate compelling marketing copy, and provides a complete booking experience with email confirmations via Mailgun.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query for server state, React hooks for local state
- **Routing**: Wouter for lightweight client-side routing
- **Build Tool**: Vite with hot module replacement

### Backend Architecture
- **Runtime**: Node.js with Express server
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful endpoints with structured error handling
- **Development**: Hot reload with tsx, production builds with esbuild

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema**: Three main entities - hotels, generated_content, and bookings
- **Development Storage**: In-memory storage fallback for development
- **Connection**: Neon Database serverless connection pooling

### Authentication & Sessions
- **Session Management**: PostgreSQL-backed sessions using connect-pg-simple
- **Security**: No user authentication required - stateless hotel page generation

### External Service Integrations
- **Google Maps Places API**: Fetches comprehensive hotel data including photos, reviews, and location details
- **Gemini AI**: Generates creative marketing content including headlines, stories, and review summaries
- **Mailgun**: Handles booking confirmation emails with HTML templates

### Key Design Patterns
- **Separation of Concerns**: Shared schema definitions, service layer abstraction, and component-based UI
- **Error Handling**: Comprehensive error boundaries and user-friendly error messages
- **Responsive Design**: Mobile-first approach with touch-optimized interactions
- **Progressive Enhancement**: Graceful fallbacks for missing data or failed API calls
- **Type Safety**: End-to-end TypeScript with shared types between client and server

### Performance Optimizations
- **Code Splitting**: Component-level imports and dynamic loading
- **Image Optimization**: Lazy loading and responsive image handling
- **Caching**: Query client caching for hotel data and generated content
- **Bundle Optimization**: Tree shaking and production builds with esbuild

## External Dependencies

### Core Runtime Dependencies
- **Database**: @neondatabase/serverless for PostgreSQL connections
- **ORM**: drizzle-orm with drizzle-kit for schema management
- **AI Integration**: @google/genai for Gemini AI content generation
- **Email Service**: Mailgun API for booking confirmations
- **Maps Integration**: Google Places API for hotel data retrieval

### UI and Styling
- **Component Library**: @radix-ui/* primitives for accessible components
- **Styling**: tailwindcss with @tailwindcss/typography
- **Icons**: lucide-react for consistent iconography
- **Utilities**: class-variance-authority and clsx for conditional styling

### Development Tools
- **Build System**: vite with @vitejs/plugin-react
- **Type Checking**: TypeScript with strict configuration
- **Development**: tsx for hot reload, @replit/vite-plugin-runtime-error-modal for debugging
- **Validation**: zod for runtime type checking and schema validation

### State Management
- **Server State**: @tanstack/react-query for data fetching and caching
- **Forms**: react-hook-form with @hookform/resolvers for form validation
- **Date Handling**: date-fns for date manipulation and formatting

### Production Infrastructure
- **Session Storage**: connect-pg-simple for PostgreSQL session management
- **Process Management**: Node.js cluster support for production scaling
- **Environment Configuration**: dotenv for environment variable management