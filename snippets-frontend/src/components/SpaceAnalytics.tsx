import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';
import { Calendar, Users, Eye, FileText, TrendingUp, ArrowLeft, Filter, Download, RefreshCw, Moon, Sun } from 'lucide-react';
import { apiRequest } from './api';

// Updated interfaces to match actual API responses
interface SpaceView {
  id: string;
  viewedAt: string;
  spaceId: string;
  userId: string;
  user: {
    id: string;
    username: string;
    name?: string;
  };
}

interface SpaceAnalytics {
  totalViews: number;
  snippetCount: number;
  collaboratorCount: number;
  views: SpaceView[];
}

interface SpaceInfo {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  order?: string[];
  totalViews: number;
  owner: {
    id: string;
    username: string;
    name?: string;
  };
  _count: {
    collaborators: number;
    views: number;
    snippets: number;
  };
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

interface SpaceAnalyticsProps {
  onNavigateBack?: () => void;
  onNavigateToSpace?: (spaceId: string) => void;
}

const SpaceAnalytics: React.FC<SpaceAnalyticsProps> = ({ 
  onNavigateBack,
  onNavigateToSpace 
}) => {
  const { spaceId } = useParams<{ spaceId: string }>();
  const navigate = useNavigate();
  
  // Dark mode state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const savedMode = localStorage.getItem('isDarkMode');
      return savedMode ? JSON.parse(savedMode) : false;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return false;
    }
  });

  const [analytics, setAnalytics] = useState<SpaceAnalytics | null>(null);
  const [spaceInfo, setSpaceInfo] = useState<SpaceInfo | null>(null);
  const [collaborators, setCollaborators] = useState<CollaboratorMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');

  // Dark mode toggle function
  const toggleDarkMode = () => {
    try {
      const newMode = !isDarkMode;
      setIsDarkMode(newMode);
      localStorage.setItem('isDarkMode', JSON.stringify(newMode));
      
      if (newMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  };

  // Apply dark mode class on component mount
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const fetchAnalytics = async () => {
    if (!spaceId) return;
    
    try {
        setLoading(true);
        setError(null);
        
        const startDateTime = new Date(dateRange.startDate + 'T00:00:00.000Z').toISOString();
        const endDateTime = new Date(dateRange.endDate + 'T23:59:59.999Z').toISOString();
        
        const params = new URLSearchParams({
            startDate: startDateTime,
            endDate: endDateTime,
            groupBy: groupBy
        });

        // Fetch space info, analytics, and collaborators
        const [spaceResponse, analyticsResponse, collaboratorsResponse] = await Promise.all([
            apiRequest(`/space/${spaceId}`),
            apiRequest(`/space/${spaceId}/analytics?${params.toString()}`),
            apiRequest(`/space/${spaceId}/collaborators/metadata`)
        ]);

        if (!spaceResponse?.space) {
            throw new Error('Invalid space response structure');
        }

        if (!analyticsResponse?.analytics) {
            throw new Error('Invalid analytics response structure');
        }
        
        setSpaceInfo(spaceResponse.space);
        setAnalytics(analyticsResponse.analytics);
        setCollaborators(collaboratorsResponse.collaborators || []);
        
    } catch (err: any) {
        console.error('Failed to fetch analytics:', err);
        if (err.message.includes('403')) {
            setError('Insufficient permissions to view analytics');
        } else if (err.message.includes('404')) {
            setError('Space not found or access denied');
        } else {
            setError(err.message || 'Failed to fetch analytics');
        }
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    if (spaceId) {
      fetchAnalytics();
    }
  }, [spaceId, dateRange, groupBy]);

  // Handle navigation
  const handleNavigateBack = () => {
    if (onNavigateBack) {
      onNavigateBack();
    } else {
      navigate(-1);
    }
  };

  const handleNavigateToSpace = () => {
    if (onNavigateToSpace && spaceId) {
      onNavigateToSpace(spaceId);
    } else if (spaceId) {
      navigate(`/space/${spaceId}`);
    }
  };

  // Early return if no spaceId
  if (!spaceId) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
        isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-slate-50 to-slate-100'
      }`}>
        <div className="text-center">
          <div className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-red-400' : 'text-red-500'}`}>
            Invalid space ID
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const processViewsData = () => {
    if (!analytics?.views || analytics.views.length === 0) return [];
    
    const viewsByDate: Record<string, number> = {};
    
    analytics.views.forEach(view => {
        let dateKey;
        const date = new Date(view.viewedAt);
        
        switch (groupBy) {
            case 'day':
                dateKey = date.toISOString().split('T')[0];
                break;
            case 'week':
                const weekStart = new Date(date);
                weekStart.setUTCDate(date.getUTCDate() - date.getUTCDay());
                dateKey = weekStart.toISOString().split('T')[0];
                break;
            case 'month':
                dateKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`;
                break;
            default:
                dateKey = date.toISOString().split('T')[0];
        }
        
        viewsByDate[dateKey] = (viewsByDate[dateKey] || 0) + 1;
    });

    const sortedDates = Object.keys(viewsByDate).sort();
    if (sortedDates.length === 0) return [];
    
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    const filledData: Array<{ date: string; views: number }> = [];
    
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        let dateKey;
        
        switch (groupBy) {
            case 'day':
                dateKey = currentDate.toISOString().split('T')[0];
                currentDate.setDate(currentDate.getDate() + 1);
                break;
            case 'week':
                const weekStart = new Date(currentDate);
                weekStart.setDate(currentDate.getDate() - currentDate.getDay());
                dateKey = weekStart.toISOString().split('T')[0];
                currentDate.setDate(currentDate.getDate() + 7);
                break;
            case 'month':
                dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`;
                currentDate.setMonth(currentDate.getMonth() + 1);
                break;
            default:
                dateKey = currentDate.toISOString().split('T')[0];
                currentDate.setDate(currentDate.getDate() + 1);
        }
        
        filledData.push({
            date: dateKey,
            views: viewsByDate[dateKey] || 0
        });
    }
    
    return filledData;
  };

  const getTopViewers = () => {
    if (!analytics?.views) return [];
    
    const viewerCounts: Record<string, { username: string; count: number }> = {};
    analytics.views.forEach(view => {
      const username = view.user.username;
      viewerCounts[username] = {
        username,
        count: (viewerCounts[username]?.count || 0) + 1
      };
    });

    return Object.values(viewerCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };

  // Get unique viewers count [31]
  const getUniqueViewersCount = () => {
    if (!analytics?.views) return 0;
    const uniqueUsers = new Set(analytics.views.map(view => view.userId));
    return uniqueUsers.size;
  };

  // Enhanced data functions for multiple pie charts [31]
  const getViewsData = () => {
    if (!analytics) return [];
    
    const totalViews = analytics.totalViews;
    const uniqueViews = getUniqueViewersCount();
    const returnViews = totalViews - uniqueViews;
    
    return [
      { 
        name: 'Unique Views', 
        value: uniqueViews, 
        color: '#3B82F6',
        percentage: totalViews > 0 ? Math.round((uniqueViews / totalViews) * 100) : 0
      },
      { 
        name: 'Return Views', 
        value: returnViews, 
        color: '#10B981',
        percentage: totalViews > 0 ? Math.round((returnViews / totalViews) * 100) : 0
      }
    ];
  };

  const getCollaboratorsData = () => {
    if (!collaborators || collaborators.length === 0) return [];
    
    const roleDistribution = {
      ADMIN: collaborators.filter(c => c.spaceRole === 'ADMIN').length,
      EDITOR: collaborators.filter(c => c.spaceRole === 'EDITOR').length,
      VIEWER: collaborators.filter(c => c.spaceRole === 'VIEWER').length
    };
    
    const total = Object.values(roleDistribution).reduce((sum, count) => sum + count, 0);
    
    return Object.entries(roleDistribution)
      .filter(([_, count]) => count > 0)
      .map(([role, count]) => ({
        name: role.charAt(0).toUpperCase() + role.slice(1).toLowerCase() + 's',
        value: count,
        color: role === 'ADMIN' ? '#F59E0B' : role === 'EDITOR' ? '#8B5CF6' : '#6B7280',
        percentage: total > 0 ? Math.round((count / total) * 100) : 0
      }));
  };

  // Custom label function for pie charts with percentages [42]
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill={isDarkMode ? "#ffffff" : "#000000"} 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const handleExport = async () => {
    if (!analytics || !spaceInfo) return;
    
    try {
      const data = {
        spaceName: spaceInfo.name,
        exportDate: new Date().toISOString(),
        dateRange,
        analytics: {
          totalViews: analytics.totalViews,
          uniqueViews: getUniqueViewersCount(),
          snippetCount: analytics.snippetCount,
          collaboratorCount: analytics.collaboratorCount,
          viewsOverTime: processViewsData(),
          topViewers: getTopViewers(),
          collaboratorDistribution: getCollaboratorsData()
        }
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${spaceInfo.name}-analytics-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Failed to export analytics:', err);
      setError('Failed to export analytics');
    }
  };

  const handleRefresh = () => {
    fetchAnalytics();
  };

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    const inputDate = new Date(value);
    const today = new Date();
    
    if (inputDate > today) {
      setError('Date cannot be in the future');
      return;
    }
    
    if (field === 'startDate' && new Date(value) > new Date(dateRange.endDate)) {
      setError('Start date cannot be after end date');
      return;
    }
    
    if (field === 'endDate' && new Date(value) < new Date(dateRange.startDate)) {
      setError('End date cannot be before start date');
      return;
    }
    
    setError(null);
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
        isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-slate-50 to-slate-100'
      }`}>
        <div className={`flex items-center space-x-3 ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="text-lg font-medium">Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
        isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-slate-50 to-slate-100'
      }`}>
        <div className="text-center">
          <div className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-red-400' : 'text-red-500'}`}>
            {error}
          </div>
          <div className="space-x-4">
            <button
              onClick={handleRefresh}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={handleNavigateBack}
              className={`px-6 py-2 rounded-lg transition-colors ${
                isDarkMode 
                  ? 'bg-gray-600 text-white hover:bg-gray-700' 
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              }`}
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics || !spaceInfo) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
        isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-slate-50 to-slate-100'
      }`}>
        <div className="text-center">
          <div className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
            No analytics data available
          </div>
          <button
            onClick={handleNavigateBack}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  const viewsData = processViewsData();
  const topViewers = getTopViewers();
  const viewsChartData = getViewsData();
  const collaboratorsChartData = getCollaboratorsData();

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-slate-50 to-slate-100'
    }`}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleNavigateToSpace}
              className={`flex items-center space-x-2 transition-colors ${
                isDarkMode 
                  ? 'text-gray-400 hover:text-gray-200' 
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Space</span>
            </button>
            <div className={`h-6 w-px ${isDarkMode ? 'bg-gray-600' : 'bg-slate-300'}`} />
            <div>
              <h1 className={`text-3xl font-bold transition-colors duration-300 ${
                isDarkMode ? 'text-white' : 'text-slate-800'
              }`}>
                {spaceInfo.name} Analytics
              </h1>
              <p className={`mt-1 transition-colors duration-300 ${
                isDarkMode ? 'text-gray-400' : 'text-slate-600'
              }`}>
                Insights and performance metrics for your space
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-lg transition-colors duration-300 ${
                isDarkMode
                  ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600'
                  : 'bg-white text-gray-600 hover:bg-gray-100 shadow-sm'
              }`}
              title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            
            <button
              onClick={handleRefresh}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                isDarkMode 
                  ? 'text-gray-300 hover:bg-gray-800' 
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleExport}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className={`rounded-xl shadow-sm border p-6 mb-8 transition-colors duration-300 ${
          isDarkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Filter className={`h-5 w-5 ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`} />
              <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-slate-700'}`}>
                Filters:
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>
                From:
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => handleDateChange('startDate', e.target.value)}
                className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300 ${
                  isDarkMode 
                    ? 'border-gray-600 bg-gray-700 text-white' 
                    : 'border-slate-300 bg-white text-slate-900'
                }`}
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>
                To:
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                max={new Date().toISOString().split('T')[0]}
                min={dateRange.startDate}
                onChange={(e) => handleDateChange('endDate', e.target.value)}
                className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300 ${
                  isDarkMode 
                    ? 'border-gray-600 bg-gray-700 text-white' 
                    : 'border-slate-300 bg-white text-slate-900'
                }`}
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>
                Group by:
              </label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as 'day' | 'week' | 'month')}
                className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300 ${
                  isDarkMode 
                    ? 'border-gray-600 bg-gray-700 text-white' 
                    : 'border-slate-300 bg-white text-slate-900'
                }`}
              >
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
              </select>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className={`rounded-xl shadow-sm border p-6 transition-colors duration-300 ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>
                  Total Views
                </p>
                <p className="text-3xl font-bold text-blue-600">{analytics.totalViews}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Eye className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className={`rounded-xl shadow-sm border p-6 transition-colors duration-300 ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>
                  Unique Views
                </p>
                <p className="text-3xl font-bold text-green-600">{getUniqueViewersCount()}</p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className={`rounded-xl shadow-sm border p-6 transition-colors duration-300 ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>
                  Snippets
                </p>
                <p className="text-3xl font-bold text-purple-600">{analytics.snippetCount}</p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
          
          <div className={`rounded-xl shadow-sm border p-6 transition-colors duration-300 ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>
                  Collaborators
                </p>
                <p className="text-3xl font-bold text-yellow-600">{analytics.collaboratorCount}</p>
              </div>
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Users className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Views Over Time */}
          <div className={`rounded-xl shadow-sm border p-6 transition-colors duration-300 ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'
          }`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
              Views Over Time
            </h3>
            <div className="h-80">
                {viewsData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={viewsData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#e2e8f0"} />
                            <XAxis 
                                dataKey="date" 
                                stroke={isDarkMode ? "#9CA3AF" : "#64748b"}
                                fontSize={12}
                                tickFormatter={(value) => {
                                    const date = new Date(value);
                                    switch (groupBy) {
                                        case 'day':
                                            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                        case 'week':
                                            return `Week ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                                        case 'month':
                                            return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                                        default:
                                            return date.toLocaleDateString();
                                    }
                                }}
                                interval="preserveStartEnd"
                            />
                            <YAxis stroke={isDarkMode ? "#9CA3AF" : "#64748b"} fontSize={12} />
                            <Tooltip 
                                labelFormatter={(value) => {
                                    const date = new Date(value);
                                    switch (groupBy) {
                                        case 'day':
                                            return date.toLocaleDateString('en-US', { 
                                                weekday: 'long', 
                                                year: 'numeric', 
                                                month: 'long', 
                                                day: 'numeric' 
                                            });
                                        case 'week':
                                            return `Week starting ${date.toLocaleDateString()}`;
                                        case 'month':
                                            return date.toLocaleDateString('en-US', { 
                                                year: 'numeric', 
                                                month: 'long' 
                                            });
                                        default:
                                            return date.toLocaleDateString();
                                    }
                                }}
                                formatter={(value: any) => [value, 'Views']}
                                contentStyle={{
                                    backgroundColor: isDarkMode ? '#1f2937' : '#f8fafc',
                                    border: `1px solid ${isDarkMode ? '#374151' : '#e2e8f0'}`,
                                    borderRadius: '8px',
                                    color: isDarkMode ? '#ffffff' : '#000000'
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="views"
                                stroke="#3B82F6"
                                fill="#3B82F6"
                                fillOpacity={0.1}
                                strokeWidth={2}
                                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                                activeDot={{ r: 6, fill: '#3B82F6' }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div className={`flex items-center justify-center h-full ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                        <div className="text-center">
                            <div className="text-lg font-medium mb-2">No view data available</div>
                            <div className="text-sm">Try adjusting your date range or check back later</div>
                        </div>
                    </div>
                )}
            </div>
          </div>

          {/* Views Distribution Pie Chart */}
          <div className={`rounded-xl shadow-sm border p-6 transition-colors duration-300 ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'
          }`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
              Views Distribution
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={viewsChartData}
                    cx="50%"
                    cy="40%"
                    outerRadius={80}
                    dataKey="value"
                    label={renderCustomLabel}
                    labelLine={false}
                  >
                    {viewsChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any, name: any) => [value, name]}
                    contentStyle={{
                      backgroundColor: isDarkMode ? '#1f2937' : '#f8fafc',
                      border: `1px solid ${isDarkMode ? '#374151' : '#e2e8f0'}`,
                      borderRadius: '8px',
                      color: isDarkMode ? '#ffffff' : '#000000'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Values below chart [44] */}
            <div className="mt-4 flex justify-center space-x-8">
              {viewsChartData.map((entry, index) => (
                <div key={index} className="text-center">
                  <div className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>
                    {entry.name}
                  </div>
                  <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`} style={{ color: entry.color }}>
                    {entry.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Second Row of Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Collaborators Distribution Pie Chart */}
          <div className={`rounded-xl shadow-sm border p-6 transition-colors duration-300 ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'
          }`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
              Collaborators by Role
            </h3>
            <div className="h-80">
              {collaboratorsChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={collaboratorsChartData}
                      cx="50%"
                      cy="40%"
                      outerRadius={80}
                      dataKey="value"
                      label={renderCustomLabel}
                      labelLine={false}
                    >
                      {collaboratorsChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any, name: any) => [value, name]}
                      contentStyle={{
                        backgroundColor: isDarkMode ? '#1f2937' : '#f8fafc',
                        border: `1px solid ${isDarkMode ? '#374151' : '#e2e8f0'}`,
                        borderRadius: '8px',
                        color: isDarkMode ? '#ffffff' : '#000000'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className={`flex items-center justify-center h-full ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                  <div className="text-center">
                    <div className="text-lg font-medium mb-2">No collaborators yet</div>
                    <div className="text-sm">Add collaborators to see role distribution</div>
                  </div>
                </div>
              )}
            </div>
            {/* Values below chart */}
            {collaboratorsChartData.length > 0 && (
              <div className="mt-4 flex justify-center space-x-6">
                {collaboratorsChartData.map((entry, index) => (
                  <div key={index} className="text-center">
                    <div className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>
                      {entry.name}
                    </div>
                    <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`} style={{ color: entry.color }}>
                      {entry.value}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Viewers */}
          <div className={`rounded-xl shadow-sm border p-6 transition-colors duration-300 ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'
          }`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
              Top Viewers
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topViewers} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#e2e8f0"} />
                  <XAxis type="number" stroke={isDarkMode ? "#9CA3AF" : "#64748b"} fontSize={12} />
                  <YAxis 
                    type="category" 
                    dataKey="username" 
                    stroke={isDarkMode ? "#9CA3AF" : "#64748b"} 
                    fontSize={12}
                    width={100}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: isDarkMode ? '#1f2937' : '#f8fafc',
                      border: `1px solid ${isDarkMode ? '#374151' : '#e2e8f0'}`,
                      borderRadius: '8px',
                      color: isDarkMode ? '#ffffff' : '#000000'
                    }}
                  />
                  <Bar dataKey="count" fill="#10B981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className={`rounded-xl shadow-sm border p-6 transition-colors duration-300 ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'
        }`}>
          <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
            Recent Activity
          </h3>
          <div className="space-y-3">
            {analytics.views.slice(0, 10).map((view, _) => (
              <div key={view.id} className={`flex items-center justify-between py-3 border-b last:border-b-0 ${
                isDarkMode ? 'border-gray-700' : 'border-slate-100'
              }`}>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <Eye className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                      {view.user.username}
                    </p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>
                      viewed the space
                    </p>
                  </div>
                </div>
                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                  {new Date(view.viewedAt).toLocaleString()}
                </div>
              </div>
            ))}
            {analytics.views.length === 0 && (
              <p className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                No recent activity to display
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpaceAnalytics;
