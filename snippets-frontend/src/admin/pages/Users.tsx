// src/pages/Users.tsx
import React, { useState, useMemo } from 'react';
import { PencilIcon, TrashIcon, MagnifyingGlassIcon, XCircleIcon, UserIcon } from '@heroicons/react/24/outline';
import { useApi } from '../hooks/useApi';
import { apiClient } from '../utils/api';
import type { User } from '../types/admin';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import UserForm from '../components/forms/Userform';

const Users: React.FC = () => {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset to first page when searching
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: usersData, loading, refetch } = useApi(
    () => apiClient.getUsers(page, 20, debouncedSearch),
    [page, debouncedSearch]
  );

  // Sort and prioritize search results
  const sortedUsers = useMemo(() => {
    if (!usersData?.users || !debouncedSearch) {
      return usersData?.users || [];
    }

    const searchTerm = debouncedSearch.toLowerCase();
    
    return [...usersData.users].sort((a, b) => {
      const aNameMatch = a?.name?.toLowerCase().includes(searchTerm);
      const aUsernameMatch = a?.username.toLowerCase().includes(searchTerm);
      const bNameMatch = b?.name?.toLowerCase().includes(searchTerm);
      const bUsernameMatch = b.username.toLowerCase().includes(searchTerm);

      // Exact matches first (highest priority)
      const aExactName = a.name?.toLowerCase() === searchTerm;
      const aExactUsername = a.username.toLowerCase() === searchTerm;
      const bExactName = b.name?.toLowerCase() === searchTerm;
      const bExactUsername = b.username.toLowerCase() === searchTerm;

      if (aExactName || aExactUsername) return -1;
      if (bExactName || bExactUsername) return 1;

      // Name starts with search term (second priority)
      const aNameStarts = a.name?.toLowerCase().startsWith(searchTerm);
      const bNameStarts = b.name?.toLowerCase().startsWith(searchTerm);
      
      if (aNameStarts && !bNameStarts) return -1;
      if (bNameStarts && !aNameStarts) return 1;

      // Username starts with search term (third priority)
      const aUsernameStarts = a.username.toLowerCase().startsWith(searchTerm);
      const bUsernameStarts = b.username.toLowerCase().startsWith(searchTerm);
      
      if (aUsernameStarts && !bUsernameStarts) return -1;
      if (bUsernameStarts && !aUsernameStarts) return 1;

      // Name contains search term (fourth priority)
      if (aNameMatch && !bNameMatch) return -1;
      if (bNameMatch && !aNameMatch) return 1;

      // Username contains search term (fifth priority)
      if (aUsernameMatch && !bUsernameMatch) return -1;
      if (bUsernameMatch && !aUsernameMatch) return 1;

      // If both or neither match, maintain original order
      return 0;
    });
  }, [usersData?.users, debouncedSearch]);

  // Calculate match statistics
  const matchStats = useMemo(() => {
    if (!debouncedSearch || !sortedUsers) return null;
    
    const searchTerm = debouncedSearch.toLowerCase();
    const nameMatches = sortedUsers.filter(user => 
      user.name?.toLowerCase().includes(searchTerm)
    ).length;
    const usernameMatches = sortedUsers.filter(user => 
      user.username.toLowerCase().includes(searchTerm)
    ).length;
    
    return { nameMatches, usernameMatches, total: sortedUsers.length };
  }, [sortedUsers, debouncedSearch]);

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setEditError(null);
    setIsEditModalOpen(true);
  };

  const handleDelete = (user: User) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setPage(1);
  };

  const handleUpdateUser = async (userData: { name: string; username: string; role: 'user' | 'admin' }) => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    setEditError(null);

    try {
      await apiClient.updateUser(selectedUser.id, userData);
      setIsEditModalOpen(false);
      refetch();
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedUser) return;
    
    try {
      await apiClient.deleteUser(selectedUser.id);
      setIsDeleteModalOpen(false);
      refetch();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  // Enhanced search term highlighting
  const highlightSearchTerm = (text: string, searchTerm: string) => {
    if (!searchTerm || !text) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    
    return (
      <>
        {parts.map((part, index) => 
          regex.test(part) ? (
            <mark key={index} className="bg-yellow-200 px-1 rounded font-medium">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  // Check if user matches search term
  const isUserMatch = (user: User) => {
    if (!debouncedSearch) return false;
    const searchTerm = debouncedSearch.toLowerCase();
    return user.name?.toLowerCase().includes(searchTerm) || 
           user.username.toLowerCase().includes(searchTerm);
  };

  const columns = [
    {
      key: 'username',
      header: 'Username',
      sortable: true,
      render: (user: User) => {
        const isMatch = isUserMatch(user);
        const isUsernameMatch = debouncedSearch && 
          user.username.toLowerCase().includes(debouncedSearch.toLowerCase());
        
        return (
          <div className="flex items-center space-x-2">
            {isMatch && (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full" title="Search match" />
                {isUsernameMatch && (
                  <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-medium">
                    Username
                  </span>
                )}
              </div>
            )}
            <div>
              <div className="font-medium text-gray-900">
                {highlightSearchTerm(user.username, debouncedSearch)}
              </div>
              <div className="text-sm text-gray-500">@{user.username}</div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (user: User) => {
        const isMatch = isUserMatch(user);
        const isNameMatch = debouncedSearch && 
          user.name?.toLowerCase().includes(debouncedSearch.toLowerCase());
        
        return (
          <div className="flex items-center space-x-2">
            {isMatch && (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full" title="Search match" />
                {isNameMatch && (
                  <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded font-medium">
                    Name
                  </span>
                )}
              </div>
            )}
            <div className="font-medium text-gray-900">
              {highlightSearchTerm(user.name, debouncedSearch)}
            </div>
          </div>
        );
      },
    },
    {
      key: 'role',
      header: 'Role',
      render: (user: User) => (
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
      render: (user: User) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {user._count.spaces}
        </span>
      ),
    },
    {
      key: '_count',
      header: 'Snippets',
      render: (user: User) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          {user._count.snippets}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (user: User) => new Date(user.createdAt).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (user: User) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleEdit(user)}
            className="text-indigo-600 hover:text-indigo-900 transition-colors"
            title="Edit user"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(user)}
            className="text-red-600 hover:text-red-900 transition-colors"
            title="Delete user"
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
            Users Management
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage user accounts and permissions
          </p>
        </div>
      </div>

      {/* Enhanced Search Section */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Users
            </label>
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search by username or name..."
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
              
              {debouncedSearch && matchStats && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <UserIcon className="h-4 w-4" />
                  <span>
                    {matchStats.total} results
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
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white shadow rounded-lg">
        {/* Enhanced Search Results Header */}
        {debouncedSearch && matchStats && (
          <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                <span className="font-medium">{matchStats.total}</span> users found
                {debouncedSearch && (
                  <span> matching "<span className="font-medium">{debouncedSearch}</span>"</span>
                )}
                <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                  <span>Name matches: {matchStats.nameMatches}</span>
                  <span>Username matches: {matchStats.usernameMatches}</span>
                </div>
              </div>
              <div className="text-xs text-gray-500 flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Sorted by relevance</span>
              </div>
            </div>
          </div>
        )}

        <Table
          data={sortedUsers}
          columns={columns}
          loading={loading}
        />
        
        {/* Enhanced Empty State */}
        {!loading && sortedUsers.length === 0 && (
          <div className="px-6 py-12 text-center">
            <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {debouncedSearch 
                ? `No users match your search "${debouncedSearch}" in username or name fields.`
                : "There are no users to display."
              }
            </p>
            {debouncedSearch && (
              <div className="mt-6 space-y-2">
                <p className="text-xs text-gray-400">Try searching with:</p>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• Different keywords</li>
                  <li>• Partial usernames or names</li>
                  <li>• Alternative spellings</li>
                </ul>
                <div className="mt-4">
                  <Button variant="secondary" onClick={handleClearSearch}>
                    Clear search
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Pagination */}
        {usersData?.pagination && sortedUsers.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Page {usersData.pagination.page} of {usersData.pagination.totalPages}
                {debouncedSearch && (
                  <span className="ml-2 text-gray-500">
                    (filtered and sorted results)
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
                  disabled={page >= (usersData.pagination.totalPages || 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit User: ${selectedUser?.name}`}
        size="md"
      >
        {editError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{editError}</p>
          </div>
        )}
        
        <UserForm
          user={selectedUser}
          onSubmit={handleUpdateUser}
          onCancel={() => setIsEditModalOpen(false)}
          loading={isSubmitting}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete User"
        size="sm"
      >
        <div>
          <p className="text-sm text-gray-600 mb-4">
            Are you sure you want to delete user "{selectedUser?.name}" (@{selectedUser?.username})? This action cannot be undone.
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
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Users;
