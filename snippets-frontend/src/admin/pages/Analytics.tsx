// src/pages/Analytics.tsx
import React, { useState } from 'react';
import { ChartBarIcon, EyeIcon, TrophyIcon } from '@heroicons/react/24/outline';
import { useApi } from '../hooks/useApi';
import { apiClient } from '../utils/api';
import type { AnalyticsViewsResponse, PopularContentResponse } from '../types/admin';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const Analytics: React.FC = () => {
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: '',
  });
  const [viewsParams, setViewsParams] = useState(dateFilter);

  const { data: viewsData, loading: viewsLoading } = useApi<AnalyticsViewsResponse>(
    () => apiClient.getAnalyticsViews(viewsParams),
    [viewsParams]
  );

  const { data: popularData, loading: popularLoading } = useApi<PopularContentResponse>(
    () => apiClient.getPopularContent(),
    []
  );

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setViewsParams(dateFilter);
  };

  const popularSnippetsColumns = [
    {
      key: 'title',
      header: 'Snippet',
      render: (snippet: any) => (
        <div>
          <div className="font-medium text-gray-900">{snippet.title}</div>
          <div className="text-sm text-gray-500">{snippet.space.name}</div>
        </div>
      ),
    },
    {
      key: 'owner',
      header: 'Owner',
      render: (snippet: any) => snippet.owner.name,
    },
    {
      key: '_count',
      header: 'Views',
      render: (snippet: any) => (
        <div className="flex items-center space-x-1">
          <EyeIcon className="h-4 w-4 text-gray-400" />
          <span className="font-medium">
            {snippet.totalViews || snippet._count?.views || 0}
          </span>
        </div>
      ),
    },
  ];

  const popularSpacesColumns = [
    {
      key: 'name',
      header: 'Space',
      render: (space: any) => (
        <div className="font-medium text-gray-900">{space.name}</div>
      ),
    },
    {
      key: 'owner',
      header: 'Owner',
      render: (space: any) => space.owner.name,
    },
    {
      key: '_count',
      header: 'Snippets',
      render: (space: any) => space._count.snippets,
    },
    {
      key: '_count',
      header: 'Views',
      render: (space: any) => (
        <div className="flex items-center space-x-1">
          <EyeIcon className="h-4 w-4 text-gray-400" />
          <span className="font-medium">
            {space.totalViews || space._count?.views || 0}
          </span>
        </div>
      ),
    },
  ];

  const topUsersColumns = [
    {
      key: 'name',
      header: 'User',
      render: (user: any) => (
        <div>
          <div className="font-medium text-gray-900">{user.name}</div>
          <div className="text-sm text-gray-500">@{user.username}</div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (user: any) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          user.role === 'admin' 
            ? 'bg-purple-100 text-purple-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {user.role}
        </span>
      ),
    },
    {
      key: '_count',
      header: 'Spaces',
      render: (user: any) => user._count.spaces,
    },
    {
      key: '_count',
      header: 'Snippets',
      render: (user: any) => user._count.snippets,
    },
  ];

  return (
    <div>
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Analytics Dashboard
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            View detailed analytics and insights about platform usage
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Views</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {viewsData?.totalViews || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <EyeIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Snippet Views</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {viewsData?.totalSnippetViews || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div> */}

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <EyeIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Space Views</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {viewsData?.totalSpaceViews || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrophyIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Top Users</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {popularData?.topUsers?.length || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rest of the component remains the same */}
      {/* Date Filter */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Filter Views by Date</h3>
        <form onSubmit={handleFilterSubmit} className="flex items-end space-x-4">
          <div className="flex-1">
            <Input
              label="Start Date"
              type="date"
              value={dateFilter.startDate}
              onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
            />
          </div>
          <div className="flex-1">
            <Input
              label="End Date"
              type="date"
              value={dateFilter.endDate}
              onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
            />
          </div>
          <div>
            <Button type="submit" loading={viewsLoading}>
              Apply Filter
            </Button>
          </div>
        </form>
      </div>

      {/* Popular Content Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Popular Snippets</h3>
          </div>
          <Table
            data={popularData?.popularSnippets || []}
            columns={popularSnippetsColumns}
            loading={popularLoading}
          />
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Popular Spaces</h3>
          </div>
          <Table
            data={popularData?.popularSpaces || []}
            columns={popularSpacesColumns}
            loading={popularLoading}
          />
        </div>
      </div>

      {/* Top Users */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Top Contributors</h3>
        </div>
        <Table
          data={popularData?.topUsers || []}
          columns={topUsersColumns}
          loading={popularLoading}
        />
      </div>
    </div>
  );
};

export default Analytics;
