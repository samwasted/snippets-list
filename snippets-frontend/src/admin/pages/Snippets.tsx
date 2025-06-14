import React, { useState } from 'react';
import { TrashIcon, EyeIcon, CodeBracketIcon } from '@heroicons/react/24/outline';
import { useApi } from '../hooks/useApi';
import { apiClient } from '../utils/api';
import type { Snippet } from '../types/admin';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';

const Snippets: React.FC = () => {
  const [selectedSnippet, setSelectedSnippet] = useState<Snippet | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [snippetDetails, setSnippetDetails] = useState<any>(null);

  // For demo purposes, we'll use the map endpoint to get recent snippets
  const { data: mapData, loading, refetch } = useApi(() => apiClient.getMap());

  const handleView = async (snippet: Snippet) => {
    try {
      const response = await apiClient.getSnippet(snippet.id);
      setSnippetDetails(response.snippet);
      setSelectedSnippet(snippet);
      setIsViewModalOpen(true);
    } catch (error) {
      console.error('Error fetching snippet details:', error);
    }
  };

  const handleDelete = (snippet: Snippet) => {
    setSelectedSnippet(snippet);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedSnippet) return;
    
    try {
      await apiClient.deleteSnippet(selectedSnippet.id);
      setIsDeleteModalOpen(false);
      refetch();
    } catch (error) {
      console.error('Error deleting snippet:', error);
    }
  };

  const columns = [
    {
      key: 'title',
      header: 'Snippet Title',
      sortable: true,
      render: (snippet: Snippet) => (
        <div className="flex items-center space-x-2">
          <CodeBracketIcon className="h-5 w-5 text-gray-400" />
          <div>
            <div className="font-medium text-gray-900">{snippet.title}</div>
            <div className="text-sm text-gray-500">ID: {snippet.id}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'owner',
      header: 'Owner',
      render: (snippet: Snippet) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{snippet.owner.name}</div>
          <div className="text-sm text-gray-500">@{snippet.owner.username}</div>
        </div>
      ),
    },
    {
      key: 'space',
      header: 'Space',
      render: (snippet: Snippet) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          {snippet.space.name}
        </span>
      ),
    },
    // {
    //   key: '_count',
    //   header: 'Views',
    //   render: (snippet: Snippet) => (
    //     <div className="flex items-center space-x-1">
    //       <EyeIcon className="h-4 w-4 text-gray-400" />
    //       <span>{snippet._count.views}</span>
    //     </div>
    //   ),
    // },
    {
      key: 'createdAt',
      header: 'Created',
      render: (snippet: Snippet) => new Date(snippet.createdAt).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (snippet: Snippet) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleView(snippet)}
            className="text-blue-600 hover:text-blue-900"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(snippet)}
            className="text-red-600 hover:text-red-900"
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
            Snippets Management
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            View and manage all code snippets across all spaces
          </p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <Table
          data={mapData?.recentActivity || []}
          columns={columns}
          loading={loading}
        />
      </div>

      {/* View Snippet Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={`Snippet: ${selectedSnippet?.title}`}
        size="lg"
      >
        {snippetDetails && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Owner</label>
                <p className="text-sm text-gray-900">{snippetDetails.owner.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Space</label>
                <p className="text-sm text-gray-900">{snippetDetails.space.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Views</label>
                <p className="text-sm text-gray-900">{snippetDetails._count.views}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Created</label>
                <p className="text-sm text-gray-900">
                  {new Date(snippetDetails.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => setIsViewModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Snippet"
        size="sm"
      >
        <div>
          <p className="text-sm text-gray-600 mb-4">
            Are you sure you want to delete snippet "{selectedSnippet?.title}"? This action cannot be undone.
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
              Delete Snippet
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Snippets;