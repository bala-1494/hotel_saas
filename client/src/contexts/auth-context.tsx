import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, isTestingMode } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock user data for testing mode
const createMockUser = (): User => ({
  id: 'bala-test-user-id-12345',
  email: 'bala@test.com',
  user_metadata: {
    full_name: 'Bala Test User',
    name: 'Bala Test User',
    email: 'bala@test.com'
  },
  app_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
} as User);

// Mock session data for testing mode
const createMockSession = (user: User): Session => ({
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user,
} as Session);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isTestingMode) {
      // In testing mode, immediately set mock user and session
      console.log('Testing mode detected - using mock user Bala');
      const mockUser = createMockUser();
      const mockSession = createMockSession(mockUser);
      
      setUser(mockUser);
      setSession(mockSession);
      setLoading(false);
      return;
    }

    // Production mode with Supabase
    if (!supabase) {
      console.error('Supabase client not initialized');
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (event === 'SIGNED_IN') {
          console.log('User signed in:', session?.user);
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (isTestingMode) {
      // In testing mode, just simulate successful sign-in
      console.log('Testing mode: simulating Google sign-in success');
      const mockUser = createMockUser();
      const mockSession = createMockSession(mockUser);
      
      setUser(mockUser);
      setSession(mockSession);
      return;
    }

    if (!supabase) {
      throw new Error('Supabase client not available');
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      
      if (error) {
        console.error('Error signing in with Google:', error.message);
        throw error;
      }
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    if (isTestingMode) {
      // In testing mode, just clear the mock user
      console.log('Testing mode: simulating sign out');
      setUser(null);
      setSession(null);
      return;
    }

    if (!supabase) {
      throw new Error('Supabase client not available');
    }

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error.message);
        throw error;
      }
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const value = {
    user,
    session,
    loading,
    signInWithGoogle,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}