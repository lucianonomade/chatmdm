import { useState, useEffect, createContext, useContext, ReactNode, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/lib/store';

type AppRole = 'admin' | 'manager' | 'seller';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: AppRole;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  authUser: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string, companyName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const ensureUserRecords = async (accessToken: string) => {
    try {
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ensure-user`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
    } catch {
      // ignore (best-effort)
    }
  };

  const fetchUserProfile = async (userId: string, email?: string) => {
    try {
      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', userId)
        .maybeSingle();

      // Fetch role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (profile && roleData) {
        setAuthUser({
          id: userId,
          email: email || '',
          name: profile.name,
          role: roleData.role as AppRole,
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  // Track previous user ID to detect user changes
  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Get last logged user ID from localStorage
    const getLastUserId = () => localStorage.getItem('last_logged_user_id');
    const setLastUserId = (id: string | null) => {
      if (id) {
        localStorage.setItem('last_logged_user_id', id);
      } else {
        localStorage.removeItem('last_logged_user_id');
      }
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Clear cart when a different user logs in or on fresh login
        if (session?.user) {
          const lastUserId = getLastUserId();
          if (lastUserId !== session.user.id) {
            // Different user logged in, clear the cart
            useStore.getState().clearCart();
          }
          setLastUserId(session.user.id);
          prevUserIdRef.current = session.user.id;
        } else {
          // User logged out - clear cart and reset tracking
          useStore.getState().clearCart();
          setLastUserId(null);
          prevUserIdRef.current = null;
        }

        if (session?.user) {
          setTimeout(() => {
            ensureUserRecords(session.access_token)
              .finally(() => fetchUserProfile(session.user.id, session.user.email ?? undefined));
          }, 0);
        } else {
          setAuthUser(null);
        }

        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      // Check if user changed since last session
      if (session?.user) {
        const lastUserId = getLastUserId();
        if (lastUserId !== session.user.id) {
          // Different user, clear cart
          useStore.getState().clearCart();
        }
        setLastUserId(session.user.id);
        prevUserIdRef.current = session.user.id;
        ensureUserRecords(session.access_token)
          .finally(() => fetchUserProfile(session.user.id, session.user.email ?? undefined));
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);


  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      return { error };
    }

    // Check if user is active
    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('active')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profile && profile.active === false) {
        // Sign out the user immediately
        await supabase.auth.signOut();
        return { 
          error: new Error('Sua conta está desativada. Entre em contato com o administrador.') 
        };
      }
    }

    return { error: null };
  };

  const signUp = async (email: string, password: string, name: string, companyName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name: name,
          company_name: companyName || 'Minha Empresa',
        }
      }
    });
    return { error };
  };

  const signOut = async () => {
    try {
      // Normal sign out (revokes session server-side)
      await supabase.auth.signOut();
    } catch (error) {
      // If the session is already invalid/expired, force a local sign out
      // so the UI state and local storage are cleared.
      await supabase.auth.signOut({ scope: 'local' });
    } finally {
      setAuthUser(null);
      setUser(null);
      setSession(null);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      authUser, 
      loading, 
      signIn, 
      signUp, 
      signOut 
    }}>
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
