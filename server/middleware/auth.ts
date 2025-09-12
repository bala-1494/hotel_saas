import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

// Create server-side Supabase client for JWT verification
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.');
  throw new Error('Supabase configuration missing');
}

// Use anon key for JWT verification - this is sufficient for validating tokens
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Extend Express Request to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

/**
 * Authentication middleware to verify Supabase JWT tokens
 * Extracts user ID from verified session and adds it to request.user
 */
export async function authenticateUser(req: Request, res: Response, next: NextFunction) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ 
        message: 'Missing or invalid authorization header. Please provide a valid Bearer token.' 
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('Auth middleware error:', error?.message || 'No user found');
      return res.status(401).json({ 
        message: 'Invalid or expired token. Please login again.' 
      });
    }

    // Add authenticated user to request
    req.user = {
      id: user.id,
      email: user.email!,
    };

    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({ 
      message: 'Authentication service error' 
    });
  }
}

/**
 * Optional authentication middleware that allows both authenticated and unauthenticated requests
 * If authenticated, adds user to request.user, otherwise request.user remains undefined
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      // No auth provided, continue without user
      return next();
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (!error && user) {
      req.user = {
        id: user.id,
        email: user.email!,
      };
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    // Don't fail the request, just continue without user
    next();
  }
}

/**
 * Rate limiting middleware - basic implementation
 * TODO: Replace with Redis-based rate limiting in production
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(windowMs: number = 60000, maxRequests: number = 100) {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.user?.id || req.ip || 'unknown';
    const now = Date.now();
    
    const clientData = requestCounts.get(clientId);
    
    if (!clientData || now > clientData.resetTime) {
      // Reset window
      requestCounts.set(clientId, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }
    
    if (clientData.count >= maxRequests) {
      return res.status(429).json({
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000),
      });
    }
    
    clientData.count++;
    next();
  };
}