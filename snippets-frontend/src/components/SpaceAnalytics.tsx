import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Area, AreaChart, RadialBarChart, RadialBar, Legend } from 'recharts';
import { Calendar, Users, Eye, FileText, TrendingUp, ArrowLeft, Filter, Download, RefreshCw, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
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
  const [analytics, setAnalytics] = useState<SpaceAnalytics | null>(null);
  const [spaceInfo, setSpaceInfo] = useState<SpaceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');
  const [chartType, setChartType] = useState<'pie' | 'radial'>('radial'); 

 const fetchAnalytics = async () => {
    if (!spaceId) return;
    
    try {
        setLoading(true);
        setError(null);
        
        // FIXED: Better date handling with proper timezone conversion
        const startDateTime = new Date(dateRange.startDate + 'T00:00:00.000Z').toISOString();
        const endDateTime = new Date(dateRange.endDate + 'T23:59:59.999Z').toISOString();
        
        const params = new URLSearchParams({
            startDate: startDateTime,
            endDate: endDateTime,
            groupBy: groupBy
        });

        console.log('Fetching analytics with params:', {
            startDate: startDateTime,
            endDate: endDateTime,
            groupBy
        });

        // Fetch space info and analytics
        const [spaceResponse, analyticsResponse] = await Promise.all([
            apiRequest(`/space/${spaceId}`),
            apiRequest(`/space/${spaceId}/analytics?${params.toString()}`)
        ]);

        // FIXED: Better response validation
        if (!spaceResponse?.space) {
            throw new Error('Invalid space response structure');
        }

        if (!analyticsResponse?.analytics) {
            throw new Error('Invalid analytics response structure');
        }

        console.log('Analytics data received:', analyticsResponse.analytics);
        
        setSpaceInfo(spaceResponse.space);
        setAnalytics(analyticsResponse.analytics);
        
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl font-semibold mb-4">Invalid space ID</div>
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
    
    // FIXED: Better date processing with timezone handling
    const viewsByDate: Record<string, number> = {};
    
    analytics.views.forEach(view => {
        let dateKey;
        const date = new Date(view.viewedAt);
        
        // FIXED: Handle timezone properly by using UTC dates
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

    // FIXED: Fill gaps in date range for better visualization
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

  const getEngagementData = () => {
    if (!analytics) return [];
    
    const total = analytics.totalViews + analytics.snippetCount + analytics.collaboratorCount;
    
    if (chartType === 'radial') {
      // For radial bar chart, we need percentage values and specific structure
      return [
        { 
          name: 'Views', 
          value: analytics.totalViews, 
          fill: '#3B82F6',
          percentage: total > 0 ? Math.round((analytics.totalViews / total) * 100) : 0
        },
        { 
          name: 'Snippets', 
          value: analytics.snippetCount, 
          fill: '#10B981',
          percentage: total > 0 ? Math.round((analytics.snippetCount / total) * 100) : 0
        },
        { 
          name: 'Collaborators', 
          value: analytics.collaboratorCount, 
          fill: '#F59E0B',
          percentage: total > 0 ? Math.round((analytics.collaboratorCount / total) * 100) : 0
        }
      ];
    }
    
    // For pie chart
    return [
      { name: 'Views', value: analytics.totalViews, color: '#3B82F6' },
      { name: 'Snippets', value: analytics.snippetCount, color: '#10B981' },
      { name: 'Collaborators', value: analytics.collaboratorCount, color: '#F59E0B' }
    ];
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
          snippetCount: analytics.snippetCount,
          collaboratorCount: analytics.collaboratorCount,
          viewsOverTime: processViewsData(),
          topViewers: getTopViewers()
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

  // Validation helper for date inputs
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="flex items-center space-x-3 text-slate-600">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="text-lg font-medium">Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl font-semibold mb-4">{error}</div>
          <div className="space-x-4">
            <button
              onClick={handleRefresh}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={handleNavigateBack}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-slate-500 text-xl font-semibold mb-4">No analytics data available</div>
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
  const engagementData = getEngagementData();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleNavigateToSpace}
              className="flex items-center space-x-2 text-slate-600 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Space</span>
            </button>
            <div className="h-6 w-px bg-slate-300" />
            <div>
              <h1 className="text-3xl font-bold text-slate-800">
                {spaceInfo.name} Analytics
              </h1>
              <p className="text-slate-600 mt-1">
                Insights and performance metrics for your space
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              className="flex items-center space-x-2 px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
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
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-slate-500" />
              <span className="font-medium text-slate-700">Filters:</span>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-slate-600">From:</label>
              <input
                type="date"
                value={dateRange.startDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => handleDateChange('startDate', e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-slate-600">To:</label>
              <input
                type="date"
                value={dateRange.endDate}
                max={new Date().toISOString().split('T')[0]}
                min={dateRange.startDate}
                onChange={(e) => handleDateChange('endDate', e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-slate-600">Group by:</label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as 'day' | 'week' | 'month')}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Views</p>
                <p className="text-3xl font-bold text-blue-600">{analytics.totalViews}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Eye className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Snippets</p>
                <p className="text-3xl font-bold text-green-600">{analytics.snippetCount}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Collaborators</p>
                <p className="text-3xl font-bold text-yellow-600">{analytics.collaboratorCount}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Users className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Avg. Daily Views</p>
                <p className="text-3xl font-bold text-purple-600">
                  {viewsData.length > 0 ? Math.round(analytics.totalViews / viewsData.length) : 0}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Views Over Time */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Views Over Time</h3>
            <div className="h-80">
                {viewsData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={viewsData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis 
                                dataKey="date" 
                                stroke="#64748b"
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
                            <YAxis stroke="#64748b" fontSize={12} />
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
                                    backgroundColor: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px'
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
                    <div className="flex items-center justify-center h-full text-slate-500">
                        <div className="text-center">
                            <div className="text-lg font-medium mb-2">No view data available</div>
                            <div className="text-sm">Try adjusting your date range or check back later</div>
                        </div>
                    </div>
                )}
            </div>
          </div>

          {/* Engagement Overview with Chart Type Toggle */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Engagement Overview</h3>
              <div className="flex items-center bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setChartType('pie')}
                  className={`flex items-center space-x-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    chartType === 'pie'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  <PieChartIcon className="h-4 w-4" />
                  <span>Pie</span>
                </button>
                <button
                  onClick={() => setChartType('radial')}
                  className={`flex items-center space-x-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    chartType === 'radial'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>Radial</span>
                </button>
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'pie' ? (
                  <PieChart>
                    <Pie
                      data={engagementData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {engagementData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={
                          'color' in entry ? entry.color : entry.fill
                        } />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                ) : (
                  <RadialBarChart
                    cx="50%"
                    cy="50%"
                    innerRadius="20%"
                    outerRadius="90%"
                    data={engagementData}
                  >
                    <RadialBar
                      dataKey="value"
                      cornerRadius={8}
                      label={{
                        position: 'insideStart',
                        fill: '#fff',
                        fontSize: 12,
                        fontWeight: 'bold'
                      }}
                    />
                    <Legend
                      iconType="square"
                      layout="vertical"
                      verticalAlign="middle"
                      align="right"
                      wrapperStyle={{
                        paddingLeft: '20px',
                        fontSize: '14px'
                      }}
                      formatter={(value, entry: any) => `${value}: ${entry.payload.value}`}
                    />
                    <Tooltip
                      formatter={(value: any, name: any) => [value, name]}
                      contentStyle={{
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px'
                      }}
                    />
                  </RadialBarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Top Viewers */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Top Viewers</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topViewers} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" stroke="#64748b" fontSize={12} />
                <YAxis 
                  type="category" 
                  dataKey="username" 
                  stroke="#64748b" 
                  fontSize={12}
                  width={100}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="count" fill="#10B981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {analytics.views.slice(0, 10).map((view, _) => (
              <div key={view.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-b-0">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Eye className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{view.user.username}</p>
                    <p className="text-sm text-slate-600">viewed the space</p>
                  </div>
                </div>
                <div className="text-sm text-slate-500">
                  {new Date(view.viewedAt).toLocaleString()}
                </div>
              </div>
            ))}
            {analytics.views.length === 0 && (
              <p className="text-slate-500 text-center py-8">No recent activity to display</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpaceAnalytics;