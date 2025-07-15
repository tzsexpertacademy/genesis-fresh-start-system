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

// Create the context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  refreshProfile: async () => {},
});

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user] = useState<any>(dummyUser);
  const [profile] = useState<any>(dummyUser);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Initialize auth state - simulate loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Dummy sign in function - always succeeds
  const signIn = async () => {
    return { error: null };
  };

  // Dummy sign up function - always succeeds
  const signUp = async () => {
    return { error: null };
  };

  // Dummy sign out function
  const signOut = async () => {
    // Do nothing - we're always signed in
    navigate('/whatsapp/dashboard');
  };

  // Dummy refresh profile function
  const refreshProfile = async () => {
    // Do nothing - profile is static
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
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
