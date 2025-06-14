import React, { useState } from 'react';
import { PencilIcon, TrashIcon, EyeIcon, MagnifyingGlassIcon, XCircleIcon, FolderIcon } from '@heroicons/react/24/outline';
import { useApi } from '../hooks/useApi';
import { apiClient } from '../utils/api';
import type { Space } from '../types/admin';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';

const Spaces: React.FC = () => {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset to first page when searching
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: spacesData, loading, refetch } = useApi(
    () => apiClient.getSpaces(page, 20, debouncedSearch),
    [page, debouncedSearch]
  );

  const handleEdit = (space: Space) => {
    setSelectedSpace(space);
    setIsEditModalOpen(true);
  };

  const handleDelete = (space: Space) => {
    setSelectedSpace(space);
    setIsDeleteModalOpen(true);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setPage(1);
  };

  const confirmDelete = async () => {
    if (!selectedSpace) return;
    
    try {
      await apiClient.deleteSpace(selectedSpace.id);
      setIsDeleteModalOpen(false);
      refetch();
    } catch (error) {
      console.error('Error deleting space:', error);
    }
  };

  // Helper function to highlight search terms
  const highlightSearchTerm = (text: string, searchTerm: string) => {
    if (!searchTerm || !text) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    
    return (
      <>
        {parts.map((part, index) => 
          regex.test(part) ? (
            <mark key={index} className="bg-yellow-200 px-1 rounded">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  const columns = [
    {
      key: 'name',
      header: 'Space Name',
      sortable: true,
      render: (space: Space) => (
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <FolderIcon className="h-5 w-5 text-gray-400" />
          </div>
          <div>
            <div className="font-medium text-gray-900">
              {highlightSearchTerm(space.name, debouncedSearch)}
            </div>
            <div className="text-sm text-gray-500">ID: {space.id}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'owner',
      header: 'Owner',
      render: (space: Space) => (
        <div>
          <div className="text-sm font-medium text-gray-900">
            {highlightSearchTerm(space.owner.name, debouncedSearch)}
          </div>
          <div className="text-sm text-gray-500">@{space.owner.username}</div>
        </div>
      ),
    },
    {
      key: '_count',
      header: 'Snippets',
      render: (space: Space) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {space._count.snippets}
        </span>
      ),
    },
    {
      key: '_count',
      header: 'Collaborators',
      render: (space: Space) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          {space._count.collaborators}
        </span>
      ),
    },
    {
      key: '_count',
      header: 'Views',
      render: (space: Space) => (
        <div className="flex items-center space-x-1">
          <EyeIcon className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium">{space._count.views.toLocaleString()}</span>
        </div>
      ),
    },
    {
      key: 'updatedAt',
      header: 'Last Updated',
      sortable: true,
      render: (space: Space) => (
        <div className="text-sm text-gray-900">
          {new Date(space.updatedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (space: Space) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleEdit(space)}
            className="text-indigo-600 hover:text-indigo-900 transition-colors"
            title="Edit space"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(space)}
            className="text-red-600 hover:text-red-900 transition-colors"
            title="Delete space"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Spaces Management
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage all user spaces and their content
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search spaces by name or owner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            {searchTerm && (
              <button
                onClick={handleClearSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <XCircleIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
          
          {debouncedSearch && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>
                {spacesData?.totalSpaces || 0} results for "{debouncedSearch}"
              </span>
              <button
                onClick={handleClearSearch}
                className="text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FolderIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Spaces</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {spacesData?.totalSpaces || 0}
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
                <EyeIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Views</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {spacesData?.spaces?.reduce((sum, space) => sum + space._count.views, 0)?.toLocaleString() || 0}
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
                <div className="w-6 h-6 bg-blue-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-xs font-bold">S</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Snippets</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {spacesData?.spaces?.reduce((sum, space) => sum + space._count.snippets, 0) || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white shadow rounded-lg">
        {/* Search Results Header */}
        {debouncedSearch && (
          <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                <span className="font-medium">{spacesData?.totalSpaces || 0}</span> spaces found
                {debouncedSearch && (
                  <span> matching "<span className="font-medium">{debouncedSearch}</span>"</span>
                )}
              </div>
            </div>
          </div>
        )}

        <Table
          data={spacesData?.spaces || []}
          columns={columns}
          loading={loading}
        />
        
        {/* Empty State */}
        {!loading && spacesData?.spaces?.length === 0 && (
          <div className="px-6 py-12 text-center">
            <FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No spaces found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {debouncedSearch 
                ? `No spaces match your search "${debouncedSearch}".`
                : "There are no spaces to display."
              }
            </p>
            {debouncedSearch && (
              <div className="mt-6">
                <Button variant="secondary" onClick={handleClearSearch}>
                  Clear search
                </Button>
              </div>
            )}
          </div>
        )}
        
        {/* Pagination */}
        {spacesData?.pagination && spacesData.spaces.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {spacesData.spaces.length} of {spacesData.totalSpaces} spaces
                {debouncedSearch && (
                  <span className="ml-2 text-gray-500">
                    (filtered results)
                  </span>
                )}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= (spacesData.pagination.totalPages || 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Space: ${selectedSpace?.name}`}
        size="md"
      >
        <div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Space Name</label>
              <input
                type="text"
                defaultValue={selectedSpace?.name}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Owner</label>
              <p className="mt-1 text-sm text-gray-900">{selectedSpace?.owner.name}</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Snippets</label>
                <p className="text-sm text-gray-900">{selectedSpace?._count.snippets}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Collaborators</label>
                <p className="text-sm text-gray-900">{selectedSpace?._count.collaborators}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Views</label>
                <p className="text-sm text-gray-900">{selectedSpace?._count.views}</p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-6">
            <Button
              variant="secondary"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary">
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Space"
        size="sm"
      >
        <div>
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <TrashIcon className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">
                Delete "{selectedSpace?.name}"
              </h3>
              <p className="text-sm text-gray-500">
                This will delete {selectedSpace?._count.snippets} snippets
              </p>
            </div>
          </div>
          
          <p className="text-sm text-gray-600 mb-4">
            Are you sure you want to delete this space? This will also delete all snippets within this space. This action cannot be undone.
          </p>
          
          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={confirmDelete}
            >
              Delete Space
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Spaces;
