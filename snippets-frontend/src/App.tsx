import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Space from './components/Space';
import WelcomePage from './components/WelcomePage';
import Dashboard from './components/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import SpaceAnalytics from './components/SpaceAnalytics';
import UnifiedAuth from './components/unifiedAuth';
import ProfilePage from './components/Profile';
import AdminLayout from './admin/components/layout/AdminLayout';
import AdminDashboard from './admin/pages/Dashboard';
import Users from './admin/pages/Users';
import Spaces from './admin/pages/Spaces';
import Snippets from './admin/pages/Snippets';
import Analytics from './admin/pages/Analytics';

// Enhanced Authentication Context Interface
interface AuthContextType {
  isAuthenticated: boolean;
  user: any;
  loading: boolean;
  authError: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  signup: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  clearAuthError: () => void;
}

// Authentication context with enhanced error handling
const AuthContext = React.createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  loading: true,
  authError: null,
  login: async () => false,
  signup: async () => false,
  logout: () => {},
  checkAuth: async () => {},
  clearAuthError: () => {}
});

export const useAuth = () => React.useContext(AuthContext);

// Enhanced Axios interceptors with proper React Router integration
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

// Improved response interceptor to prevent infinite redirects
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only redirect if not already on auth page to prevent loops
      if (window.location.pathname !== '/auth') {
        localStorage.removeItem('token');
        // Use React Router navigation when possible, fallback to window.location
        if (window.history && window.history.pushState) {
          window.history.pushState(null, '', '/auth');
        } else {
          window.location.href = '/auth';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Enhanced Auth Provider with comprehensive error handling
const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean>(false);
  const [user, setUser] = React.useState<any>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [authError, setAuthError] = React.useState<string | null>(null);

  // Validate environment variables
  const API_BASE_URL = React.useMemo(() => {
    const url = import.meta.env.VITE_HTTP_URL;
    if (!url) {
      console.error('VITE_HTTP_URL environment variable is not defined');
      setAuthError('Configuration error: API URL not found');
      return null;
    }
    return url;
  }, []);

  // Enhanced authentication check with proper error handling
  const checkAuth = React.useCallback(async () => {
    if (!API_BASE_URL) {
      setLoading(false);
      return;
    }

    try {
      setAuthError(null);
      const token = localStorage.getItem('token');

      if (!token) {
        setIsAuthenticated(false);
        setUser(null);
        setLoading(false);
        return;
      }

      // Temporarily set authenticated while validating to prevent flickering
      const response = await axios.get(`${API_BASE_URL}/api/v1/user/metadata`, {
        timeout: 10000, // Increased timeout for better reliability
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 200 && response.data.metadata) {
        setIsAuthenticated(true);
        setUser(response.data.metadata);
      } else {
        throw new Error('Invalid authentication response');
      }
    } catch (error) {
      console.error('Authentication check failed:', error);
      setIsAuthenticated(false);
      setUser(null);
      localStorage.removeItem('token');
      
      // Set user-friendly error messages
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          setAuthError('Connection timeout. Please check your internet connection.');
        } else if (error.message.includes('Network Error')) {
          setAuthError('Network error. Please try again.');
        } else {
          setAuthError('Authentication failed. Please log in again.');
        }
      }
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL]);

  // Check authentication on app load and handle storage changes
  React.useEffect(() => {
    checkAuth();

    // Listen for storage changes (cross-tab synchronization)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token') {
        if (e.newValue === null) {
          // Token removed
          setIsAuthenticated(false);
          setUser(null);
        } else if (e.newValue && !isAuthenticated) {
          // Token added in another tab
          checkAuth();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [checkAuth, isAuthenticated]);

  // Enhanced login with proper error handling
  const login = async (username: string, password: string): Promise<boolean> => {
    if (!API_BASE_URL) {
      setAuthError('Configuration error: Cannot connect to server');
      return false;
    }

    try {
      setAuthError(null);
      setLoading(true);

      const response = await axios.post(`${API_BASE_URL}/api/v1/signin`, {
        username,
        password
      }, {
        timeout: 10000
      });

      if (response.status === 200 && response.data.token) {
        localStorage.setItem('token', response.data.token);
        await checkAuth();
        return true;
      }
      
      setAuthError('Invalid login response from server');
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          setAuthError('Invalid username or password');
        } else if (error.response && typeof error.response.status === 'number' && error.response.status >= 500) {
          setAuthError('Server error. Please try again later.');
        } else if (error.code === 'ECONNABORTED') {
          setAuthError('Request timeout. Please check your connection.');
        } else {
          setAuthError('Login failed. Please try again.');
        }
      } else {
        setAuthError('Network error. Please check your connection.');
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Enhanced signup with validation
  const signup = async (username: string, password: string): Promise<boolean> => {
    if (!API_BASE_URL) {
      setAuthError('Configuration error: Cannot connect to server');
      return false;
    }

    try {
      setAuthError(null);
      setLoading(true);

      const response = await axios.post(`${API_BASE_URL}/api/v1/signup`, {
        username,
        password,
        name: username
      }, {
        timeout: 10000
      });

      if ((response.status === 200 || response.status === 201) && response.data.userId) {
        return true;
      }
      
      setAuthError('Signup failed. Please try again.');
      return false;
    } catch (error) {
      console.error('Signup failed:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 409) {
          setAuthError('Username already exists. Please choose a different one.');
        } else if (error.response?.status === 400) {
          setAuthError('Invalid input. Please check your details.');
        } else if (typeof error.response?.status === 'number' && error.response.status >= 500) {
          setAuthError('Server error. Please try again later.');
        } else {
          setAuthError('Signup failed. Please try again.');
        }
      } else {
        setAuthError('Network error. Please check your connection.');
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Enhanced logout with cleanup
  const logout = async () => {
    try {
      if (API_BASE_URL) {
        await axios.post(`${API_BASE_URL}/api/v1/logout`, {}, {
          timeout: 5000
        });
      }
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      localStorage.removeItem('token');
      setIsAuthenticated(false);
      setUser(null);
      setAuthError(null);
    }
  };

  const clearAuthError = () => {
    setAuthError(null);
  };

  // Enhanced loading state with error handling
  if (loading && !authError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-300 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4 text-green-600">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
          <span className="text-lg font-medium">Verifying authentication...</span>
          <div className="text-sm text-gray-600">Please wait while we check your login status</div>
        </div>
      </div>
    );
  }

  // Error state with retry option
  if (authError && loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-red-600 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Error</h2>
            <p className="text-gray-600 mb-6">{authError}</p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  clearAuthError();
                  checkAuth();
                }}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      user, 
      loading,
      authError,
      login, 
      signup, 
      logout, 
      checkAuth,
      clearAuthError
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Main App component with enhanced routing
function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Admin routes with nested routing */}
            <Route path="/admin/*" element={
              <ProtectedRoute requireAdmin={true}>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<Users />} />
              <Route path="spaces" element={<Spaces />} />
              <Route path="snippets" element={<Snippets />} />
              <Route path="analytics" element={<Analytics />} />
            </Route>
            
            {/* Public routes */}
            <Route path="/" element={<WelcomePage />} />
            <Route path="/welcome" element={<WelcomePage />} />
            <Route path="/auth" element={<UnifiedAuth />} />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/profile/:username" element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } />
            <Route path="/space/:spaceId" element={
              <ProtectedRoute>
                <Space />
              </ProtectedRoute>
            } />
            <Route path="/space/:spaceId/analytics" element={
              <ProtectedRoute>
                <SpaceAnalytics />
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
