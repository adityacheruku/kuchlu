
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '@/services/api';
import type { UserInToken, AuthResponse, CompleteRegistrationRequest } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { storageService } from '@/services/storageService';
import { capacitorService } from '@/services/capacitorService';
import { auth, createRecaptchaVerifier, sendOTP, verifyOTP, getFirebaseToken } from '@/lib/firebase';
import type { RecaptchaVerifier } from 'firebase/auth';

interface AuthContextType {
  currentUser: UserInToken | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  login: (phone: string, password_plaintext: string) => Promise<void>;
  firebaseLogin: (phone: string) => Promise<void>;
  firebaseSignup: (phone: string, displayName: string) => Promise<void>;
  completeRegistration: (userData: CompleteRegistrationRequest) => Promise<void>;
  logout: () => Promise<void>;
  fetchAndUpdateUser: () => Promise<void>;
  isAuthenticated: boolean;
  sendFirebaseOTP: (phoneNumber: string) => Promise<any>;
  verifyFirebaseOTP: (confirmationResult: any, otp: string) => Promise<any>;
  handleAuthSuccess: (data: AuthResponse) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<UserInToken | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const isAuthenticated = !!token && !!currentUser;

  const handleAuthSuccess = useCallback(async (data: AuthResponse) => {
    localStorage.setItem('kuchluAccessToken', data.access_token);
    localStorage.setItem('kuchluRefreshToken', data.refresh_token);
    api.setAuthToken(data.access_token);
    api.setRefreshToken(data.refresh_token);
    setCurrentUser(data.user);
    setToken(data.access_token);
    setRefreshToken(data.refresh_token);
    await storageService.upsertUser(data.user);
    await capacitorService.setAuthToken(data.access_token);
  }, []);

  const logout = useCallback(async () => {
    setCurrentUser(null);
    setToken(null);
    setRefreshToken(null);
    api.setAuthToken(null);
    api.setRefreshToken(null);
    localStorage.removeItem('kuchluAccessToken');
    localStorage.removeItem('kuchluRefreshToken');
    await storageService.delete();
    await storageService.open();
    if (pathname !== '/') {
      router.push('/');
    }
    toast({ title: 'Logged Out', description: "You've been successfully logged out." });
    await auth.signOut().catch(e => console.error("Firebase signout error", e));
  }, [router, toast, pathname]);

  useEffect(() => {
    const storedToken = localStorage.getItem('kuchluAccessToken');
    const storedRefreshToken = localStorage.getItem('kuchluRefreshToken');

    if (storedToken && storedRefreshToken) {
      const loadUserFromToken = async (tokenToLoad: string, refreshTokenToLoad: string) => {
        try {
          api.setAuthToken(tokenToLoad);
          api.setRefreshToken(refreshTokenToLoad);
          setToken(tokenToLoad);
          setRefreshToken(refreshTokenToLoad);
          const userProfile = await api.getCurrentUserProfile();
          setCurrentUser(userProfile);
          await storageService.upsertUser(userProfile);
          await capacitorService.setAuthToken(tokenToLoad);
        } catch (error) {
          console.error("Failed to load user from token, attempting refresh.", error);
          try {
              const newAuthData = await api.refreshAuthToken();
              await handleAuthSuccess(newAuthData);
          } catch (refreshError) {
              console.error("Token refresh failed.", refreshError);
              logout();
          }
        } finally {
          setIsLoading(false);
        }
      };
      loadUserFromToken(storedToken, storedRefreshToken);
    } else {
      setIsLoading(false);
    }
  }, [logout, handleAuthSuccess]);

  const login = useCallback(async (phone: string, password_plaintext: string) => {
    setIsLoading(true);
    try {
      const data: AuthResponse = await api.login(phone, password_plaintext);
      await handleAuthSuccess(data);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Login Failed', description: error.message || 'Please check your credentials.' });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [handleAuthSuccess, toast]);

  const completeRegistration = useCallback(async (userData: CompleteRegistrationRequest) => {
    setIsLoading(true);
    try {
      const data: AuthResponse = await api.completeRegistration(userData);
      await handleAuthSuccess(data);
      toast({ title: 'Registration Successful!', description: 'Welcome to Kuchlu.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Registration Failed', description: error.message || 'Please try again.' });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [handleAuthSuccess, toast]);

  const fetchAndUpdateUser = useCallback(async () => {
    if (!token) return;
    try {
      const userProfile = await api.getCurrentUserProfile();
      setCurrentUser(userProfile);
      await storageService.upsertUser(userProfile);
    } catch (error) {
      console.error("Failed to refresh user profile", error);
      logout();
    }
  }, [token, logout]);

  const sendFirebaseOTP = useCallback(async (phoneNumber: string) => {
    try {
      const recaptchaVerifier = createRecaptchaVerifier('recaptcha-container');
      const confirmationResult = await sendOTP(phoneNumber, recaptchaVerifier);
      return confirmationResult;
    } catch (error: any) {
      console.error('Error sending Firebase OTP:', error);
      throw error;
    }
  }, []);

  const verifyFirebaseOTP = useCallback(async (confirmationResult: any, otp: string) => {
    try {
      const result = await verifyOTP(confirmationResult, otp);
      return result;
    } catch (error: any) {
      console.error('Error verifying Firebase OTP:', error);
      throw error;
    }
  }, []);

  const firebaseLogin = useCallback(async (phone: string) => {
    setIsLoading(true);
    try {
      const firebaseToken = await getFirebaseToken();
      const data: AuthResponse = await api.firebaseLogin(firebaseToken);
      await handleAuthSuccess(data);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Login Failed', description: error.message || 'Please check your credentials.' });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [handleAuthSuccess, toast]);

  const firebaseSignup = useCallback(async (phone: string, displayName: string) => {
    setIsLoading(true);
    try {
      const firebaseToken = await getFirebaseToken();
      const data: AuthResponse = await api.firebaseSignup(firebaseToken);
      await handleAuthSuccess(data);
      toast({ title: 'Registration Successful!', description: 'Welcome to Kuchlu.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Registration Failed', description: error.message || 'Please try again.' });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [handleAuthSuccess, toast]);

  useEffect(() => {
    if (isLoading) return;

    const isAuthPage = pathname === '/';
    const isOnboardingPage = pathname.startsWith('/onboarding');
    const isProtectedPage = !isAuthPage && !isOnboardingPage;

    if (isAuthenticated && currentUser) {
      if (currentUser.partner_id) {
        if (isAuthPage || isOnboardingPage) {
          router.push('/chat');
        }
      } else {
        if (!isOnboardingPage) {
          router.push('/onboarding/find-partner');
        }
      }
    } else {
      if (isProtectedPage) {
        router.push('/');
      }
    }
  }, [isLoading, isAuthenticated, currentUser, pathname, router]);

  return (
    <AuthContext.Provider value={{ currentUser, token, refreshToken, isLoading, login, completeRegistration, logout, fetchAndUpdateUser, isAuthenticated, sendFirebaseOTP, verifyFirebaseOTP, firebaseLogin, firebaseSignup, handleAuthSuccess }}>
      <div id="recaptcha-container"></div>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
