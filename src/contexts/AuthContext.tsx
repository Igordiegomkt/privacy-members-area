import * as React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface Profile {
    id: string;
    first_name: string | null;
    last_name: string | null;
    role: string;
}

interface AuthContextType {
  session: Session | null;
  user: (User & Profile) | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<(User & Profile) | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async (supabaseUser: User) => {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role')
      .eq('id', supabaseUser.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error);
      return null;
    }
    
    // Combina User do Auth com Profile do DB
    return {
        ...supabaseUser,
        first_name: profile?.first_name ?? null,
        last_name: profile?.last_name ?? null,
        role: profile?.role ?? 'user',
    } as (User & Profile);
  }, []);

  useEffect(() => {
    const handleSession = async (currentSession: Session | null) => {
      setSession(currentSession);
      if (currentSession?.user) {
        const fullUser = await fetchProfile(currentSession.user);
        setUser(fullUser);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    };

    // Initial session load
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
        handleSession(initialSession);
    });

    // Realtime session changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      handleSession(currentSession);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);
  
  const signOut = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    // Limpar localStorage que não é mais necessário
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userName');
    localStorage.removeItem('userIsAdult');
    localStorage.removeItem('welcomePurchaseCarolina');
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider value={{ session, user, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};