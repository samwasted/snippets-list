import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Search,
  GripVertical,
  ChevronRight,
  X,
  Users,
  PlusCircle,
  UserPlus,
  BarChart,
  AlertCircle,
  Loader2,
  Palette,
} from "lucide-react";
import TagColorMenu from "./TagColorMenu";

interface Snippet {
  id: string;
  title: string;
  description?: string;
  code?: string;
  tags: string[];
  color: string;
  x: number;
  y: number;
  spaceId: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CollaboratorMetadata {
  collaborationId: string;
  spaceRole: 'VIEWER' | 'EDITOR' | 'ADMIN' | 'OWNER';
  user: {
    id: string;
    username: string;
    name: string | null;
    role: string;
    createdAt: string;
    accountAge: number;
  };
}

interface SpaceInfo {
  id: string;
  name: string;
  owner: {
    id: string;
    username: string;
    name: string | null;
  };
}

interface CollaboratorSummary {
  totalCollaborators: number;
  roleDistribution: {
    ADMIN: number;
    EDITOR: number;
    VIEWER: number;
  };
}

interface SidebarProps {
  snippets: Snippet[];
  filteredSnippets: Snippet[];
  snippetOrder: string[];
  searchQuery: string;
  tagFilters: Set<string>;
  getAllTags: () => string[];
  onSearchChange: (query: string) => void;
  onToggleTagFilter: (tag: string) => void;
  onClearAllFilters: () => void;
  onReorderSnippets: (startIndex: number, endIndex: number) => void;
  onUpdateSnippet: (id: string, updates: Partial<Snippet>) => void;
  onDeleteSnippet: (id: string) => void;
  onNavigateToBox: (snippet: Snippet) => void;
  spaceId: string;
  userRole: 'VIEWER' | 'EDITOR' | 'ADMIN' | 'OWNER';
  onNavigateToAnalytics?: () => void;
  isSpacePublic: boolean;
  onToggleSpaceVisibility?: (isPublic: boolean) => void;
  isDarkMode: boolean;
  onClose?: () => void;
}

const API_BASE_URL = 'http://localhost:3000/api/v1';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const config: RequestInit = {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
    credentials: 'include'
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

const Sidebar: React.FC<SidebarProps> = ({
  snippets,
  filteredSnippets,
  snippetOrder,
  searchQuery,
  tagFilters,
  getAllTags,
  onSearchChange,
  onToggleTagFilter,
  onClearAllFilters,
  onReorderSnippets,
  onUpdateSnippet,
  onDeleteSnippet,
  onNavigateToBox,
  spaceId,
  userRole,
  onNavigateToAnalytics,
  isSpacePublic,
  onToggleSpaceVisibility,
  isDarkMode,
  onClose,
}) => {
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'snippets' | 'collaborators'>('snippets');

  // TagColorMenu state management
  const [tagColorMenu, setTagColorMenu] = useState<{
    isOpen: boolean;
    tag: string;
    x: number;
    y: number;
  }>({
    isOpen: false,
    tag: '',
    x: 0,
    y: 0
  });

  const [collaborators, setCollaborators] = useState<CollaboratorMetadata[]>([]);
  const [spaceInfo, setSpaceInfo] = useState<SpaceInfo | null>(null);
  const [collaboratorSummary, setCollaboratorSummary] = useState<CollaboratorSummary | null>(null);
  const [isLoadingCollaborators, setIsLoadingCollaborators] = useState(false);
  const [collaboratorError, setCollaboratorError] = useState<string | null>(null);
  const [newUsername, setNewUsername] = useState('');
  const [newRole, setNewRole] = useState<'VIEWER' | 'EDITOR' | 'ADMIN'>('VIEWER');
  const [isAddingCollaborator, setIsAddingCollaborator] = useState(false);
  const [addCollaboratorError, setAddCollaboratorError] = useState<string | null>(null);
  const [isTogglingVisibility, setIsTogglingVisibility] = useState(false);
  const [visibilityError, setVisibilityError] = useState<string | null>(null);

  // Add profile navigation function
  const handleNavigateToProfile = (username: string) => {
    navigate(`/profile/${username}`);
  };

  // Enhanced tag right-click handler
  const onTagRightClick = (e: React.MouseEvent, tag: string) => {
    e.preventDefault();
    e.stopPropagation();

    // Only allow color changes if user has edit permissions
    if (userRole === 'VIEWER') return;

    setTagColorMenu({
      isOpen: true,
      tag,
      x: e.clientX,
      y: e.clientY
    });
  };

  // Handle color selection for tags
  const handleTagColorSelect = (tag: string, color: string) => {
    // Find all snippets with this tag and update their color
    const snippetsWithTag = snippets.filter(snippet =>
      snippet.tags.includes(tag)
    );

    // Update each snippet with the new color
    snippetsWithTag.forEach(snippet => {
      onUpdateSnippet(snippet.id, { color });
    });

    // Close the color menu
    setTagColorMenu({ isOpen: false, tag: '', x: 0, y: 0 });
  };

  // Close color menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (tagColorMenu.isOpen) {
        setTagColorMenu({ isOpen: false, tag: '', x: 0, y: 0 });
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [tagColorMenu.isOpen]);

  // Touch event handling to prevent interference with canvas
  const handleSidebarTouch = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (e.type === 'touchstart' || e.type === 'touchmove') {
      e.preventDefault();
    }
  };

