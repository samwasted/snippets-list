import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiRequest } from './api'; // Adjust path as needed

// TypeScript interfaces
interface User {
  id: string;
  username: string;
  name: string;
  role: string;
  createdAt: string;
}

interface Space {
  id: string;
  name: string;
  description: string;
  isPublic: boolean;
  totalViews: number;
  createdAt: string;
  _count: {
    snippets: number;
    collaborators?: number;
    views?: number;
  };
}

const ProfilePage: React.FC = () => {
  const { username } = useParams();
  const navigate = useNavigate();

  // State management
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [publicSpaces, setPublicSpaces] = useState<Space[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', username: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (username) {
      fetchProfileData();
    }
  }, [username]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch current user metadata
      const currentUserResponse = await apiRequest('/user/metadata');
      setCurrentUser(currentUserResponse.metadata);

      // Fetch profile user by username
      const profileResponse = await apiRequest(`/user/profile/${username}`);
      setProfileUser(profileResponse.user);
      setEditForm({
        name: profileResponse.user.name,
        username: profileResponse.user.username
      });

      // Fetch user's public spaces
      const spacesResponse = await apiRequest(`/user/${profileResponse.user.id}/spaces/public`);
      setPublicSpaces(spacesResponse.spaces || []);
    } catch (error) {
      console.error('Error fetching profile data:', error);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    if (isEditing) {
      // Reset form when canceling
      setEditForm({
        name: profileUser?.name || '',
        username: profileUser?.username || ''
      });
    }
  };

  const handleSaveProfile = async () => {
    try {
      await apiRequest('/user/metadata', {
        method: 'POST',
        body: JSON.stringify(editForm)
      });

      // Update local state
      setProfileUser(prev => prev ? { ...prev, ...editForm } : null);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile');
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isCurrentUser = currentUser?.id === profileUser?.id;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center relative overflow-hidden">
        <FloatingGeometry />
        <div className="text-center text-white relative z-10">
          <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-xl font-light tracking-wide">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center relative overflow-hidden">
        <FloatingGeometry />
        <div className="text-center text-white relative z-10">
          <div className="w-20 h-20 bg-red-500/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 mx-auto">
            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-xl font-light mb-6">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-8 py-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl hover:bg-white/20 transition-all duration-300 font-medium"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black relative overflow-hidden">
      {/* Floating Geometric Background */}
      <FloatingGeometry />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        {/* Back Button */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)} // This navigates to the previous page in history
            className="inline-flex items-center px-6 py-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl hover:bg-white/20 transition-all duration-300 font-medium group"
          >
            <svg className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        </div>


        {/* Profile Header */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 lg:p-12 mb-8 shadow-2xl">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="w-36 h-36 rounded-3xl bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 flex items-center justify-center text-white text-5xl font-bold shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                <span className="relative z-10">{profileUser?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-grow text-center lg:text-left">
              {isEditing ? (
                <div className="space-y-6">
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full text-3xl font-bold bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-6 py-4 text-white placeholder-white/60 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50 transition-all"
                    placeholder="Full Name"
                  />
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    className="w-full text-xl bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-6 py-4 text-white placeholder-white/60 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50 transition-all"
                    placeholder="Username"
                  />
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={handleSaveProfile}
                      className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={handleEditToggle}
                      className="px-8 py-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl hover:bg-white/20 transition-all duration-300 font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-4xl lg:text-5xl font-bold text-white mb-3 tracking-tight">{profileUser?.name}</h1>
                  <p className="text-2xl text-purple-300 font-medium mb-4">@{profileUser?.username}</p>
                  <p className="text-white/70 text-lg mb-6 font-light">
                    Joined {profileUser && formatDate(profileUser.createdAt)}
                  </p>
                  {isCurrentUser && (
                    <button
                      onClick={handleEditToggle}
                      className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 font-semibold"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit Profile
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Public Spaces Section */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 lg:p-12 shadow-2xl">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
            <h2 className="text-3xl font-bold text-white tracking-tight">
              {isCurrentUser ? 'Your Public Spaces' : `${profileUser?.name}'s Public Spaces`}
            </h2>

          </div>

          <HorizontalScroll>
            {publicSpaces.length > 0 ? (
              publicSpaces.map((space) => (
                <SpaceCard key={space.id} space={space} />
              ))
            ) : (
              <div className="flex items-center justify-center py-20 text-white/60 w-full">
                <div className="text-center">
                  <div className="w-24 h-24 bg-white/10 backdrop-blur-sm rounded-3xl flex items-center justify-center mb-6 mx-auto">
                    <svg className="w-12 h-12 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  </div>
                  <p className="text-2xl font-light">No public spaces yet</p>
                </div>
              </div>
            )}
          </HorizontalScroll>
        </div>
      </div>
    </div>
  );
};

// Horizontal Scrolling Component
const HorizontalScroll: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  useEffect(() => {
    checkScrollability();
    window.addEventListener('resize', checkScrollability);
    return () => window.removeEventListener('resize', checkScrollability);
  }, [children]);

  const checkScrollability = () => {
    const container = scrollRef.current;
    if (container) {
      setShowLeftArrow(container.scrollLeft > 0);
      setShowRightArrow(
        container.scrollLeft < container.scrollWidth - container.clientWidth
      );
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollRef.current;
    const scrollAmount = 320;
    if (container) {
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
      setTimeout(checkScrollability, 300);
    }
  };

  return (
    <div className="relative">
      {showLeftArrow && (
        <button
          className="absolute left-4 top-1/2 transform -translate-y-1/2 z-20 bg-white/10 backdrop-blur-sm hover:bg-white/20 border border-white/20 shadow-xl rounded-2xl w-12 h-12 flex items-center justify-center text-white hover:text-white transition-all duration-300"
          onClick={() => scroll('left')}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      <div
        className="flex gap-6 overflow-x-auto scrollbar-hide py-4 scroll-smooth px-4"
        ref={scrollRef}
        onScroll={checkScrollability}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {children}
      </div>

      {showRightArrow && (
        <button
          className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 bg-white/10 backdrop-blur-sm hover:bg-white/20 border border-white/20 shadow-xl rounded-2xl w-12 h-12 flex items-center justify-center text-white hover:text-white transition-all duration-300"
          onClick={() => scroll('right')}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Gradient fade effects */}
      <div className={`absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-slate-900/80 to-transparent pointer-events-none transition-opacity z-10 ${showLeftArrow ? 'opacity-100' : 'opacity-0'}`} />
      <div className={`absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-slate-900/80 to-transparent pointer-events-none transition-opacity z-10 ${showRightArrow ? 'opacity-100' : 'opacity-0'}`} />
    </div>
  );
};

// Space Card Component
const SpaceCard: React.FC<{ space: Space }> = ({ space }) => {
  const navigate = useNavigate();

  return (
    <div
      className="min-w-[320px] bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:-translate-y-2 group"
      onClick={() => navigate(`/space/${space.id}`)}
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-semibold text-white line-clamp-2 group-hover:text-purple-200 transition-colors">
          {space.name}
        </h3>
        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-semibold rounded-full uppercase tracking-wider border border-emerald-500/30">
          Public
        </span>
      </div>

      <p className="text-white/70 text-sm mb-6 line-clamp-2 leading-relaxed">
        {space.description}
      </p>

      <div className="flex justify-between items-center mb-6 text-sm text-white/60">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span className="font-medium">{space.totalViews || 0}</span>
        </div>
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="font-medium">{space._count?.snippets || 0}</span>
        </div>
      </div>

      <div className="pt-4 border-t border-white/10">
        <p className="text-xs text-white/40 font-light">
          {new Date(space.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })}
        </p>
      </div>
    </div>
  );
};

// Enhanced Floating Geometry Component
const FloatingGeometry: React.FC = () => {
  return (
    <>
      <style>{`
        @keyframes float-1 { 0%, 100% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-20px) rotate(180deg); } }
        @keyframes float-2 { 0%, 100% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-30px) rotate(-180deg); } }
        @keyframes float-3 { 0%, 100% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-25px) rotate(90deg); } }
        @keyframes float-4 { 0%, 100% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-15px) rotate(-90deg); } }
        @keyframes float-5 { 0%, 100% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-35px) rotate(270deg); } }
        @keyframes float-6 { 0%, 100% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-40px) rotate(-270deg); } }
        @keyframes drift-1 { 0%, 100% { transform: translateX(0px); } 50% { transform: translateX(20px); } }
        @keyframes drift-2 { 0%, 100% { transform: translateX(0px); } 50% { transform: translateX(-15px); } }
        @keyframes drift-3 { 0%, 100% { transform: translateX(0px); } 50% { transform: translateX(25px); } }
        .animate-float-1 { animation: float-1 8s ease-in-out infinite; }
        .animate-float-2 { animation: float-2 12s ease-in-out infinite; }
        .animate-float-3 { animation: float-3 10s ease-in-out infinite; }
        .animate-float-4 { animation: float-4 14s ease-in-out infinite; }
        .animate-float-5 { animation: float-5 9s ease-in-out infinite; }
        .animate-float-6 { animation: float-6 11s ease-in-out infinite; }
        .animate-drift-1 { animation: drift-1 15s ease-in-out infinite; }
        .animate-drift-2 { animation: drift-2 18s ease-in-out infinite; }
        .animate-drift-3 { animation: drift-3 20s ease-in-out infinite; }
      `}</style>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Hexagon */}
        <div className="absolute top-[15%] right-[20%] animate-float-1 animate-drift-1 opacity-20">
          <svg width="80" height="80" viewBox="0 0 100 100">
            <polygon points="50,5 85,25 85,65 50,85 15,65 15,25" fill="url(#gradient1)" />
            <defs>
              <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#A78BFA" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Octagon */}
        <div className="absolute top-[60%] left-[10%] animate-float-2 animate-drift-2 opacity-15">
          <svg width="60" height="60" viewBox="0 0 100 100">
            <polygon points="30,15 70,15 85,30 85,70 70,85 30,85 15,70 15,30" fill="url(#gradient2)" />
            <defs>
              <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06B6D4" />
                <stop offset="100%" stopColor="#67E8F9" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Pentagon */}
        <div className="absolute top-[30%] left-[15%] animate-float-3 opacity-25">
          <svg width="70" height="70" viewBox="0 0 100 100">
            <polygon points="50,10 90,35 75,80 25,80 10,35" fill="url(#gradient3)" />
            <defs>
              <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#34D399" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Star */}
        <div className="absolute bottom-[20%] right-[15%] animate-float-4 animate-drift-3 opacity-20">
          <svg width="75" height="75" viewBox="0 0 100 100">
            <polygon points="50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35" fill="url(#gradient4)" />
            <defs>
              <linearGradient id="gradient4" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#FCD34D" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Rounded Rectangle */}
        <div className="absolute bottom-[40%] left-[25%] animate-float-5 opacity-18">
          <svg width="85" height="50" viewBox="0 0 100 60">
            <rect x="10" y="15" width="80" height="30" rx="15" fill="url(#gradient5)" />
            <defs>
              <linearGradient id="gradient5" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#EF4444" />
                <stop offset="100%" stopColor="#F87171" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Complex Diamond */}
        <div className="absolute top-[70%] right-[30%] animate-float-6 animate-drift-1 opacity-22">
          <svg width="65" height="65" viewBox="0 0 100 100">
            <polygon points="50,10 75,25 90,50 75,75 50,90 25,75 10,50 25,25" fill="url(#gradient6)" />
            <defs>
              <linearGradient id="gradient6" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#EC4899" />
                <stop offset="100%" stopColor="#F472B6" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Ellipse */}
        <div className="absolute top-[45%] right-[8%] animate-float-1 opacity-16">
          <svg width="90" height="45" viewBox="0 0 100 50">
            <ellipse cx="50" cy="25" rx="40" ry="20" fill="url(#gradient7)" />
            <defs>
              <linearGradient id="gradient7" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366F1" />
                <stop offset="100%" stopColor="#818CF8" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Parallelogram */}
        <div className="absolute top-[25%] right-[45%] animate-float-3 animate-drift-2 opacity-14">
          <svg width="70" height="50" viewBox="0 0 100 60">
            <polygon points="20,15 80,15 70,45 10,45" fill="url(#gradient8)" />
            <defs>
              <linearGradient id="gradient8" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#84CC16" />
                <stop offset="100%" stopColor="#A3E635" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Trapezoid */}
        <div className="absolute bottom-[60%] left-[40%] animate-float-5 opacity-19">
          <svg width="65" height="50" viewBox="0 0 100 60">
            <polygon points="25,15 75,15 85,45 15,45" fill="url(#gradient9)" />
            <defs>
              <linearGradient id="gradient9" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F97316" />
                <stop offset="100%" stopColor="#FB923C" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Arrow */}
        <div className="absolute top-[80%] left-[60%] animate-float-2 animate-drift-3 opacity-17">
          <svg width="60" height="40" viewBox="0 0 100 60">
            <polygon points="10,30 60,10 60,20 90,20 90,40 60,40 60,50" fill="url(#gradient10)" />
            <defs>
              <linearGradient id="gradient10" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#14B8A6" />
                <stop offset="100%" stopColor="#5EEAD4" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Cross/Plus */}
        <div className="absolute bottom-[15%] left-[50%] animate-float-4 opacity-21">
          <svg width="55" height="55" viewBox="0 0 100 100">
            <polygon points="40,10 60,10 60,40 90,40 90,60 60,60 60,90 40,90 40,60 10,60 10,40 40,40" fill="url(#gradient11)" />
            <defs>
              <linearGradient id="gradient11" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#C084FC" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Crescent */}
        <div className="absolute top-[10%] left-[70%] animate-float-6 animate-drift-1 opacity-13">
          <svg width="50" height="50" viewBox="0 0 100 100">
            <path d="M50,10 A40,40 0 1,0 50,90 A30,30 0 1,1 50,10 Z" fill="url(#gradient12)" />
            <defs>
              <linearGradient id="gradient12" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#FBBF24" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Complex Star */}
        <div className="absolute bottom-[70%] right-[5%] animate-float-1 animate-drift-2 opacity-23">
          <svg width="45" height="45" viewBox="0 0 100 100">
            <polygon points="50,5 55,25 75,25 59,37 65,57 50,45 35,57 41,37 25,25 45,25" fill="url(#gradient13)" />
            <defs>
              <linearGradient id="gradient13" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#DC2626" />
                <stop offset="100%" stopColor="#EF4444" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    </>
  );
};

export default ProfilePage;