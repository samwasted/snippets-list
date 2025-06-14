// src/pages/Dashboard.tsx
import React, { useState } from 'react';
import { 
  ArrowPathIcon, 
  ClockIcon, 
  EyeIcon, 
  UserIcon,
  FolderIcon,
  DocumentTextIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { useApi } from '../hooks/useApi';
import { apiClient } from '../utils/api';
import Button from '../components/ui/Button';

const Dashboard: React.FC = () => {
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const { data: analytics, loading, refetch } = useApi(() => apiClient.getMap());

  const handleRefresh = async () => {
    await refetch();
    setLastRefresh(new Date());
  };

  // Format relative time (e.g., "2 hours ago")
  const formatRelativeTime = (date: string) => {
    const now = new Date();
    const itemDate = new Date(date);
    const diffMs = now.getTime() - itemDate.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return itemDate.toLocaleDateString();
  };

  // Format full timestamp
  const formatFullTime = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header with Refresh Button */}
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Admin Dashboard
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Overview of your platform analytics and recent activity
          </p>
        </div>
        <div className="mt-4 flex items-center space-x-4 md:mt-0 md:ml-4">
          <div className="text-sm text-gray-500">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </div>
          <Button
            variant="secondary"
            onClick={handleRefresh}
            loading={loading}
            className="flex items-center space-x-2"
          >
            <ArrowPathIcon className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-indigo-500 rounded-md flex items-center justify-center">
                  <UserIcon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                  <dd className="text-2xl font-bold text-gray-900">
                    {analytics?.analytics?.totalUsers?.toLocaleString() || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-500 rounded-md flex items-center justify-center">
                  <FolderIcon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Spaces</dt>
                  <dd className="text-2xl font-bold text-gray-900">
                    {analytics?.analytics?.totalSpaces?.toLocaleString() || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-yellow-500 rounded-md flex items-center justify-center">
                  <DocumentTextIcon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Snippets</dt>
                  <dd className="text-2xl font-bold text-gray-900">
                    {analytics?.analytics?.totalSnippets?.toLocaleString() || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Recent Activity */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ClockIcon className="h-5 w-5 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900">
                Recent Activity
              </h3>
            </div>
            <div className="text-sm text-gray-500">
              Showing last {Math.min(analytics?.recentActivity?.length || 0, 10)} activities
            </div>
          </div>
        </div>

        <div className="px-6 py-4">
          {analytics?.recentActivity?.length === 0 ? (
            <div className="text-center py-12">
              <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No recent activity</h3>
              <p className="mt-1 text-sm text-gray-500">
                Activity will appear here as users create snippets and spaces.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {analytics?.recentActivity?.slice(0, 10).map((item: any, index: number) => (
                <div key={item.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  {/* User Avatar */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-white font-semibold text-lg">
                        {item.owner?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                  </div>

                  {/* Activity Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          #{index + 1}
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {item.owner?.name || 'Unknown User'}
                        </span>
                        <span className="text-sm text-gray-500">
                          @{item.owner?.username || 'unknown'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <CalendarIcon className="h-3 w-3" />
                        <span title={formatFullTime(item.createdAt)}>
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-gray-900 mb-2">
                      Created snippet 
                      <span className="font-semibold text-indigo-600 mx-1">
                        "{item.title}"
                      </span>
                      in space
                      <span className="font-medium text-green-600 ml-1">
                        {item.space?.name}
                      </span>
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <EyeIcon className="h-3 w-3" />
                          <span>{item._count?.views || 0} views</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <DocumentTextIcon className="h-3 w-3" />
                          <span>ID: {item.id}</span>
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-400" title={formatFullTime(item.createdAt)}>
                        {formatFullTime(item.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* View More Button */}
        {(analytics?.recentActivity && analytics.recentActivity.length > 10) && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <Button variant="secondary" className="w-full">
              View All Activity
            </Button>
          </div>
        )}
      </div>

      {/* Additional Dashboard Info */}
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {/* Quick Stats */}
        <div className="bg-white shadow rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Quick Stats</h4>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Average snippets per space:</span>
              <span className="font-medium text-gray-900">
                {(analytics?.analytics?.totalSpaces ?? 0) > 0 
                  ? Math.round((analytics?.analytics?.totalSnippets ?? 0) / (analytics?.analytics?.totalSpaces ?? 1))
                  : 0
                }
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Average snippets per user:</span>
              <span className="font-medium text-gray-900">
                {(analytics?.analytics?.totalUsers ?? 0) > 0 
                  ? Math.round((analytics?.analytics?.totalSnippets ?? 0) / (analytics?.analytics?.totalUsers ?? 1))
                  : 0
                }
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Recent activity items:</span>
              <span className="font-medium text-gray-900">
                {analytics?.recentActivity?.length || 0}
              </span>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white shadow rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">System Status</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Dashboard Status:</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Operational
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Last data refresh:</span>
              <span className="font-medium text-gray-900">
                {lastRefresh.toLocaleTimeString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Auto-refresh:</span>
              <span className="font-medium text-gray-900">Manual</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
