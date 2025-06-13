import { useState, useEffect } from 'react';
import { 
  Code2, Plus, Users, Eye, Calendar, User, Layout, LogOut, ArrowLeft, X, Trash2, ChevronLeft, ChevronRight, UserCog 
} from 'lucide-react';
import { apiRequest } from './api';

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
};

// Delete Confirmation Modal Component
const DeleteSpaceModal = ({ 
  space, 
  setShowDeleteModal, 
  handleDeleteSpace, 
  deletingSpace 
}: {
  space: Space | null;
  setShowDeleteModal: React.Dispatch<React.SetStateAction<boolean>>;
  handleDeleteSpace: (spaceId: string) => Promise<void>;
  deletingSpace: boolean;
}) => {
  if (!space) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900/95 backdrop-blur-xl rounded-3xl p-8 border border-red-500/20 w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-white">Delete Space</h3>
          <button
            onClick={() => setShowDeleteModal(false)}
            className="text-gray-400 hover:text-white transition-all duration-300 p-2 hover:bg-white/10 rounded-xl"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="p-6 bg-red-500/10 rounded-2xl border border-red-500/30">
              <Trash2 className="h-10 w-10 text-red-400" />
            </div>
          </div>
          
          <p className="text-gray-300 text-center mb-4 text-lg">
            Are you sure you want to delete the space
          </p>
          <p className="text-2xl font-semibold text-white text-center mb-6">
            "{space.name}"?
          </p>
          <p className="text-red-300 text-sm text-center leading-relaxed">
            This action cannot be undone. All snippets and collaborators will be permanently removed.
          </p>
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setShowDeleteModal(false)}
            className="flex-1 px-6 py-4 bg-gray-700/50 text-white rounded-xl hover:bg-gray-600/50 transition-all duration-300 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() => handleDeleteSpace(space.id)}
            disabled={deletingSpace}
            className="flex-1 px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg"
          >
            {deletingSpace ? 'Deleting...' : 'Delete Space'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Create Space Modal Component
const CreateSpaceModal = ({ 
  newSpace, 
  setNewSpace, 
  setShowCreateSpace, 
  handleCreateSpace, 
  creatingSpace 
}: {
  newSpace: { name: string; description: string; isPublic: boolean };
  setNewSpace: React.Dispatch<React.SetStateAction<{ name: string; description: string; isPublic: boolean }>>;
  setShowCreateSpace: React.Dispatch<React.SetStateAction<boolean>>;
  handleCreateSpace: (e: React.FormEvent) => Promise<void>;
  creatingSpace: boolean;
}) => (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
    <div className="bg-gray-900/95 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/50 w-full max-w-md shadow-2xl">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-2xl font-bold text-white">Create New Space</h3>
        <button
          onClick={() => setShowCreateSpace(false)}
          className="text-gray-400 hover:text-white transition-all duration-300 p-2 hover:bg-white/10 rounded-xl"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <form onSubmit={handleCreateSpace} className="space-y-6">
        <div>
          <label className="block text-gray-300 text-sm font-medium mb-3">
            Space Name *
          </label>
          <input
            type="text"
            value={newSpace.name}
            onChange={(e) => setNewSpace(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter space name"
            className="w-full px-4 py-4 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all duration-300"
            required
            autoFocus
          />
        </div>

        <div>
          <label className="block text-gray-300 text-sm font-medium mb-3">
            Description
          </label>
          <textarea
            value={newSpace.description}
            onChange={(e) => setNewSpace(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe your space (optional)"
            rows={4}
            className="w-full px-4 py-4 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all duration-300 resize-none"
          />
        </div>

        <div className="flex items-center space-x-3 p-4 bg-gray-800/30 rounded-xl">
          <input
            type="checkbox"
            id="isPublic"
            checked={newSpace.isPublic}
            onChange={(e) => setNewSpace(prev => ({ ...prev, isPublic: e.target.checked }))}
            className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-purple-500 focus:ring-purple-400 focus:ring-2"
          />
          <label htmlFor="isPublic" className="text-gray-300 text-sm font-medium">
            Make this space public
          </label>
        </div>

        <div className="flex gap-4 pt-6">
          <button
            type="button"
            onClick={() => setShowCreateSpace(false)}
            className="flex-1 px-6 py-4 bg-gray-700/50 text-white rounded-xl hover:bg-gray-600/50 transition-all duration-300 font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={creatingSpace}
            className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg"
          >
            {creatingSpace ? 'Creating...' : 'Create Space'}
          </button>
        </div>
      </form>
    </div>
  </div>
);

const Dashboard = () => {
  const [user, setUser] = useState<UserMetadata | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [showCreateSpace, setShowCreateSpace] = useState(false);
  const [creatingSpace, setCreatingSpace] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [spaceToDelete, setSpaceToDelete] = useState<Space | null>(null);
  const [deletingSpace, setDeletingSpace] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Form state for creating new space
  const [newSpace, setNewSpace] = useState({
    name: '',
    description: '',
    isPublic: false
  });

  // Scroll state for spaces carousel
  const [scrollPosition, setScrollPosition] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Check if mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check authentication and fetch data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Fetch user metadata
        const userData = await apiRequest('/user/metadata');
        if (userData.metadata) {
          setUser(userData.metadata);

          // Fetch user spaces
          const spacesData = await apiRequest('/space/all');
          if (spacesData.spaces) {
            setSpaces(spacesData.spaces);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        localStorage.removeItem('token');
        window.location.href = '/';
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Update scroll buttons visibility
  useEffect(() => {
    const updateScrollButtons = () => {
      const container = document.getElementById('spaces-scroll-container');
      if (container) {
        setCanScrollLeft(container.scrollLeft > 0);
        setCanScrollRight(
          container.scrollLeft < container.scrollWidth - container.clientWidth - 10
        );
      }
    };

    const container = document.getElementById('spaces-scroll-container');
    if (container) {
      container.addEventListener('scroll', updateScrollButtons);
      updateScrollButtons(); // Initial check
      
      return () => container.removeEventListener('scroll', updateScrollButtons);
    }
  }, [spaces]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await apiRequest('/signout', { method: 'POST' });
    } catch (error) {
      console.error('Signout API call failed:', error);
    } finally {
      localStorage.removeItem('token');
      window.location.href = '/';
      setSigningOut(false);
    }
  };

  const handleGoBack = () => {
    window.location.href = '/';
  };

  const handleNavigation = (path: string) => {
    window.location.href = path;
  };

  const handleEditProfile = () => {
    if (user?.username) {
      handleNavigation(`/profile/${user.username}`);
    }
  };

  const handleCreateSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newSpace.name.trim()) {
      alert('Space name is required');
      return;
    }

    setCreatingSpace(true);
    try {
      const response = await apiRequest('/space', {
        method: 'POST',
        body: JSON.stringify(newSpace)
      });

      if (response.space) {
        setSpaces(prev => [response.space, ...prev]);
        setNewSpace({ name: '', description: '', isPublic: false });
        setShowCreateSpace(false);
      }
    } catch (error) {
      console.error('Error creating space:', error);
      alert('Failed to create space. Please try again.');
    } finally {
      setCreatingSpace(false);
    }
  };

  const handleDeleteSpace = async (spaceId: string) => {
    setDeletingSpace(true);
    try {
      await apiRequest(`/space/${spaceId}`, {
        method: 'DELETE'
      });

      // Remove space from local state
      setSpaces(prev => prev.filter(space => space.id !== spaceId));
      setShowDeleteModal(false);
      setSpaceToDelete(null);
    } catch (error) {
      console.error('Error deleting space:', error);
      alert('Failed to delete space. Please try again.');
    } finally {
      setDeletingSpace(false);
    }
  };

  const openDeleteModal = (space: Space) => {
    setSpaceToDelete(space);
    setShowDeleteModal(true);
  };

  const scrollSpaces = (direction: 'left' | 'right') => {
    const container = document.getElementById('spaces-scroll-container');
    if (container) {
      const scrollAmount = 320; // Width of one space card + gap
      const newScrollPosition = direction === 'left' 
        ? container.scrollLeft - scrollAmount
        : container.scrollLeft + scrollAmount;
      
      container.scrollTo({
        left: newScrollPosition,
        behavior: 'smooth'
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Enhanced floating geometric shapes component
  const FloatingShapes = () => (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Dark premium geometric shapes */}
      <div className="absolute top-20 left-10 animate-float-slow opacity-5">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="50" fill="url(#darkGradient1)" />
          <defs>
            <linearGradient id="darkGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#8B5CF6" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      
      <div className="absolute top-40 right-20 animate-float-medium opacity-8">
        <svg width="80" height="80" viewBox="0 0 80 80">
          <rect x="10" y="10" width="60" height="60" rx="15" fill="url(#darkGradient2)" transform="rotate(45 40 40)" />
          <defs>
            <linearGradient id="darkGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1E1B4B" />
              <stop offset="100%" stopColor="#312E81" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="absolute bottom-32 left-1/4 animate-float-fast opacity-6">
        <svg width="100" height="100" viewBox="0 0 100 100">
          <polygon points="50,15 85,75 15,75" fill="url(#darkGradient3)" />
          <defs>
            <linearGradient id="darkGradient3" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="100%" stopColor="#4B5563" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="absolute top-1/3 right-10 animate-float-slow opacity-4">
        <svg width="70" height="35" viewBox="0 0 70 35">
          <rect x="5" y="10" width="60" height="15" rx="7" fill="url(#darkGradient4)" />
          <defs>
            <linearGradient id="darkGradient4" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1F2937" />
              <stop offset="100%" stopColor="#374151" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="absolute bottom-20 right-1/3 animate-float-medium opacity-7">
        <svg width="90" height="90" viewBox="0 0 90 90">
          <rect x="15" y="15" width="60" height="60" rx="8" fill="url(#darkGradient5)" />
          <defs>
            <linearGradient id="darkGradient5" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#581C87" />
              <stop offset="100%" stopColor="#7C3AED" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-30px) rotate(180deg); }
        }
        @keyframes float-medium {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(90deg); }
        }
        @keyframes float-fast {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(45deg); }
        }
        .animate-float-slow {
          animation: float-slow 8s ease-in-out infinite;
        }
        .animate-float-medium {
          animation: float-medium 6s ease-in-out infinite;
        }
        .animate-float-fast {
          animation: float-fast 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="flex items-center space-x-3 text-white">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 border-t-white"></div>
          <span className="text-xl font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black relative">
      <FloatingShapes />
      
      {/* Header */}
      <header className="bg-gray-900/80 backdrop-blur-xl border-b border-gray-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleGoBack}
                className="flex items-center space-x-2 px-4 py-3 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-xl transition-all duration-300"
                title="Go back to home"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Back</span>
              </button>
              
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl shadow-lg">
                  <Code2 className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white">SnippetSpace</h1>
              </div>
            </div>

            <nav className="flex items-center space-x-3">
              <button
                onClick={handleEditProfile}
                className="flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-300 shadow-lg"
                title="Edit Profile"
              >
                <UserCog className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Edit Profile</span>
              </button>
              
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">
                  {signingOut ? 'Signing out...' : 'Sign out'}
                </span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        <div className="space-y-12">
          {/* Welcome Section */}
          <div className="text-center">
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
              Welcome back, 
              <span className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent ml-2">
                {user?.username}
              </span>
            </h2>
            <p className="text-xl text-gray-300 font-light">
              Manage your spaces and snippets from your premium dashboard
            </p>
          </div>

          {/* Spaces Section */}
          {spaces.length > 0 ? (
            <div className="space-y-10">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <h3 className="text-3xl font-semibold text-white">Your Spaces</h3>
                <div className="flex items-center space-x-4">
                  {/* Scroll buttons - hidden on mobile */}
                  <div className="hidden md:flex items-center space-x-2">
                    <button
                      onClick={() => scrollSpaces('left')}
                      disabled={!canScrollLeft}
                      className="p-3 bg-gray-800/60 backdrop-blur-lg rounded-xl border border-gray-600/50 hover:bg-gray-700/60 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Scroll left"
                    >
                      <ChevronLeft className="h-5 w-5 text-white" />
                    </button>
                    <button
                      onClick={() => scrollSpaces('right')}
                      disabled={!canScrollRight}
                      className="p-3 bg-gray-800/60 backdrop-blur-lg rounded-xl border border-gray-600/50 hover:bg-gray-700/60 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Scroll right"
                    >
                      <ChevronRight className="h-5 w-5 text-white" />
                    </button>
                  </div>
                  
                  <button 
                    onClick={() => setShowCreateSpace(true)}
                    className="flex items-center space-x-2 px-6 py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all duration-300 transform hover:scale-105 shadow-lg font-medium"
                  >
                    <Plus className="h-5 w-5" />
                    <span>New Space</span>
                  </button>
                </div>
              </div>

              <div className="relative overflow-hidden">
                <div 
                  id="spaces-scroll-container"
                  className="flex overflow-x-auto scrollbar-hide space-x-6 pb-6 px-2"
                >
                  <style>{`
                    .scrollbar-hide {
                      -ms-overflow-style: none;
                      scrollbar-width: none;
                    }
                    .scrollbar-hide::-webkit-scrollbar {
                      display: none;
                    }
                  `}</style>
                  
                  {spaces.map((space, index) => (
                    <div key={space.id} className="group flex-shrink-0 w-80 sm:w-96">
                      <div className="bg-gray-800/40 backdrop-blur-xl rounded-2xl p-8 border border-gray-600/30 hover:border-gray-500/50 transition-all duration-500 transform hover:scale-105 hover:shadow-2xl relative">
                        {/* Delete button - always visible on mobile, hover on desktop */}
                        <button
                          onClick={() => openDeleteModal(space)}
                          className={`absolute top-6 right-6 p-3 bg-red-600/20 backdrop-blur-sm rounded-xl border border-red-500/30 transition-all duration-300 hover:bg-red-600/30 ${
                            isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          }`}
                          title="Delete space"
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </button>

                        <div className={`h-1.5 w-full rounded-full mb-6 ${
                          index % 3 === 0 ? 'bg-gradient-to-r from-purple-500 to-purple-700' :
                          index % 3 === 1 ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                          'bg-gradient-to-r from-emerald-500 to-teal-500'
                        }`}></div>
                        
                        <div className="flex justify-between items-start mb-6 pr-16">
                          <h4 className="text-2xl font-semibold text-white group-hover:text-purple-300 transition-colors truncate">
                            {space.name}
                          </h4>
                          <span className={`px-4 py-2 rounded-xl text-sm font-medium backdrop-blur-sm flex-shrink-0 ${
                            space.isPublic
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                          }`}>
                            {space.isPublic ? 'Public' : 'Private'}
                          </span>
                        </div>

                        <p className="text-gray-300 mb-8 line-clamp-3 min-h-[4.5rem] leading-relaxed">
                          {space.description}
                        </p>

                        <div className="flex justify-between items-center text-sm text-gray-400 mb-6">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4" />
                            <span className="font-medium">{formatDate(space.createdAt)}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Eye className="h-4 w-4" />
                            <span className="font-medium">{space.totalViews}</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-6 border-t border-gray-600/40">
                          <div className="flex space-x-6 text-sm text-gray-300">
                            <span className="flex items-center space-x-2">
                              <Code2 className="h-4 w-4" />
                              <span className="font-medium">{space._count.snippets}</span>
                            </span>
                            <span className="flex items-center space-x-2">
                              <Users className="h-4 w-4" />
                              <span className="font-medium">{space._count.collaborators + 1}</span>
                            </span>
                          </div>
                          <button
                            onClick={() => handleNavigation(`/space/${space.id}`)}
                            className="text-purple-400 hover:text-purple-300 font-semibold transition-colors flex items-center space-x-2 group/btn"
                          >
                            <span>Open</span>
                            <span className="transform transition-transform group-hover/btn:translate-x-1">→</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="group flex-shrink-0 w-80 sm:w-96">
                    <button
                      onClick={() => setShowCreateSpace(true)}
                      className="bg-gray-800/20 backdrop-blur-xl rounded-2xl p-8 border-2 border-dashed border-gray-600/40 hover:border-gray-500/60 transition-all duration-500 transform hover:scale-105 flex flex-col items-center justify-center h-full min-h-[400px] w-full"
                    >
                      <div className="p-6 bg-gradient-to-r from-purple-600/20 to-purple-700/20 rounded-2xl mb-6 border border-purple-500/30">
                        <Plus className="h-10 w-10 text-white" />
                      </div>
                      <h4 className="text-xl font-semibold text-white mb-3">Create New Space</h4>
                      <p className="text-sm text-gray-400 text-center leading-relaxed">Start organizing your code snippets</p>
                    </button>
                  </div>
                </div>

                {/* Fade effects - enhanced for premium look */}
                <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-gray-900 via-gray-900/80 to-transparent pointer-events-none z-10"></div>
                <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-gray-900 via-gray-900/80 to-transparent pointer-events-none z-10"></div>
              </div>
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="p-8 bg-gradient-to-r from-purple-600/20 to-purple-700/20 rounded-3xl w-32 h-32 mx-auto mb-8 flex items-center justify-center border border-purple-500/30">
                <Layout className="h-16 w-16 text-white" />
              </div>
              <h3 className="text-4xl font-semibold text-white mb-6">No spaces yet</h3>
              <p className="text-gray-300 mb-10 text-lg leading-relaxed">Create your first space to start organizing your code snippets</p>
              <button 
                onClick={() => setShowCreateSpace(true)}
                className="px-10 py-5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-300 transform hover:scale-105 shadow-lg text-lg font-semibold"
              >
                Create Your First Space
              </button>
            </div>
          )}
        </div>
      </main>

      <footer className="bg-gray-900/60 backdrop-blur-xl border-t border-gray-700/50 mt-20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="text-center text-gray-400">
            <p className="text-lg font-light">&copy; 2025 SnippetSpace. Built for developers, by developers.</p>
          </div>
        </div>
      </footer>

      {/* Create Space Modal */}
      {showCreateSpace && (
        <CreateSpaceModal
          newSpace={newSpace}
          setNewSpace={setNewSpace}
          setShowCreateSpace={setShowCreateSpace}
          handleCreateSpace={handleCreateSpace}
          creatingSpace={creatingSpace}
        />
      )}

      {/* Delete Space Modal */}
      {showDeleteModal && (
        <DeleteSpaceModal
          space={spaceToDelete}
          setShowDeleteModal={setShowDeleteModal}
          handleDeleteSpace={handleDeleteSpace}
          deletingSpace={deletingSpace}
        />
      )}
    </div>
  );
};

export default Dashboard;
