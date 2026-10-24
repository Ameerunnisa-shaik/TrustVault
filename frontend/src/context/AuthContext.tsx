import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

export type UserRole = 'ADMIN' | 'MEMBER' | 'VIEWER';

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
}

export interface WorkspaceMembership {
  companyId: string;
  companyName: string;
  companySlug: string;
  role: UserRole;
  status: string;
}

interface AuthContextType {
  user: User | null;
  memberships: WorkspaceMembership[];
  activeCompany: WorkspaceMembership | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; fullName: string; companyName?: string }) => Promise<void>;
  logout: () => Promise<void>;
  switchCompany: (companyId: string) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [memberships, setMemberships] = useState<WorkspaceMembership[]>([]);
  const [activeCompany, setActiveCompany] = useState<WorkspaceMembership | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    const token = localStorage.getItem('trustvault_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.get('/auth/me');
      const userData = res.data.user;
      const userMemberships: WorkspaceMembership[] = res.data.memberships || [];

      setUser(userData);
      setMemberships(userMemberships);

      const savedCompanyId = localStorage.getItem('trustvault_active_company_id');
      const foundCompany = userMemberships.find((m) => m.companyId === savedCompanyId);

      if (foundCompany) {
        setActiveCompany(foundCompany);
      } else if (userMemberships.length > 0) {
        setActiveCompany(userMemberships[0]);
        localStorage.setItem('trustvault_active_company_id', userMemberships[0].companyId);
      }
    } catch (err) {
      console.error('Failed to restore session:', err);
      localStorage.removeItem('trustvault_token');
      localStorage.removeItem('trustvault_active_company_id');
      setUser(null);
      setMemberships([]);
      setActiveCompany(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { token, user: loggedInUser, memberships: userMemberships, activeCompany: initialCompany } = res.data;

    localStorage.setItem('trustvault_token', token);
    setUser(loggedInUser);
    setMemberships(userMemberships);

    if (initialCompany) {
      setActiveCompany(initialCompany);
      localStorage.setItem('trustvault_active_company_id', initialCompany.id || initialCompany.companyId);
    } else if (userMemberships.length > 0) {
      setActiveCompany(userMemberships[0]);
      localStorage.setItem('trustvault_active_company_id', userMemberships[0].companyId);
    }
  };

  const register = async (data: { email: string; password: string; fullName: string; companyName?: string }) => {
    const res = await api.post('/auth/register', data);
    const { token, user: registeredUser, activeCompany: comp } = res.data;

    localStorage.setItem('trustvault_token', token);
    setUser(registeredUser);

    const initialMembership: WorkspaceMembership = {
      companyId: comp.id,
      companyName: comp.name,
      companySlug: comp.slug,
      role: comp.role as UserRole,
      status: 'ACTIVE',
    };

    setMemberships([initialMembership]);
    setActiveCompany(initialMembership);
    localStorage.setItem('trustvault_active_company_id', comp.id);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      // Continue cleanup on error
    } finally {
      localStorage.removeItem('trustvault_token');
      localStorage.removeItem('trustvault_active_company_id');
      setUser(null);
      setMemberships([]);
      setActiveCompany(null);
    }
  };

  const switchCompany = (companyId: string) => {
    const target = memberships.find((m) => m.companyId === companyId);
    if (target) {
      setActiveCompany(target);
      localStorage.setItem('trustvault_active_company_id', target.companyId);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        memberships,
        activeCompany,
        isLoading,
        login,
        register,
        logout,
        switchCompany,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
