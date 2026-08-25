import React, { createContext, useContext, useState, useEffect } from 'react';
import { ApiClient } from '../api/client.js';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  language: string;
  roles: string[];
  mfaEnabled: boolean;
  organization?: {
    id: string;
    name: string;
    type: string;
    businessNumber?: string;
  } | null;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (token: string, user: UserProfile) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isInternalStaff: boolean;
  isReferentQualite: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const data = await ApiClient.request<UserProfile>('/auth/me');
      setUser(data);
    } catch {
      setUser(null);
      ApiClient.clearToken();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('sfs_auth_token');
    if (token) {
      refreshUser();
    } else {
      setLoading(false);
    }
  }, []);

  const login = (token: string, profile: UserProfile) => {
    ApiClient.setToken(token);
    setUser(profile);
  };

  const logout = () => {
    ApiClient.clearToken();
    setUser(null);
  };

  const internalRoles = ['agent_reception', 'responsable_qualite', 'administrateur', 'lecteur_direction'];
  const isInternalStaff = !!user?.roles.some((r) => internalRoles.includes(r));
  const isReferentQualite = !!user?.roles.includes('referent_qualite');

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshUser,
        isInternalStaff,
        isReferentQualite,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