  // Mouse event handling with proper event stopping
  const handleSidebarMouse = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Orientation change handling to reset sidebar state
  useEffect(() => {
    const handleOrientationChange = () => {
      console.log('Orientation change detected in sidebar, resetting state');
      setIsCollapsed(false);

      setTimeout(() => {
        if (window.innerWidth >= 1024) {
          setIsCollapsed(false);
        }
      }, 100);
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleOrientationChange);
    }

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleOrientationChange);
      }
    };
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleToggleSpaceVisibility = async () => {
    if (!onToggleSpaceVisibility) return;

    setIsTogglingVisibility(true);
    setVisibilityError(null);

    try {
      await apiRequest(`/space/${spaceId}/visibility`, {
        method: 'PUT',
        body: JSON.stringify({
          isPublic: !isSpacePublic
        })
      });

      onToggleSpaceVisibility(!isSpacePublic);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update space visibility';
      setVisibilityError(errorMessage);
      console.error('Error updating space visibility:', error);
    } finally {
      setIsTogglingVisibility(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'collaborators' && !isCollapsed) {
      fetchCollaborators();
    }
  }, [activeTab, isCollapsed, spaceId]);

  const fetchCollaborators = async () => {
    setIsLoadingCollaborators(true);
    setCollaboratorError(null);

    try {
      const response = await apiRequest(`/space/${spaceId}/collaborators/metadata`);

      setCollaborators(response.collaborators || []);
      setSpaceInfo(response.space);
      setCollaboratorSummary(response.summary);
    } catch (error) {
      setCollaboratorError(error instanceof Error ? error.message : 'Failed to load collaborators');
      console.error('Error fetching collaborators:', error);
    } finally {
      setIsLoadingCollaborators(false);
    }
  };

  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newUsername.trim()) {
      setAddCollaboratorError('Username is required');
      return;
    }

    setIsAddingCollaborator(true);
    setAddCollaboratorError(null);

    try {
      await apiRequest(`/space/${spaceId}/collaborators`, {
        method: 'POST',
        body: JSON.stringify({
          username: newUsername.trim(),
          role: newRole
        })
      });

      fetchCollaborators();
      setNewUsername('');
      setNewRole('VIEWER');
    } catch (error) {
      let errorMessage = 'Failed to add collaborator';

      if (error instanceof Error) {
        if (error.message.includes('User not found')) {
          errorMessage = 'User not found';
        } else {
          errorMessage = error.message;
        }
      }

      setAddCollaboratorError(errorMessage);
      console.error('Error adding collaborator:', error);
    } finally {
      setIsAddingCollaborator(false);
    }
  };

  const handleUpdateCollaboratorRole = async (userId: string, role: 'VIEWER' | 'EDITOR' | 'ADMIN') => {
    try {
      await apiRequest(`/space/${spaceId}/collaborators/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ role })
      });

      fetchCollaborators();
    } catch (error) {
      console.error('Error updating collaborator role:', error);
    }
  };

  const handleRemoveCollaborator = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this collaborator?')) {
      return;
    }

    try {
      await apiRequest(`/space/${spaceId}/collaborators/${userId}`, {
        method: 'DELETE'
      });

      fetchCollaborators();
    } catch (error) {
      console.error('Error removing collaborator:', error);
    }
  };

  const handleNavigateToAnalytics = () => {
    if (onNavigateToAnalytics) {
      onNavigateToAnalytics();
    } else {
      window.location.href = `http://localhost:5173/space/${spaceId}/analytics`;
    }
  };

  const canEdit = true;
  const canManageCollaborators = userRole === 'OWNER' || userRole === 'ADMIN';

  const formatDate = (date: Date) => {
    if (!date) return "Unknown";

    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();

    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      if (hours < 1) {
        const minutes = Math.floor(diff / (60 * 1000));
        if (minutes < 1) {
          return "Just now";
        }
        return `${minutes}m ago`;
      }
      return `${hours}h ago`;
    }

    return new Date(date).toLocaleDateString();
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'bg-gradient-to-r from-purple-600 to-pink-600 text-white';
      case 'ADMIN':
        return 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white';
      case 'EDITOR':
        return 'bg-gradient-to-r from-green-600 to-teal-600 text-white';
      case 'VIEWER':
      default:
        return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white';
    }
  };

  return (
    <>
      {/* Main Sidebar - Updated positioning without header spacing */}
      <motion.div
        animate={{ width: isCollapsed ? 60 : 360 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={`fixed right-4 top-20 bottom-4 rounded-xl shadow-2xl h-[90vh] flex z-50 flex-col border overflow-hidden transition-colors duration-300 ${isDarkMode
          ? 'bg-gray-800 border-gray-700'
          : 'bg-white border-gray-100'
          }`}
        style={{
          background: isDarkMode
            ? 'linear-gradient(135deg, rgba(31,41,55,0.95) 0%, rgba(17,24,39,0.95) 100%)'
            : 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)',
          backdropFilter: 'blur(10px)',
          touchAction: 'none'
        }}
        onTouchStart={handleSidebarTouch}
        onTouchMove={handleSidebarTouch}
        onTouchEnd={handleSidebarTouch}
        onMouseDown={handleSidebarMouse}
        onMouseMove={handleSidebarMouse}
        onMouseUp={handleSidebarMouse}
        onWheel={(e) => e.stopPropagation()}
        onMouseEnter={(e) => e.stopPropagation()}
      >
        {/* Header Section */}
        <div
          className={`flex items-center justify-between p-4 border-b rounded-t-xl transition-colors duration-300 ${isDarkMode
            ? 'border-gray-700 bg-gradient-to-r from-purple-900/30 to-pink-900/30'
            : 'border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50'
            }`}
          onTouchStart={handleSidebarTouch}
          onMouseDown={handleSidebarMouse}
        >
          {!isCollapsed && (
            <div className="flex-1">
              <h3 className={`font-bold text-lg bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent`}>
                Space Navigator
              </h3>
              <p className={`text-xs mt-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                Manage your workspace
              </p>
            </div>
          )}

          <div className="flex items-center gap-2">
            {/* Mobile close button */}
            {onClose && (
              <button
                onClick={onClose}
                className={`p-2 rounded-full transition-all duration-200 flex-shrink-0 lg:hidden ${isDarkMode
                  ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200'
                  : 'hover:bg-white/50 text-gray-600 hover:text-gray-800'
                  }`}
                title="Close Sidebar"
                onTouchStart={handleSidebarTouch}
                onMouseDown={handleSidebarMouse}
              >
                <X className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={toggleSidebar}
              className={`p-2 rounded-full transition-all duration-200 flex-shrink-0 backdrop-blur-sm ${isDarkMode
                ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200'
                : 'hover:bg-white/50 text-gray-600 hover:text-gray-800'
                }`}
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              onTouchStart={handleSidebarTouch}
              onMouseDown={handleSidebarMouse}
            >
              <motion.div
                animate={{ rotate: isCollapsed ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <ChevronRight className="w-5 h-5" />
              </motion.div>
            </button>
          </div>
        </div>

        {/* Collapsed State */}
        {isCollapsed && (
          <div
            className="flex-1 flex flex-col items-center justify-center p-3 space-y-6"
            onTouchStart={handleSidebarTouch}
            onMouseDown={handleSidebarMouse}
          >
            <div className="text-center">
              <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {snippets.length}
              </div>
              <div className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                snippets
              </div>
            </div>

            {(userRole === 'OWNER' || userRole === 'ADMIN') && (
              <button
                onClick={handleNavigateToAnalytics}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-md hover:shadow-lg transition-all duration-200 hover:scale-110"
                title="View Analytics"
              >
                <BarChart className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={() => {
                setActiveTab('collaborators');
                setIsCollapsed(false);
              }}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md hover:shadow-lg transition-all duration-200 hover:scale-110"
              title="View Collaborators"
            >
              <Users className="w-5 h-5" />
            </button>

            {tagFilters.size > 0 && (
              <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse" title="Filters active" />
            )}

            {searchQuery && (
              <div className="w-4 h-4 bg-gradient-to-r from-green-500 to-teal-500 rounded-full animate-pulse" title="Search active" />
            )}

            <div className="flex flex-col space-y-2 w-full">
              {filteredSnippets.slice(0, 6).map((snippet) => (
                <motion.div
                  key={snippet.id}
                  onClick={() => onNavigateToBox(snippet)}
                  className={`w-full h-8 rounded-lg cursor-pointer ${snippet.color} opacity-75 hover:opacity-100 transition-all duration-200 hover:scale-105 shadow-md`}
                  title={snippet.title}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                />
              ))}
              {filteredSnippets.length > 6 && (
                <div className={`text-xs text-center font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                  +{filteredSnippets.length - 6} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Expanded Content */}
        {!isCollapsed && (
          <div
            className="flex-1 flex flex-col overflow-hidden"
            onTouchStart={handleSidebarTouch}
            onMouseDown={handleSidebarMouse}
          >
            {/* Tab Navigation */}
            <div className={`flex border-b transition-colors duration-300 ${isDarkMode ? 'border-gray-700' : 'border-gray-100'
              }`}>
              <button
                onClick={() => setActiveTab('snippets')}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors duration-300 ${activeTab === 'snippets'
                  ? isDarkMode
                    ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-900/20'
                    : 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                  : isDarkMode
                    ? 'text-gray-400 hover:text-purple-400 hover:bg-purple-900/10'
                    : 'text-gray-600 hover:text-purple-500 hover:bg-purple-50/50'
                  }`}
              >
                Snippets
              </button>
              <button
                onClick={() => setActiveTab('collaborators')}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors duration-300 flex items-center justify-center gap-2 ${activeTab === 'collaborators'
                  ? isDarkMode
                    ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-900/20'
                    : 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                  : isDarkMode
                    ? 'text-gray-400 hover:text-purple-400 hover:bg-purple-900/10'
                    : 'text-gray-600 hover:text-purple-500 hover:bg-purple-50/50'
                  }`}
              >
                <Users className="w-4 h-4" />
                Collaborators
              </button>
            </div>

            {/* Analytics Button */}
            {(userRole === "ADMIN" || userRole === "EDITOR" || userRole === "OWNER") && (
              <div className={`p-3 border-b transition-colors duration-300 ${isDarkMode ? 'border-gray-700' : 'border-gray-100'
                }`}>
                <button
                  onClick={handleNavigateToAnalytics}
                  className="w-full py-2 px-4 bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm font-medium hover:scale-105"
                >
                  <BarChart className="w-4 h-4" />
                  View Analytics
                </button>
              </div>
            )}

            {/* Space Visibility Toggle - Only for Owner */}
            {userRole === 'OWNER' && (
              <div className={`p-3 border-b transition-colors duration-300 ${isDarkMode ? 'border-gray-700' : 'border-gray-100'
                }`}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className={`text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'
                      }`}>
                      Space Visibility
                    </h4>
                    <p className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                      {isSpacePublic ? 'Anyone can view this space' : 'Only collaborators can view this space'}
                    </p>
                  </div>
                  <button
                    onClick={handleToggleSpaceVisibility}
                    disabled={isTogglingVisibility}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${isSpacePublic
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                      : isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
                      }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${isSpacePublic ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                    {isTogglingVisibility && (
                      <Loader2 className="absolute inset-0 w-4 h-4 m-auto text-white animate-spin" />
                    )}
                  </button>
                </div>

                <div className={`text-xs px-2 py-1 rounded-full inline-flex items-center gap-1 transition-colors duration-300 ${isSpacePublic
                  ? 'bg-green-100 text-green-700'
                  : isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                  }`}>
                  <div className={`w-2 h-2 rounded-full ${isSpacePublic ? 'bg-green-500' : isDarkMode ? 'bg-gray-500' : 'bg-gray-500'
                    }`} />
                  {isSpacePublic ? 'Public' : 'Private'}
                </div>

                {visibilityError && (
                  <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 p-2 rounded-lg flex items-center gap-2 mt-2">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{visibilityError}</span>
                  </div>
                )}
              </div>
            )}

            {/* Snippets Tab Content */}
            {activeTab === 'snippets' && (
              <>
                {/* Search Section */}
                <div className={`p-4 border-b transition-colors duration-300 ${isDarkMode ? 'border-gray-700' : 'border-gray-100'
                  }`}>
                  <div className="relative">
                    <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-400'
                      }`} />
                    <input
                      type="text"
                      placeholder="Search snippets..."
                      value={searchQuery}
                      onChange={(e) => onSearchChange(e.target.value)}
                      className={`w-full pl-10 pr-8 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 ${isDarkMode
                        ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400'
                        : 'border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-900'
                        }`}
                    />
                    {searchQuery && (
                      <button
                        onClick={() => onSearchChange("")}
                        className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors p-1 hover:bg-opacity-20 rounded-full ${isDarkMode
                          ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-200'
                          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'
                          }`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Filters Section with Enhanced Tag Color Management */}
                <div
                  className={`p-4 border-b max-h-48 overflow-y-auto transition-colors duration-300 scrollbar scrollbar-thumb-rounded ${isDarkMode
                    ? 'border-gray-700 scrollbar-thumb-gray-600 scrollbar-track-gray-800 hover:scrollbar-thumb-gray-500'
                    : 'border-gray-100 scrollbar-thumb-gray-400 scrollbar-track-gray-50 hover:scrollbar-thumb-gray-500'
                    }`}
                  onWheel={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className={`font-semibold text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'
                      }`}>
                      Filter tags
                    </h4>
                    {tagFilters.size > 0 && (
                      <button
                        onClick={onClearAllFilters}
                        className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 font-semibold transition-colors px-2 py-1 rounded-full hover:bg-purple-50 dark:hover:bg-purple-900/20"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  <div>

                    <p className={`text-xs mb-3 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                      Right-click to change tag color
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {getAllTags().map(tag => {
                        const snippetCount = snippets.filter(snippet => snippet.tags.includes(tag)).length;
                        const isSelected = tagFilters.has(tag);

                        return (
                          <button
                            key={tag}
                            onClick={() => onToggleTagFilter(tag)}
                            onContextMenu={(e) => onTagRightClick(e, tag)}
                            className={`inline-flex items-center text-xs px-3 py-2 rounded-full transition-all duration-200 font-medium shadow-sm hover:shadow-md hover:scale-105 relative group ${isSelected
                              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg scale-105'
                              : isDarkMode
                                ? 'bg-gradient-to-r from-gray-700 to-gray-600 text-gray-200 hover:from-gray-600 hover:to-gray-500'
                                : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 hover:from-gray-200 hover:to-gray-300'
                              }`}
                            title={userRole !== 'VIEWER' ? "Right-click to change color" : ""}
                          >
                            {tag}
                            <span className="ml-1.5 opacity-70">({snippetCount})</span>
                            {userRole !== 'VIEWER' && (
                              <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${isDarkMode ? 'bg-purple-400' : 'bg-purple-500'
                                }`}>
                                <Palette className="w-2 h-2 text-white m-0.5" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                      {getAllTags().length === 0 && (
                        <span className={`text-xs italic transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                          No tags yet
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={`text-xs mt-4 p-3 rounded-lg border transition-colors duration-300 ${isDarkMode
                    ? 'bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-gray-600 text-gray-300'
                    : 'bg-gradient-to-r from-blue-50 to-purple-50 border-gray-100 text-gray-500'
                    }`}>
                    {tagFilters.size === 0 && !searchQuery.trim()
                      ? `Showing all ${snippets.length} snippets`
                      : `Showing ${filteredSnippets.length} of ${snippets.length} snippets`
                    }
                  </div>
                </div>

                {/* Snippet List */}
                <div
                  className={`flex-1 overflow-y-auto p-3 scrollbar scrollbar-thumb-rounded ${isDarkMode
                    ? 'scrollbar-thumb-gray-600 scrollbar-track-gray-800 hover:scrollbar-thumb-gray-500'
                    : 'scrollbar-thumb-gray-400 scrollbar-track-gray-50 hover:scrollbar-thumb-gray-500'
                    }`}
                  onWheel={(e) => e.stopPropagation()}
                >
                  <div className="space-y-3">
                    {(filteredSnippets ?? [])
                      .sort((a, b) => {
                        const aIndex = snippetOrder.indexOf(a.id);
                        const bIndex = snippetOrder.indexOf(b.id);
                        if (aIndex === -1 && bIndex === -1) return 0;
                        if (aIndex === -1) return 1;
                        if (bIndex === -1) return -1;
                        return aIndex - bIndex;
                      })
                      .map((snippet, index) => (
                        <motion.div
                          key={snippet.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          className="group"
                        >
                          <div
                            onClick={() => onNavigateToBox(snippet)}
                            className={`flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-all duration-200 border shadow-sm hover:shadow-lg hover:scale-[1.02] ${isDarkMode
                              ? 'hover:bg-gradient-to-r hover:from-purple-900/30 hover:to-pink-900/30 border-gray-700 bg-gray-800/50'
                              : 'hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 border-gray-100 bg-white'
                              }`}
                          >
                            {canEdit && (
                              <motion.div
                                drag="y"
                                dragConstraints={{ top: 0, bottom: 0 }}
                                dragElastic={0.0}
                                onDragEnd={(_, info) => {
                                  const draggedDistance = info.offset.y;
                                  const itemHeight = 90;
                                  const newIndex = Math.round(draggedDistance / itemHeight) + index;
                                  const clampedIndex = Math.max(0, Math.min(filteredSnippets.length - 1, newIndex));

                                  if (clampedIndex !== index) {
                                    const originalIndex = snippetOrder.indexOf(snippet.id);
                                    const targetSnippet = filteredSnippets[clampedIndex];
                                    const targetIndex = snippetOrder.indexOf(targetSnippet.id);

                                    if (originalIndex !== -1 && targetIndex !== -1) {
                                      onReorderSnippets(originalIndex, targetIndex);
                                    }
                                  }
                                }}
                                dragTransition={{
                                  bounceStiffness: 600,
                                  bounceDamping: 20,
                                  power: 0.3,
                                  timeConstant: 200
                                }}
                                whileDrag={{ scale: 1.1, zIndex: 1000 }}
                                className={`flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-2 -m-2 rounded-lg ${isDarkMode
                                  ? 'hover:bg-gradient-to-r hover:from-purple-800/30 hover:to-pink-800/30'
                                  : 'hover:bg-gradient-to-r hover:from-purple-100 hover:to-pink-100'
                                  }`}
                              >
                                <GripVertical className={`w-4 h-4 transition-colors duration-300 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'
                                  }`} />
                              </motion.div>
                            )}
                            <div className="flex flex-col gap-2 flex-1 min-w-0">
                              <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-lg ${snippet.color} shadow-lg flex-shrink-0`} />
                                <div className="flex-1 min-w-0">
                                  <div className={`font-semibold truncate text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'
                                    }`}>
                                    {snippet.title}
                                  </div>
                                  <div className={`text-xs mt-0.5 flex items-center gap-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                    }`}>
                                    <span>x: {Math.round(snippet.x)}, y: {Math.round(snippet.y)}</span>
                                  </div>
                                </div>
                              </div>

                              <div className={`text-xs pl-9 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                }`}>
                                Last edited: {formatDate(snippet.updatedAt)}
                              </div>

                              {(snippet.tags?.length ?? 0) > 0 && (
                                <div className="flex flex-wrap gap-1 pl-9">
                                  {snippet.tags.map(tag => (
                                    <span
                                      key={tag}
                                      onContextMenu={(e) => onTagRightClick(e, tag)}
                                      className={`inline-block text-xs px-2 py-1 rounded-full cursor-context-menu transition-all duration-200 shadow-sm hover:scale-105 ${isDarkMode
                                        ? 'bg-gradient-to-r from-gray-700 to-gray-600 text-gray-200 hover:from-gray-600 hover:to-gray-500'
                                        : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-600 hover:from-gray-200 hover:to-gray-300'
                                        }`}
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}

                              <div className="flex items-center justify-between pl-9 pt-2">
                                <div className="flex gap-2">
                                  {(userRole === "ADMIN" || userRole === "EDITOR" || userRole === "OWNER") && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteSnippet(snippet.id);
                                      }}
                                      className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-semibold transition-colors px-2 py-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                                    >
                                      Delete
                                    </button>
                                  )}
                                </div>
                                <div className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'
                                  }`}>
                                  {snippet.createdAt ? new Date(snippet.createdAt).toLocaleDateString() : "Unknown date"}
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}

                    {(filteredSnippets ?? []).length === 0 && (
                      <div className="text-center py-12">
                        <div className="text-6xl mb-4">📦</div>
                        <div className={`font-medium mb-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                          No snippets found
                        </div>
                        <div className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'
                          }`}>
                          {searchQuery || tagFilters.size > 0
                            ? "Try adjusting your filters or search terms"
                            : "Create your first snippet to get started"
                          }
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Enhanced Collaborators Tab Content */}
            {activeTab === 'collaborators' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Enhanced Collaborators Header with Summary */}
                <div className={`p-4 border-b transition-colors duration-300 ${isDarkMode
                  ? 'border-gray-700 bg-gradient-to-r from-purple-900/20 to-blue-900/20'
                  : 'border-gray-100 bg-gradient-to-r from-purple-50 to-blue-50'
                  }`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className={`font-semibold flex items-center gap-2 transition-colors  duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'
                      }`}>
                      <Users className="w-4 h-4" />
                      <span>Collaborators</span>
                      {collaboratorSummary && (
                        <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">
                          {collaboratorSummary.totalCollaborators}
                        </span>
                      )}
                    </h4>
                  </div>

                  {/* Role Distribution Summary */}
                  {collaboratorSummary && (
                    <div className="flex gap-2 mb-2">
                      {collaboratorSummary.roleDistribution.ADMIN > 0 && (
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                          {collaboratorSummary.roleDistribution.ADMIN} Admin{collaboratorSummary.roleDistribution.ADMIN > 1 ? 's' : ''}
                        </span>
                      )}
                      {collaboratorSummary.roleDistribution.EDITOR > 0 && (
                        <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">
                          {collaboratorSummary.roleDistribution.EDITOR} Editor{collaboratorSummary.roleDistribution.EDITOR > 1 ? 's' : ''}
                        </span>
                      )}
                      {collaboratorSummary.roleDistribution.VIEWER > 0 && (
                        <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">
                          {collaboratorSummary.roleDistribution.VIEWER} Viewer{collaboratorSummary.roleDistribution.VIEWER > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  )}

                  <p className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                    Manage who has access to this space
                  </p>
                </div>

                {/* Add Collaborator Form */}
                {canManageCollaborators && (
                  <div className={`p-4 border-b transition-colors duration-300 ${isDarkMode
                    ? 'border-gray-700 bg-gradient-to-r from-gray-800/50 to-gray-700/50'
                    : 'border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100'
                    }`}>
                    <form onSubmit={handleAddCollaborator} className="space-y-3">
                      <div>
                        <label htmlFor="username" className={`block text-xs font-medium mb-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                          Add new collaborator
                        </label>
                        <div className="flex gap-2 mb-2">
                          <div className="relative flex-1">
                            <UserPlus className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-400'
                              }`} />
                            <input
                              id="username"
                              type="text"
                              placeholder="Username"
                              value={newUsername}
                              onChange={(e) => setNewUsername(e.target.value)}
                              className={`w-full pl-10 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 ${isDarkMode
                                ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400'
                                : 'border-gray-200 bg-white text-gray-900'
                                }`}
                              disabled={isAddingCollaborator}
                            />
                          </div>

                          <select
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value as 'VIEWER' | 'EDITOR' | 'ADMIN')}
                            className={`border rounded-lg text-sm py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 ${isDarkMode
                              ? 'border-gray-600 bg-gray-700 text-white'
                              : 'border-gray-200 bg-white text-gray-900'
                              }`}
                            disabled={isAddingCollaborator}
                          >
                            <option value="VIEWER">Viewer</option>
                            <option value="EDITOR">Editor</option>
                            <option value="ADMIN">Admin</option>
                          </select>

                          <button
                            type="submit"
                            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center hover:scale-105"
                            disabled={isAddingCollaborator || !newUsername.trim()}
                          >
                            {isAddingCollaborator ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <PlusCircle className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {addCollaboratorError && (
                        <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 p-2 rounded-lg flex items-center gap-2">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{addCollaboratorError}</span>
                        </div>
                      )}
                    </form>
                  </div>
                )}

                {/* Enhanced Collaborators List */}
                <div className={`flex-1 overflow-y-auto p-3 scrollbar scrollbar-thumb-rounded ${isDarkMode
                    ? 'border-gray-700 scrollbar-thumb-gray-600 scrollbar-track-gray-800 hover:scrollbar-thumb-gray-500'
                    : 'border-gray-100 scrollbar-thumb-gray-400 scrollbar-track-gray-50 hover:scrollbar-thumb-gray-500'
                    }`}>
                  {isLoadingCollaborators ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                    </div>
                  ) : collaboratorError ? (
                    <div className="text-center py-8">
                      <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                      <div className={`font-medium mb-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'
                        }`}>
                        Failed to load collaborators
                      </div>
                      <div className={`text-xs max-w-xs mx-auto transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                        {collaboratorError}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Space Owner Section */}
                      {spaceInfo && (
                        <div className={`p-4 rounded-xl border shadow-sm transition-colors duration-200 hover:scale-[1.02] cursor-pointer ${isDarkMode
                          ? 'bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-purple-700/50 hover:border-purple-600/50'
                          : 'bg-gradient-to-r from-purple-100 to-pink-100 border-purple-200 hover:border-purple-300'
                          }`}
                          onClick={() => handleNavigateToProfile(spaceInfo.owner.username)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white flex items-center justify-center text-lg font-bold shadow-md">
                                {spaceInfo.owner.name ? spaceInfo.owner.name.charAt(0) : spaceInfo.owner.username.charAt(0)}
                              </div>
                              <div>
                                <div className={`font-semibold transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'
                                  }`}>
                                  {spaceInfo.owner.name || spaceInfo.owner.username}
                                </div>
                                <div className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                  }`}>
                                  @{spaceInfo.owner.username}
                                </div>
                              </div>
                            </div>
                            <div className="px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-medium rounded-full shadow-md">
                              OWNER
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Enhanced Collaborators with Profile Navigation */}
                      {collaborators.map(collaborator => (
                        <motion.div
                          key={collaborator.collaborationId}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          className={`p-4 rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02] ${isDarkMode
                            ? 'bg-gray-800/50 border-gray-700'
                            : 'bg-white border-gray-100'
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <div
                              className="flex items-center gap-3 cursor-pointer flex-1"
                              onClick={() => handleNavigateToProfile(collaborator.user.username)}
                            >
                              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-gray-500 to-gray-600 text-white flex items-center justify-center text-lg font-bold shadow-sm">
                                {collaborator.user.name ? collaborator.user.name.charAt(0) : collaborator.user.username.charAt(0)}
                              </div>
                              <div>
                                <div className={`font-semibold transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'
                                  }`}>
                                  {collaborator.user.name || collaborator.user.username}
                                </div>
                                <div className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                  }`}>
                                  @{collaborator.user.username}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2 items-center">
                              {canManageCollaborators && (
                                <div className="relative group">
                                  <div className={`px-3 py-1 ${getRoleBadgeStyle(collaborator.spaceRole)} text-xs font-medium rounded-full shadow-sm cursor-pointer hover:scale-105 transition-transform duration-200`}>
                                    {collaborator.spaceRole}
                                  </div>

                                  {/* Role change dropdown menu */}
                                  <div className={`absolute right-0 mt-1 w-32 rounded-lg shadow-lg border invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 ${isDarkMode
                                    ? 'bg-gray-800 border-gray-600'
                                    : 'bg-white border-gray-100'
                                    }`}>
                                    <div className="py-1">
                                      <button
                                        onClick={() => handleUpdateCollaboratorRole(collaborator.user.id, 'VIEWER')}
                                        className={`block w-full text-left px-4 py-2 text-xs transition-colors duration-200 ${isDarkMode
                                          ? 'text-gray-300 hover:bg-purple-900/20 hover:text-purple-400'
                                          : 'text-gray-700 hover:bg-purple-50 hover:text-purple-600'
                                          }`}
                                      >
                                        Viewer
                                      </button>
                                      <button
                                        onClick={() => handleUpdateCollaboratorRole(collaborator.user.id, 'EDITOR')}
                                        className={`block w-full text-left px-4 py-2 text-xs transition-colors duration-200 ${isDarkMode
                                          ? 'text-gray-300 hover:bg-purple-900/20 hover:text-purple-400'
                                          : 'text-gray-700 hover:bg-purple-50 hover:text-purple-600'
                                          }`}
                                      >
                                        Editor
                                      </button>
                                      <button
                                        onClick={() => handleUpdateCollaboratorRole(collaborator.user.id, 'ADMIN')}
                                        className={`block w-full text-left px-4 py-2 text-xs transition-colors duration-200 ${isDarkMode
                                          ? 'text-gray-300 hover:bg-purple-900/20 hover:text-purple-400'
                                          : 'text-gray-700 hover:bg-purple-50 hover:text-purple-600'
                                          }`}
                                      >
                                        Admin
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {canManageCollaborators && (
                                <button
                                  onClick={() => handleRemoveCollaborator(collaborator.user.id)}
                                  className={`p-1 rounded-full transition-colors duration-200 hover:scale-110 ${isDarkMode
                                    ? 'text-gray-400 hover:text-red-400 hover:bg-red-900/20'
                                    : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                                    }`}
                                  title="Remove collaborator"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}

                      {collaborators.length === 0 && (
                        <div className="text-center py-12">
                          <div className="text-6xl mb-4">👥</div>
                          <div className={`font-medium mb-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                            No collaborators yet
                          </div>
                          <div className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'
                            }`}>
                            {canManageCollaborators
                              ? "Add collaborators using the form above"
                              : "No one has been invited to collaborate yet"
                            }
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* TagColorMenu Integration */}
      {tagColorMenu.isOpen && (
        <TagColorMenu
          tag={tagColorMenu.tag}
          x={tagColorMenu.x}
          y={tagColorMenu.y}
          onColorSelect={handleTagColorSelect}
          onClose={() => setTagColorMenu({ isOpen: false, tag: '', x: 0, y: 0 })}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Line clamp utility */}
      <style>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </>
  );
};

export default Sidebar;
