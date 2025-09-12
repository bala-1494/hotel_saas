import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { storage } from '../storage';

// Testing mode configuration
const TESTING_MODE = process.env.NODE_ENV !== 'production' && (process.env.ENABLE_TESTING_MODE === 'true' || process.env.NODE_ENV === 'development');

// Mock user data for testing - "Bala"
const MOCK_USER = {
  id: 'bala-test-user-id-12345',
  email: 'bala@test.com',
  fullName: 'Bala Test User',
  avatarUrl: null,
};

// Create server-side Supabase client for JWT verification
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

// In testing mode, we can skip Supabase configuration
if (!TESTING_MODE && (!supabaseUrl || !supabaseAnonKey)) {
  console.error('Missing Supabase environment variables. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.');
  throw new Error('Supabase configuration missing');
}

// Use anon key for JWT verification - this is sufficient for validating tokens
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Initialize mock user in storage if testing mode is enabled
if (TESTING_MODE) {
  console.log('🧪 TESTING MODE ENABLED - Using mock user "Bala"');
  // Ensure mock user exists in storage
  (async () => {
    try {
      const existingUser = await storage.getUser(MOCK_USER.id);
      if (!existingUser) {
        await storage.createUser(MOCK_USER);
        console.log('✅ Mock user "Bala" created in storage');
      } else {
        console.log('✅ Mock user "Bala" already exists in storage');
      }
    } catch (error) {
      console.error('Failed to create mock user:', error);
    }
  })();
}

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
 * In testing mode, bypasses authentication and uses mock user "Bala"
 */
export async function authenticateUser(req: Request, res: Response, next: NextFunction) {
  try {
    // TESTING MODE: Bypass authentication and use mock user
    if (TESTING_MODE) {
      console.log('🧪 Auth bypass: Using mock user "Bala"');
      req.user = {
        id: MOCK_USER.id,
        email: MOCK_USER.email,
      };
      return next();
    }

    // PRODUCTION MODE: Normal JWT verification
    if (!supabase) {
      return res.status(500).json({ 
        message: 'Authentication service not configured' 
      });
    }

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
 * In testing mode, always uses mock user "Bala"
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // TESTING MODE: Always use mock user
    if (TESTING_MODE) {
      console.log('🧪 Optional auth bypass: Using mock user "Bala"');
      req.user = {
        id: MOCK_USER.id,
        email: MOCK_USER.email,
      };
      return next();
    }

    // PRODUCTION MODE: Normal optional auth logic
    if (!supabase) {
      return next();
    }

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