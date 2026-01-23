import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);

  const fetchUser = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        withCredentials: true
      });
      setUser(response.data);
      return response.data;
    } catch (error) {
      setUser(null);
      return null;
    }
  }, []);

  const fetchCartCount = useCallback(async () => {
    if (!user) {
      setCartCount(0);
      return;
    }
    try {
      const response = await axios.get(`${API}/cart`, {
        withCredentials: true
      });
      setCartCount(response.data.items?.length || 0);
    } catch (error) {
      setCartCount(0);
    }
  }, [user]);

  useEffect(() => {
    const checkAuth = async () => {
      await fetchUser();
      setLoading(false);
    };
    checkAuth();
  }, [fetchUser]);

  useEffect(() => {
    fetchCartCount();
  }, [fetchCartCount]);

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, {
      email,
      password
    }, {
      withCredentials: true
    });
    setUser(response.data.user);
    localStorage.setItem('token', response.data.token);
    return response.data;
  };

  const register = async (email, password, name) => {
    const response = await axios.post(`${API}/auth/register`, {
      email,
      password,
      name
    });
    setUser(response.data.user);
    localStorage.setItem('token', response.data.token);
    return response.data;
  };

  const loginWithGoogle = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/auth/callback';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const processOAuthCallback = async (sessionId) => {
    const response = await axios.get(`${API}/auth/session`, {
      headers: { 'X-Session-ID': sessionId },
      withCredentials: true
    });
    setUser(response.data.user);
    return response.data.user;
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, {
        withCredentials: true
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    setUser(null);
    setCartCount(0);
    localStorage.removeItem('token');
  };

  const updateCartCount = (count) => {
    setCartCount(count);
  };

  const refreshCart = () => {
    fetchCartCount();
  };

  const value = {
    user,
    loading,
    login,
    register,
    loginWithGoogle,
    processOAuthCallback,
    logout,
    fetchUser,
    cartCount,
    updateCartCount,
    refreshCart,
    isAdmin: user?.role === 'admin',
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
