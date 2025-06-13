// hooks/useDarkMode.js
import { useState, useEffect } from 'react';

const useDarkMode = () => {
  // Initialize state from localStorage or default to false
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const savedMode = localStorage.getItem('isDarkMode');
      return savedMode ? JSON.parse(savedMode) : false;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return false;
    }
  });

  // Update localStorage and document class when state changes
  useEffect(() => {
    try {
      localStorage.setItem('isDarkMode', JSON.stringify(isDarkMode));
      
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((prevMode: any) => !prevMode);
  };

  return [isDarkMode, toggleDarkMode];
};

export default useDarkMode;
