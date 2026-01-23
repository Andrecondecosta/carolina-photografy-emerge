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

// Default backgrounds (fallback) - Fine art wedding photography style
const DEFAULT_BACKGROUNDS = {
  hero: "https://images.unsplash.com/photo-1768611264978-92918fa8e8c3?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA0MTJ8MHwxfHNlYXJjaHwyfHxmaW5lJTIwYXJ0JTIwd2VkZGluZyUyMHBob3RvZ3JhcGh5JTIwZ29sZGVuJTIwaG91ciUyMHJvbWFudGljJTIwY291cGxlfGVufDB8fHx8MTc2OTE3NzI1OHww&ixlib=rb-4.1.0&q=85",
  login: "https://images.unsplash.com/photo-1763539818420-165e69b7489b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODF8MHwxfHNlYXJjaHwxfHxyb21hbnRpYyUyMHBvcnRyYWl0JTIwd29tYW4lMjBzb2Z0JTIwbGlnaHQlMjBlZGl0b3JpYWx8ZW58MHx8fHwxNzY5MTc3MjY3fDA&ixlib=rb-4.1.0&q=85",
  register: "https://images.unsplash.com/photo-1769050351773-925862f14c38?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA0MTJ8MHwxfHNlYXJjaHwzfHxmaW5lJTIwYXJ0JTIwd2VkZGluZyUyMHBob3RvZ3JhcGh5JTIwZ29sZGVuJTIwaG91ciUyMHJvbWFudGljJTIwY291cGxlfGVufDB8fHx8MTc2OTE3NzI1OHww&ixlib=rb-4.1.0&q=85",
  gallery1: "https://images.unsplash.com/photo-1589144044802-567f743dd649?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA0MTJ8MHwxfHNlYXJjaHwxfHxmaW5lJTIwYXJ0JTIwd2VkZGluZyUyMHBob3RvZ3JhcGh5JTIwZ29sZGVuJTIwaG91ciUyMHJvbWFudGljJTIwY291cGxlfGVufDB8fHx8MTc2OTE3NzI1OHww&ixlib=rb-4.1.0&q=85",
  gallery2: "https://images.unsplash.com/photo-1763539818703-309e93c5e394?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODF8MHwxfHNlYXJjaHwyfHxyb21hbnRpYyUyMHBvcnRyYWl0JTIwd29tYW4lMjBzb2Z0JTIwbGlnaHQlMjBlZGl0b3JpYWx8ZW58MHx8fHwxNzY5MTc3MjY3fDA&ixlib=rb-4.1.0&q=85",
  gallery3: "https://images.unsplash.com/photo-1768611261082-3aa003bd4d29?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA0MTJ8MHwxfHNlYXJjaHw0fHxmaW5lJTIwYXJ0JTIwd2VkZGluZyUyMHBob3RvZ3JhcGh5JTIwZ29sZGVuJTIwaG91ciUyMHJvbWFudGljJTIwY291cGxlfGVufDB8fHx8MTc2OTE3NzI1OHww&ixlib=rb-4.1.0&q=85",
  gallery4: "https://images.pexels.com/photos/20743407/pexels-photo-20743407.jpeg"
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
