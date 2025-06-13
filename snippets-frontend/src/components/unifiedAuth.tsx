import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

const UnifiedAuth: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSignup, setShowSignup] = useState(false);

  const { login, signup, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const validateForm = () => {
    if (!username.trim()) {
      setError('Username is required');
      return false;
    }
    if (!password.trim()) {
      setError('Password is required');
      return false;
    }
    if (showSignup && password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);

    try {
      let success = false;
      
      if (showSignup) {
        // Call signup with username and password
        success = await signup(username, password);
        
        if (success) {
          // Store the credentials temporarily and switch to login mode
          sessionStorage.setItem('signupUsername', username);
          setShowSignup(false);
          setPassword('');
          setError('Account created successfully! Please sign in with your credentials.');
        } else {
          setError('Signup failed. Please try again.');
        }
      } else {
        success = await login(username, password);
        
        if (success) {
          navigate('/dashboard');
        } else {
          setError('Invalid username or password');
        }
      }
      
    } catch (err: any) {
      console.error(showSignup ? 'Signup error:' : 'Login error:', err);
      
      // Show specific error message from backend if available
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setShowSignup(!showSignup);
    setError('');
    
    // Pre-fill username if user just signed up
    const signupUsername = sessionStorage.getItem('signupUsername');
    if (!showSignup && signupUsername) {
      setUsername(signupUsername);
      sessionStorage.removeItem('signupUsername');
    } else {
      setUsername('');
    }
    setPassword('');
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left side - Auth form */}
      <div className="flex-1 flex items-center justify-center bg-white px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="max-w-md w-full space-y-6 lg:space-y-8">
          {/* Logo */}
          <div className="flex items-center space-x-2 mb-6 lg:mb-8">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <span className="text-lg sm:text-xl font-bold text-gray-900">Brand</span>
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              {showSignup ? 'Create your account' : 'Welcome back!'}
            </h2>
            <p className="text-sm sm:text-base text-gray-600">
              {showSignup ? 'Sign up to get started' : 'Sign in to continue to your account'}
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {error && (
              <div className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-xs sm:text-sm border ${
                error.includes('successfully') 
                  ? 'bg-green-50 border-green-200 text-green-700' 
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                {error}
              </div>
            )}
            
            <div>
              <label htmlFor="username" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="Enter your username"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={showSignup ? "new-password" : "current-password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="Enter your password"
              />
              {showSignup && (
                <p className="text-xs text-gray-500 mt-1">Password must be at least 6 characters long</p>
              )}
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2 sm:py-3 px-4 rounded-lg text-sm sm:text-base font-medium hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02]"
            >
              {loading ? (showSignup ? 'Creating account...' : 'Signing in...') : (showSignup ? 'Create account' : 'Sign in')}
            </button>
          </form>

          <div className="text-center">
            <p className="text-xs sm:text-sm text-gray-600">
              {showSignup ? "Already have an account? " : "Don't have an account? "}
              <button 
                type="button" 
                onClick={toggleMode}
                className="font-medium text-purple-600 hover:text-purple-500"
              >
                {showSignup ? 'Sign in here' : 'Register here'}
              </button>
            </p>
            {showSignup && (
              <div className="text-xs text-gray-500 mt-2 px-2">
                By creating an account, you agree to our Terms of Service and Privacy Policy.
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Right side - Geometric design */}
      <div className="flex-1 relative bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 overflow-hidden min-h-[300px] lg:min-h-screen">
        <div className="absolute inset-0">
          {/* Large circle */}
          <div className="absolute top-1/4 right-1/4 w-40 h-40 sm:w-60 sm:h-60 lg:w-80 lg:h-80 bg-gradient-to-br from-pink-400 to-purple-600 rounded-full opacity-20"></div>
          
          {/* Triangle */}
          <div className="absolute top-1/3 left-1/4 w-0 h-0 border-l-[30px] border-l-transparent border-r-[30px] border-r-transparent border-b-[50px] border-b-cyan-400 opacity-80 sm:border-l-[45px] sm:border-r-[45px] sm:border-b-[75px] lg:border-l-[60px] lg:border-r-[60px] lg:border-b-[100px]"></div>
          
          {/* Small circles */}
          <div className="absolute top-1/2 right-1/3 w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-yellow-400 rounded-full"></div>
          <div className="absolute bottom-1/3 left-1/3 w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 bg-green-400 rounded-full opacity-70"></div>
          
          {/* Rectangles */}
          <div className="absolute top-2/3 right-1/4 w-16 h-10 sm:w-20 sm:h-12 lg:w-24 lg:h-16 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-lg transform rotate-12"></div>
          <div className="absolute bottom-1/4 left-1/4 w-20 h-4 sm:w-24 sm:h-6 lg:w-32 lg:h-8 bg-pink-400 rounded-full transform -rotate-12"></div>
          
          {/* Diamond shapes */}
          <div className="absolute top-1/4 left-1/2 w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-orange-400 transform rotate-45"></div>
          <div className="absolute bottom-1/2 right-1/2 w-6 h-6 lg:w-8 lg:h-8 bg-purple-300 transform rotate-45"></div>
          
          {/* Curved lines */}
          <svg className="absolute bottom-1/4 right-1/3 w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 text-cyan-300 opacity-60" fill="none" viewBox="0 0 100 100">
            <path d="M20 80 Q50 20 80 80" stroke="currentColor" strokeWidth="3" fill="none"/>
          </svg>
          
          {/* Grid pattern */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="grid grid-cols-3 gap-1 sm:gap-2 opacity-30">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="w-2 h-2 sm:w-3 sm:h-3 bg-white rounded-full"></div>
              ))}
            </div>
          </div>
          
          {/* Abstract shapes */}
          <div className="absolute top-3/4 left-1/2 w-12 h-3 sm:w-16 sm:h-4 lg:w-20 lg:h-6 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full transform -rotate-45 opacity-80"></div>
          
          {/* Wave pattern */}
          <div className="absolute bottom-0 left-0 right-0 h-16 sm:h-24 lg:h-32 bg-gradient-to-t from-indigo-900 to-transparent">
            <svg className="absolute bottom-0 w-full h-8 sm:h-12 lg:h-16" viewBox="0 0 400 100" fill="none">
              <path d="M0 50 Q100 20 200 50 T400 50 V100 H0 V50Z" fill="rgba(59, 130, 246, 0.3)"/>
            </svg>
          </div>
        </div>
        
        {/* Overlay content */}
        <div className="relative z-10 h-full flex items-center justify-center p-6 sm:p-8 lg:p-12">
          <div className="text-center text-white">
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-4">Join Our Community</h3>
            <p className="text-base sm:text-lg lg:text-xl opacity-90 max-w-sm lg:max-w-md">
              Connect with millions of users and explore endless possibilities
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedAuth;
