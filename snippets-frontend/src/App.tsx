import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Space from './components/Space';
import Login from './components/Login';
import Signup from './components/Signup';
import WelcomePage from './components/WelcomePage';
import Dashboard from './components/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import SpaceAnalytics from './components/SpaceAnalytics';

// Authentication context 
const AuthContext = React.createContext<{
  isAuthenticated: boolean;
  user: any;
  login: (username: string, password: string) => Promise<boolean>;
  signup: (username: string, password: string, confirmPassword: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}>({
  isAuthenticated: false,
  user: null,
  login: async () => false,
  signup: async () => false,
  logout: () => { },
  checkAuth: async () => { }
});

export const useAuth = () => React.useContext(AuthContext);

// Axios interceptor to add JWT token to requests
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Axios interceptor to handle token expiration
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token is invalid or expired
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth Provider with JWT token handling
const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean>(false);
  const [user, setUser] = React.useState<any>(null);
  const [loading, setLoading] = React.useState<boolean>(true);

  // Check if user is authenticated by validating JWT token
  const checkAuth = React.useCallback(async () => {
    try {
      const token = localStorage.getItem('token');

      if (!token) {
        setIsAuthenticated(false);
        setUser(null);
        setLoading(false);
        return;
      }

      // Check if there's a valid session by calling the metadata endpoint
      const response = await axios.get('http://localhost:3000/api/v1/user/metadata', {
        timeout: 5000,
      });

      if (response.status === 200 && response.data.metadata) {
        setIsAuthenticated(true);
        setUser(response.data.metadata);
      } else {
        setIsAuthenticated(false);
        setUser(null);
        localStorage.removeItem('token');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
      setUser(null);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  }, []);

  // Check authentication on app load
  React.useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await axios.post('http://localhost:3000/api/v1/signin', {
        username,
        password
      });

      if (response.status === 200 && response.data.token) {
        // Store JWT token in localStorage
        localStorage.setItem('token', response.data.token);

        // Re-check auth to get user data
        await checkAuth();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const signup = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await axios.post('http://localhost:3000/api/v1/signup', {
        username,
        password
      });

      if ((response.status === 200 || response.status === 201) && response.data.token) {
        // Store JWT token in localStorage
        localStorage.setItem('token', response.data.token);

        // Re-check auth to get user data
        await checkAuth();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Signup failed:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      // Call logout endpoint if available (optional)
      await axios.post('http://localhost:3000/api/v1/logout');
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      // Clear JWT token and local state
      localStorage.removeItem('token');
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="flex items-center space-x-2 text-green-600">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <span className="text-lg font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, signup, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<WelcomePage />} />
            <Route path="/welcome" element={<WelcomePage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/space/:spaceId/analytics" element={<ProtectedRoute><SpaceAnalytics/></ProtectedRoute>} />
            {/* Protected routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/space/:spaceId" element={
              <ProtectedRoute>
                <Space />
              </ProtectedRoute>
            } />

            {/* Catch all route - redirect to welcome page */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;