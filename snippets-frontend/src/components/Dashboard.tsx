import { useState, useEffect } from 'react';
import { Code2, Plus, Users, Eye, Calendar, User, Layout, LogOut, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { Link } from 'react-router-dom';
import axios from 'axios';

type Space = {
  id: string;
  name: string;
  description: string;
  isPublic: boolean;
  createdAt: string;
  totalViews: number;
  _count: {
    snippets: number;
    collaborators: number;
  };
};

type UserMetadata = {
  username: string;
  // add other properties if needed
};

const Dashboard = () => {
  const [user, setUser] = useState<UserMetadata | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  const navigate = useNavigate();
  const { logout } = useAuth();

  // Check authentication and fetch data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Fetch user metadata
        const userResponse = await axios.get('http://localhost:3000/api/v1/user/metadata', {
          timeout: 5000,
        });

        if (userResponse.status === 200 && userResponse.data.metadata) {
          setUser(userResponse.data.metadata);

          // Fetch user spaces
          const spacesResponse = await axios.get('http://localhost:3000/api/v1/space/all', {
            timeout: 5000,
          });

          if (spacesResponse.status === 200 && spacesResponse.data.spaces) {
            setSpaces(spacesResponse.data.spaces);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        // Handle error appropriately - maybe redirect to login
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      // Call backend signout endpoint
      await axios.post('http://localhost:3000/api/v1/signout');
    } catch (error) {
      console.error('Signout API call failed:', error);
      // Continue with frontend signout even if backend call fails
    } finally {
      // Call the logout function from auth context (clears localStorage and state)
      logout();
      // Navigate to home page
      navigate('/');
      setSigningOut(false);
    }
  };

  const handleGoBack = () => {
    navigate('/');
  };

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-green-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleGoBack}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="Go back to home"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back</span>
              </button>
              <div className="flex items-center space-x-2">
                <Code2 className="h-8 w-8 text-green-600" />
                <h1 className="text-2xl font-bold text-gray-800">SnippetSpace</h1>
              </div>
            </div>

            <nav className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-gray-600">
                <User className="h-4 w-4" />
                <span className="text-sm">Welcome, {user?.username || 'User'}</span>
              </div>
              <button
                onClick={() => handleNavigation('/dashboard')}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Layout className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </button>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {signingOut ? 'Signing out...' : 'Sign out'}
                </span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Dashboard Content for Authenticated Users */}
        <div>
          <div className="mb-8">
            <h2 className="text-4xl font-bold text-gray-800 mb-2">
              Welcome back, <span className="text-green-600">{user?.username}</span>
            </h2>
            <p className="text-xl text-gray-600">
              Manage your spaces and snippets from your dashboard
            </p>
          </div>

          {spaces.length > 0 ? (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-semibold text-gray-800">Your Spaces</h3>
                <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                  <Plus className="h-4 w-4" />
                  <span>New Space</span>
                </button>
              </div>

              <div className="relative">
                <div className="flex overflow-x-auto scrollbar-hide space-x-6 pb-4 px-2">
                  <style>{`
                    .scrollbar-hide {
                      -ms-overflow-style: none;
                      scrollbar-width: none;
                    }
                    .scrollbar-hide::-webkit-scrollbar {
                      display: none;
                    }
                    .space-card {
                      background: linear-gradient(145deg, rgba(255,255,255,0.7), rgba(255,255,255,0.4));
                      backdrop-filter: blur(10px);
                      border: 1px solid rgba(34, 197, 94, 0.2);
                      box-shadow: 0 8px 32px rgba(34, 197, 94, 0.1);
                      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    }
                    .space-card:hover {
                      transform: translateY(-4px);
                      box-shadow: 0 20px 40px rgba(34, 197, 94, 0.2);
                      border-color: rgba(34, 197, 94, 0.4);
                    }
                    .space-card::before {
                      content: '';
                      position: absolute;
                      top: 0;
                      left: 0;
                      right: 0;
                      height: 2px;
                      background: linear-gradient(90deg, #10b981, #34d399, #6ee7b7);
                      opacity: 0;
                      transition: opacity 0.3s ease;
                    }
                    .space-card:hover::before {
                      opacity: 1;
                    }
                  `}</style>
                  {spaces.map((space) => (
                    <div key={space.id} className="space-card relative flex-shrink-0 w-80 rounded-xl p-6 cursor-pointer">
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="text-xl font-semibold text-gray-800 truncate pr-2">{space.name}</h4>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${space.isPublic
                            ? 'bg-green-100/80 text-green-800 border border-green-200/50'
                            : 'bg-gray-100/80 text-gray-800 border border-gray-200/50'
                          }`}>
                          {space.isPublic ? 'Public' : 'Private'}
                        </span>
                      </div>

                      <p className="text-gray-600 mb-4 line-clamp-2 min-h-[2.5rem]">{space.description}</p>

                      <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(space.createdAt)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Eye className="h-4 w-4" />
                          <span>{space.totalViews}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-4 border-t border-green-100/50">
                        <div className="flex space-x-4 text-sm text-gray-600">
                          <span className="flex items-center space-x-1">
                            <Code2 className="h-3 w-3" />
                            <span>{space._count.snippets}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Users className="h-3 w-3" />
                            <span>{space._count.collaborators}</span>
                          </span>
                        </div>
                        <Link
                          to={`/space/${space.id}`}
                          className="text-green-600 hover:text-green-700 font-medium transition-colors flex items-center space-x-1 group"
                        >
                          <span>Open</span>
                          <span className="transform transition-transform group-hover:translate-x-1">→</span>
                        </Link>
                      </div>
                    </div>
                  ))}

                  {/* Add New Space Card */}
                  <div className="space-card relative flex-shrink-0 w-80 rounded-xl p-6 cursor-pointer border-2 border-dashed border-green-300 bg-gradient-to-br from-green-50/50 to-emerald-50/50 hover:from-green-100/50 hover:to-emerald-100/50 flex flex-col items-center justify-center">
                    <Plus className="h-12 w-12 text-green-400 mb-4" />
                    <h4 className="text-lg font-medium text-gray-700 mb-2">Create New Space</h4>
                    <p className="text-sm text-gray-500 text-center">Start organizing your code snippets</p>
                  </div>
                </div>

                {/* Scroll indicators */}
                <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-green-50 to-transparent pointer-events-none"></div>
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-green-50 to-transparent pointer-events-none"></div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Layout className="h-16 w-16 text-green-300 mx-auto mb-4" />
              <h3 className="text-2xl font-semibold text-gray-800 mb-2">No spaces yet</h3>
              <p className="text-gray-600 mb-6">Create your first space to start organizing your code snippets</p>
              <button className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                Create Your First Space
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white/60 backdrop-blur-sm border-t border-green-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>&copy; 2025 SnippetSpace. Built for developers, by developers.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;