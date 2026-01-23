import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SiteSettingsContext = createContext(null);

export const useSiteSettings = () => {
  const context = useContext(SiteSettingsContext);
  if (!context) {
    throw new Error('useSiteSettings must be used within a SiteSettingsProvider');
  }
  return context;
};

// Default backgrounds (fallback)
const DEFAULT_BACKGROUNDS = {
  hero: "https://images.unsplash.com/photo-1673195577797-d86fd842ade8?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2OTV8MHwxfHNlYXJjaHwxfHx3ZWRkaW5nJTIwY291cGxlJTIwYXJ0aXN0aWMlMjBkYXJrJTIwbW9vZHl8ZW58MHx8fHwxNzY5MTczNjU0fDA&ixlib=rb-4.1.0&q=85",
  login: "https://images.unsplash.com/photo-1607076490946-26ada294e017?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzl8MHwxfHNlYXJjaHwzfHxwaG90b2dyYXBoZXIlMjBob2xkaW5nJTIwY2FtZXJhJTIwc2lsaG91ZXR0ZXxlbnwwfHx8fDE3NjkxNzM2NTl8MA&ixlib=rb-4.1.0&q=85",
  register: "https://images.unsplash.com/photo-1673195577797-d86fd842ade8?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2OTV8MHwxfHNlYXJjaHwxfHx3ZWRkaW5nJTIwY291cGxlJTIwYXJ0aXN0aWMlMjBkYXJrJTIwbW9vZHl8ZW58MHx8fHwxNzY5MTczNjU0fDA&ixlib=rb-4.1.0&q=85",
  gallery1: "https://images.pexels.com/photos/13446936/pexels-photo-13446936.jpeg",
  gallery2: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=1000",
  gallery3: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800",
  gallery4: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=800"
};

export const SiteSettingsProvider = ({ children }) => {
  const [backgrounds, setBackgrounds] = useState(DEFAULT_BACKGROUNDS);
  const [loading, setLoading] = useState(true);

  const fetchBackgrounds = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/settings/backgrounds`);
      // Prepend API URL to local paths
      const processedBgs = {};
      for (const [key, value] of Object.entries(response.data)) {
        if (value.startsWith('/api/')) {
          processedBgs[key] = `${BACKEND_URL}${value}`;
        } else {
          processedBgs[key] = value;
        }
      }
      setBackgrounds(processedBgs);
    } catch (error) {
      console.error('Error fetching backgrounds:', error);
      setBackgrounds(DEFAULT_BACKGROUNDS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackgrounds();
  }, [fetchBackgrounds]);

  const refreshBackgrounds = () => {
    fetchBackgrounds();
  };

  const getBackground = (key) => {
    return backgrounds[key] || DEFAULT_BACKGROUNDS[key] || '';
  };

  const value = {
    backgrounds,
    loading,
    getBackground,
    refreshBackgrounds
  };

  return (
    <SiteSettingsContext.Provider value={value}>
      {children}
    </SiteSettingsContext.Provider>
  );
};
