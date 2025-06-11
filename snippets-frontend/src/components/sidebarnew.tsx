import React from "react";

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
}

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
}) => {
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
    if (dragIndex !== dropIndex) {
      // Convert visual indices to actual snippet order indices
      const orderedSnippets = filteredSnippets.sort((a, b) => {
        const aIndex = snippetOrder.indexOf(a.id);
        const bIndex = snippetOrder.indexOf(b.id);
        if (aIndex === -1 && bIndex === -1) return 0;
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
      
      const draggedSnippet = orderedSnippets[dragIndex];
      const targetSnippet = orderedSnippets[dropIndex];
      
      const originalDragIndex = snippetOrder.indexOf(draggedSnippet.id);
      const originalTargetIndex = snippetOrder.indexOf(targetSnippet.id);
      
      if (originalDragIndex !== -1 && originalTargetIndex !== -1) {
        onReorderSnippets(originalDragIndex, originalTargetIndex);
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Test Sidebar</h2>
        
        {/* Search */}
        <input
          type="text"
          placeholder="Search snippets..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
        />

        {/* Stats */}
        <div className="text-sm text-gray-600">
          Showing {filteredSnippets.length} of {snippets.length} snippets
        </div>
      </div>

      {/* Tag Filters */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700">Tags</h3>
          {tagFilters.size > 0 && (
            <button
              onClick={onClearAllFilters}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {getAllTags().map(tag => {
            const isSelected = tagFilters.has(tag);
            const count = snippets.filter(s => s.tags.includes(tag)).length;

            return (
              <button
                key={tag}
                onClick={() => onToggleTagFilter(tag)}
                className={`px-2 py-1 text-xs rounded border ${
                  isSelected
                    ? 'bg-blue-100 text-blue-800 border-blue-300'
                    : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                }`}
              >
                {tag} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Snippet List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {filteredSnippets
            .sort((a, b) => {
              const aIndex = snippetOrder.indexOf(a.id);
              const bIndex = snippetOrder.indexOf(b.id);
              // If not in order array, put at end
              if (aIndex === -1 && bIndex === -1) return 0;
              if (aIndex === -1) return 1;
              if (bIndex === -1) return -1;
              return aIndex - bIndex;
            })
            .map((snippet, index) => (
            <div
              key={snippet.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              className="p-3 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-move bg-white"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded ${snippet.color}`}></div>
                  <h4 className="font-medium text-gray-900 text-sm">{snippet.title}</h4>
                </div>
                <button
                  onClick={() => onDeleteSnippet(snippet.id)}
                  className="text-gray-400 hover:text-red-600"
                  title="Delete"
                >
                  ×
                </button>
              </div>

              {/* Description */}
              {snippet.description && (
                <p className="text-xs text-gray-600 mb-2">
                  {snippet.description}
                </p>
              )}

              {/* Tags */}
              {snippet.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {snippet.tags.map(tag => (
                    <span
                      key={tag}
                      className="px-1 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Position */}
              <div className="text-xs text-gray-500 mb-2">
                Position: ({Math.round(snippet.x)}, {Math.round(snippet.y)})
              </div>

              {/* Test Actions */}
              <div className="flex gap-2 text-xs">
                <button
                  onClick={() => onUpdateSnippet(snippet.id, {
                    title: `${snippet.title} [UPDATED]`,
                    description: `Updated at ${new Date().toLocaleTimeString()}`
                  })}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Test Update
                </button>
                <button
                  onClick={() => onUpdateSnippet(snippet.id, {
                    x: Math.random() * 500,
                    y: Math.random() * 500
                  })}
                  className="text-green-600 hover:text-green-800"
                >
                  Test Move
                </button>
              </div>

              {/* Debug Info */}
              <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-400">
                <div>ID: {snippet.id.slice(0, 8)}...</div>
                <div>Updated: {new Date(snippet.updatedAt).toLocaleTimeString()}</div>
                <div>Order: {snippetOrder.indexOf(snippet.id)}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredSnippets.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-500 mb-2">
              {searchQuery || tagFilters.size > 0 
                ? 'No matches found' 
                : 'No snippets yet'
              }
            </div>
            <div className="text-xs text-gray-400">
              {searchQuery || tagFilters.size > 0 
                ? 'Try adjusting filters'
                : 'Create a snippet to start'
              }
            </div>
          </div>
        )}
      </div>

      {/* Test Controls Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-600 mb-2">Quick Actions</div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (filteredSnippets.length > 1) {
                onReorderSnippets(0, filteredSnippets.length - 1);
              }
            }}
            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            Test Reorder
          </button>
          <button
            onClick={() => {
              filteredSnippets.forEach(snippet => {
                onUpdateSnippet(snippet.id, {
                  x: Math.random() * 400 + 100,
                  y: Math.random() * 400 + 100
                });
              });
            }}
            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
          >
            Scatter All
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;