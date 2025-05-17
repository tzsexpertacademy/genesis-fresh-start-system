import React, { createContext, useContext, useEffect, useState } from 'react';
import { dummyUser } from '../lib/localDb';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: any;
  profile: any;
  loading: boolean;
  signIn: () => Promise<{ error: any }>;
  signUp: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Try to get cached user from localStorage to speed up initial render
  const cachedUserStr = localStorage.getItem('cachedUser');
  const cachedUser = cachedUserStr ? JSON.parse(cachedUserStr) : null;

  const [user, setUser] = useState<User | null>(cachedUser);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(cachedUser ? false : true);
  const [authInitialized, setAuthInitialized] = useState(!!cachedUser);
  const navigate = useNavigate();

  // Function to update user state and cache
  const updateUserState = (newUser: User | null) => {
    setUser(newUser);
    if (newUser) {
      localStorage.setItem('cachedUser', JSON.stringify(newUser));
    } else {
      localStorage.removeItem('cachedUser');
    }
  };

  // Debugging
  useEffect(() => {
    console.log('Auth state in AuthProvider:', { user: !!user, loading, authInitialized });
  }, [user, loading, authInitialized]);

  // Fetch user profile from the database
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      return null;
    }
  };

  // Refresh the user profile
  const refreshProfile = async () => {
    if (!user) return;

    try {
      // Ensure user exists in the database
      await ensureUserExists(user.id);

      // Fetch the user profile
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };

  // Initialize auth state
  useEffect(() => {
    // Prevent multiple initializations
    if (authInitialized) return;

    console.log('Initializing auth state...');
    let isMounted = true; // Flag to prevent state updates after unmount

    // Add a safety timeout to ensure loading state is eventually set to false
    const safetyTimeout = setTimeout(() => {
      if (isMounted && loading) {
        console.log('Safety timeout reached, forcing loading to false');
        setLoading(false);
        setAuthInitialized(true);
      }
    }, 3000); // Reduced from 8 seconds to 3 seconds max loading time

    const initAuth = async () => {
      // Only set loading if not already loading
      if (isMounted && !loading) setLoading(true);

      try {
        console.log('Getting current session...');
        // Get the current session
        const { data: { session } } = await supabase.auth.getSession();

        // If component unmounted during async operation, don't update state
        if (!isMounted) return;

        console.log('Session result:', !!session);

        if (session?.user) {
          console.log('User found in session:', session.user.email);
          updateUserState(session.user);

          try {
            // Skip ensureUserExists for now to prevent database calls
            // We'll do this in the background later

            // Fetch user profile
            const profileData = await fetchProfile(session.user.id);
            if (isMounted) setProfile(profileData);

            // Run ensureUserExists in the background after auth is complete
            setTimeout(() => {
              if (isMounted) {
                ensureUserExists(session.user.id).catch(err => {
                  console.error('Background user ensure failed:', err);
                });
              }
            }, 2000);

          } catch (profileError) {
            console.error('Error setting up user profile:', profileError);
            // Continue with the session even if profile setup fails
          } finally {
            // Always set loading to false after user is authenticated
            if (isMounted) {
              console.log('Setting loading to false and authInitialized to true after user authentication');
              setLoading(false);
              setAuthInitialized(true);
            }
          }
        } else {
          console.log('No user in session');
          if (isMounted) {
            updateUserState(null);
            setProfile(null);
            // Set loading to false when no user is found
            setLoading(false);
            setAuthInitialized(true);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (isMounted) {
          updateUserState(null);
          setProfile(null);
          // Set loading to false on error
          setLoading(false);
          setAuthInitialized(true);
        }
      }
    };

    // Immediately invoke initAuth
    initAuth();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, 'Session exists:', !!session);

        // If component unmounted, don't update state
        if (!isMounted) return;

        if (event === 'SIGNED_IN' && session?.user) {
          console.log('User signed in:', session.user.email);
          updateUserState(session.user);

          try {
            // Skip ensureUserExists for now to prevent database calls
            // We'll do this in the background later

            // Fetch user profile
            const profileData = await fetchProfile(session.user.id);
            if (isMounted) setProfile(profileData);

            // Run ensureUserExists in the background after auth is complete
            setTimeout(() => {
              if (isMounted) {
                ensureUserExists(session.user.id).catch(err => {
                  console.error('Background user ensure failed:', err);
                });
              }
            }, 2000);

          } catch (profileError) {
            console.error('Error setting up user profile on auth change:', profileError);
            // Continue with the session even if profile setup fails
          } finally {
            // Make sure loading is set to false after sign in
            if (isMounted) {
              console.log('Setting loading to false after sign in');
              setLoading(false);
              setAuthInitialized(true);
            }
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          if (isMounted) {
            updateUserState(null);
            setProfile(null);
            // Make sure loading is set to false after sign out
            setLoading(false);
            setAuthInitialized(true);
          }
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log('Token refreshed for user:', session.user.email);
          // Make sure to update the user state when token is refreshed
          updateUserState(session.user);

          // Fetch profile in the background
          fetchProfile(session.user.id).then(profileData => {
            if (isMounted) setProfile(profileData);
          }).catch(err => {
            console.error('Error fetching profile after token refresh:', err);
          });

          if (isMounted) {
            setLoading(false);
            setAuthInitialized(true);
          }
        } else {
          // For any other auth state changes, ensure loading is set to false
          console.log('Other auth state change:', event, 'Ensuring loading is false');
          if (isMounted) {
            // If we have a session but no user state, update the user state
            if (session?.user && !user) {
              console.log('Setting user from session during other auth event');
              updateUserState(session.user);
            }
            setLoading(false);
            setAuthInitialized(true);
          }
        }
      }
    );

    // Clean up subscription and set isMounted flag
    return () => {
      console.log('Cleaning up auth subscription');
      clearTimeout(safetyTimeout);
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [authInitialized]);

  // Sign in function
  const signIn = async (emailOrProvider: string, password?: string) => {
    try {
      // Check if this is a social login
      if (emailOrProvider === 'google') {
        // Sign in with Google OAuth
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin
          }
        });

        if (error) {
          return { error };
        }

        return { error: null };
      } else if (password) {
        // Regular email/password sign in
        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailOrProvider,
          password
        });

        if (error) {
          return { error };
        }

        if (data.user) {
          // Ensure user exists in the database
          await ensureUserExists(data.user.id);

          // Fetch user profile
          const profileData = await fetchProfile(data.user.id);
          setProfile(profileData);
        }

        return { error: null };
      } else {
        return { error: new Error('Invalid sign in parameters') };
      }
    } catch (error) {
      console.error('Error signing in:', error);
      return { error };
    }
  };

  // Sign up function
  const signUp = async (email: string, password: string, userData: any) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error('Error signing up:', error);
      return { error };
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      // Clear cached user immediately for faster UI response
      updateUserState(null);
      setProfile(null);

      // Then perform the actual sign out
      await supabase.auth.signOut();
      navigate('/signin');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
