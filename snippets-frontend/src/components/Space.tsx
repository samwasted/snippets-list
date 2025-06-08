import React, { useState, useRef, useEffect } from "react";
import { animate } from "framer-motion";
import Box from "./Box";
import EditModal from "./EditModal";
import TagColorMenu from "./TagColorMenu";
import Sidebar from "./Sidebar";
import { colors, type TagColorMenuState, type Space, type SpaceCollaborator, type User, type Snippet } from "./types";
import { useSpaceWebSocket } from "./useSpaceWebSocket";
import { useParams } from 'react-router-dom';
import { apiRequest } from './api';

interface SpaceProps {
  spaceData?: Space;
  initialSnippets?: Snippet[];
  currentUser?: User;
  collaborators?: SpaceCollaborator[];
  authToken?: string;
}

export default function Space({
  spaceData,
  initialSnippets = [],
  currentUser,
  collaborators = [],
  authToken
}: SpaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const { spaceId } = useParams<{ spaceId: string }>();

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch space data using axios
  const fetchSpaceData = async (spaceId: string) => {
    try {
      const data = await apiRequest(`/space/${spaceId}`);
      setSnippets(data.snippets || []);
      setSnippetOrder(data.order || []);
    } catch (error) {
      console.error("Failed to fetch space data:", error);
    }
  };

  useEffect(() => {
    if (spaceId) {
      fetchSpaceData(spaceId);
    }
  }, [spaceId]);

  // Pan and zoom state
  const [scale, setScale] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Content state
  const [snippets, setSnippets] = useState<Snippet[]>(initialSnippets);
  const [snippetOrder, setSnippetOrder] = useState<string[]>(spaceData?.order || []);

  // Edit state
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editCode, setEditCode] = useState("");
  const [editCodeLanguage, setEditCodeLanguage] = useState("javascript");
  const [newTag, setNewTag] = useState("");
  
  // Filter state
  const [tagFilters, setTagFilters] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [tagColorMenu, setTagColorMenu] = useState<TagColorMenuState>({
    show: false, tag: "", x: 0, y: 0
  });

  // WebSocket and permissions
  const { 
    sendSnippetMove, 
    sendSnippetCreate, 
    sendSnippetDelete, 
    sendSnippetUpdate,
    lastMessage,
    isConnected,
    isJoined,
    joinSpace
  } = useSpaceWebSocket({
    spaceId,
    userId: currentUser?.id,
    token: authToken,
    enabled: true
  });

  const userRole = collaborators.find(c => c.userId === currentUser?.id)?.role || 'VIEWER';
  const canEdit = userRole === 'EDITOR' || userRole === 'ADMIN' || spaceData?.ownerId === currentUser?.id;

  // WebSocket message handling
  useEffect(() => {
    if (!lastMessage) return;

    switch (lastMessage.type) {
      case 'snippet-moved':
        if (lastMessage.payload.movedBy !== currentUser?.id) {
          setSnippets(prev => prev.map(snippet =>
            snippet.id === lastMessage.payload.snippetId ? {
              ...snippet,
              x: Math.round(lastMessage.payload.x),
              y: Math.round(lastMessage.payload.y),
              updatedAt: new Date(lastMessage.payload.updatedAt || Date.now())
            } : snippet
          ));
        }
        break;

      case 'snippet-created':
        setSnippets(prev => {
          const exists = prev.some(s => s.id === lastMessage.payload.id);
          if (!exists) {
            const newSnippet: Snippet = {
              ...lastMessage.payload,
              x: Math.round(lastMessage.payload.x),
              y: Math.round(lastMessage.payload.y),
              createdAt: new Date(lastMessage.payload.createdAt || Date.now()),
              updatedAt: new Date(lastMessage.payload.updatedAt || Date.now()),
              spaceId: spaceId || "failed",
              ownerId: spaceData?.ownerId || "failed to get owner id"
            };
            return [...prev, newSnippet];
          }
          return prev;
        });
        break;

      case 'snippet-deleted':
        setSnippets(prev => prev.filter(snippet => snippet.id !== lastMessage.payload.snippetId));
        break;

      case 'snippet-updated':
        setSnippets(prev => prev.map(snippet =>
          snippet.id === lastMessage.payload.id ? {
            ...snippet,
            ...lastMessage.payload,
            x: Math.round(lastMessage.payload.x || snippet.x),
            y: Math.round(lastMessage.payload.y || snippet.y),
            updatedAt: new Date(lastMessage.payload.updatedAt || Date.now())
          } : snippet
        ));
        break;

      case 'user-joined':
        console.log(`User joined: ${lastMessage.payload.userId}`);
        break;

      case 'user-left':
        console.log(`User left: ${lastMessage.payload.userId}`);
        break;

      case 'space-joined':
        console.log('Successfully joined space');
        break;

      case 'join-rejected':
        console.error('Failed to join space:', lastMessage.payload);
        break;

      case 'error':
        console.error('WebSocket error:', lastMessage.payload);
        break;

      default:
        console.log('Unknown message type:', lastMessage.type);
    }
  }, [lastMessage, currentUser?.id, spaceId, spaceData?.ownerId]);

  // Join space when token is available
  useEffect(() => {
    if (authToken && isConnected && !isJoined) {
      joinSpace(authToken);
    }
  }, [authToken, isConnected, isJoined, joinSpace]);

  // Cleanup and initialization effects
  useEffect(() => {
    return () => {
      Object.values(debounceRef.current).forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    const currentIds = snippets.map(snippet => snippet.id);
    const newIds = currentIds.filter(id => !snippetOrder.includes(id));
    const validIds = snippetOrder.filter(id => currentIds.includes(id));
    setSnippetOrder([...validIds, ...newIds]);
  }, [snippets.length]);

  useEffect(() => {
    const handleClickOutside = () => {
      setTagColorMenu({ show: false, tag: "", x: 0, y: 0 });
    };
    if (tagColorMenu.show) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [tagColorMenu.show]);

  // Pan and zoom handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isOnCanvas = canvasRef.current?.contains(target) || target === canvasRef.current;

    if (!isOnCanvas) return;

    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setPanStart({ x: panX, y: panY });
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      setPanX(Math.round(panStart.x + deltaX));
      setPanY(Math.round(panStart.y + deltaY));
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, dragStart, panStart]);

  const handleWheel = (e: React.WheelEvent) => {
    if (!canvasRef.current?.contains(e.target as HTMLElement)) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(prev => Math.max(0.5, Math.min(3, prev + delta)));
  };

  const zoom = (delta: number) => setScale(prev => Math.max(0.5, Math.min(3, prev + delta)));

  // Utility functions
 const getAllTags = () => {
  const tagSet = new Set<string>();

  if (!Array.isArray(snippets)) return [];

  snippets.forEach(snippet => {
    snippet.tags?.forEach(tag => tagSet.add(tag));
  });

  return Array.from(tagSet).sort();
};


  const resetEditState = () => {
    setEditingSnippet(null);
    setEditTitle("");
    setEditDescription("");
    setEditColor("");
    setEditTags([]);
    setEditCode("");
    setNewTag("");
  };

  const matchesSearch = (snippet: Snippet, query: string) => {
    if (!query.trim()) return true;
    const searchTerm = query.toLowerCase().trim();
    return (
      snippet.title.toLowerCase().includes(searchTerm) ||
      (snippet.description && snippet.description.toLowerCase().includes(searchTerm)) ||
      snippet.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
      snippet.files.some(file => file.toLowerCase().includes(searchTerm)) ||
      (snippet.code && snippet.code.toLowerCase().includes(searchTerm))
    );
  };

  // File handling
  const handleFilesChanged = (id: string, files: File[]) => {
    if (!canEdit) return;

    const filePaths = files.map(file => file.name);

    setSnippets(prevSnippets =>
      prevSnippets.map(snippet =>
        snippet.id === id ? {
          ...snippet,
          files: filePaths,
          updatedAt: new Date()
        } : snippet
      )
    );
  };

  // Snippet operations
  const addSnippet = async () => {
    if (!canEdit) return;

    const newSnippetData = {
      title: `New Snippet`,
      description: "",
      code: "",
      tags: [],
      color: colors[Math.floor(Math.random() * colors.length)],
      files: [],
      x: Math.round(Math.random() * 400 + 200),
      y: Math.round(Math.random() * 400 + 200),
      spaceId: spaceId || null
    };

    try {
      const createdSnippet = await apiRequest(`/space/${spaceId}/snippet`, {
        method: "POST",
        body: JSON.stringify(newSnippetData)
      });

      createdSnippet.x = Math.round(createdSnippet.x);
      createdSnippet.y = Math.round(createdSnippet.y);

      setSnippets(prev => [...prev, createdSnippet]);

      if (sendSnippetCreate && isJoined) {
        sendSnippetCreate({
          ...createdSnippet,
          createdAt: createdSnippet.createdAt?.toString() ?? new Date().toISOString(),
          updatedAt: createdSnippet.updatedAt?.toString() ?? new Date().toISOString()
        });
      }
    } catch (error) {
      console.error("Failed to create snippet:", error);
    }
  };

  const startEditing = (snippet: Snippet) => {
    if (!canEdit) return;

    setEditingSnippet(snippet);
    setEditTitle(snippet.title);
    setEditDescription(snippet.description || "");
    setEditColor(snippet.color || "bg-blue-400");
    setEditTags([...snippet.tags]);
    setEditCode(snippet.code || "");
    setEditCodeLanguage("javascript");
    setNewTag("");
  };

  const saveEdit = async () => {
    if (!editingSnippet || !canEdit) return;
    
    const updatedSnippet = {
      ...editingSnippet,
      title: editTitle,
      description: editDescription || undefined,
      color: editColor,
      tags: editTags,
      code: editCode || undefined,
      x: Math.round(editingSnippet.x),
      y: Math.round(editingSnippet.y),
      updatedAt: new Date()
    };
    
    setSnippets(prev => prev.map(snippet => 
      snippet.id === editingSnippet.id ? updatedSnippet : snippet
    ));
    
    resetEditState();
    
    try {
      const response = await apiRequest(`/space/${spaceId}/snippet/${editingSnippet.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedSnippet)
      });

      if (response.ok) {
        const saved = await response.json();
        saved.x = Math.round(saved.x);
        saved.y = Math.round(saved.y);
        setSnippets(prev => prev.map(s => s.id === editingSnippet.id ? saved : s));

        if (sendSnippetUpdate && isJoined) {
          sendSnippetUpdate({
            ...saved,
            updatedAt: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error("Failed to update snippet:", error);
    }
  };

  const deleteSnippet = async (id: string) => {
    if (!canEdit) return;

    setSnippets(prev => prev.filter(s => s.id !== id));

    try {
      await apiRequest(`/space/${spaceId}/snippet/${id}`, { method: "DELETE" });
      
      if (sendSnippetDelete && isJoined) {
        sendSnippetDelete({ snippetId: id });
      }
    } catch (error) {
      console.error("Failed to delete snippet:", error);
    }
  };

  const updateSnippet = async (id: string, deltaX: number, deltaY: number) => {
    if (!canEdit) return;

    const currentSnippet = snippets.find(s => s.id === id);
    if (!currentSnippet) return;

    const newX = Math.round(currentSnippet.x + Math.round(deltaX / scale));
    const newY = Math.round(currentSnippet.y + Math.round(deltaY / scale));

    setSnippets(prev => prev.map(s =>
      s.id === id ? {
        ...s,
        x: newX,
        y: newY,
        updatedAt: new Date()
      } : s
    ));

    if (sendSnippetMove && isJoined) {
      sendSnippetMove({
        snippetId: id,
        x: newX,
        y: newY
      });
    }

    if (debounceRef.current[id]) clearTimeout(debounceRef.current[id]);
    debounceRef.current[id] = setTimeout(async () => {
      const current = snippets.find(s => s.id === id);
      if (current) {
        try {
          await apiRequest(`/space/${spaceId}/snippet/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              x: Math.round(current.x),
              y: Math.round(current.y)
            })
          });
        } catch (error) {
          console.error("Position update failed:", error);
        }
      }
    }, 1000);
  };

  // Navigation and filtering
  const navigateToSnippet = (snippet: Snippet) => {
    const centerX = Math.round(-snippet.x * scale + window.innerWidth / 2 - 96);
    const centerY = Math.round(-snippet.y * scale + window.innerHeight / 2 - 64);

    animate(panX, centerX, { 
      type: "spring", 
      stiffness: 100, 
      damping: 20,
      onUpdate: (value) => setPanX(Math.round(value))
    });
    animate(panY, centerY, { 
      type: "spring", 
      stiffness: 100, 
      damping: 20,
      onUpdate: (value) => setPanY(Math.round(value))
    });

    // Close sidebar after navigation on mobile
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const toggleTagFilter = (tag: string) => {
    setTagFilters(prev => {
      const newFilters = new Set(prev);
      if (newFilters.has(tag)) {
        newFilters.delete(tag);
      } else {
        newFilters.add(tag);
      }
      return newFilters;
    });
  };

  const clearAllFilters = () => {
    setTagFilters(new Set());
    setSearchQuery("");
  };

  const reorderSnippets = async (startIndex: number, endIndex: number) => {
    if (!canEdit) return;
    
    const newOrder = [...snippetOrder];
    const [removed] = newOrder.splice(startIndex, 1);
    newOrder.splice(endIndex, 0, removed);
    setSnippetOrder(newOrder);
    
    try {
      await apiRequest(`/space/${spaceId}/order`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: newOrder })
      });
    } catch (error) {
      console.error("Failed to update order:", error);
    }
  };

  // Tag management
  const addTag = () => {
    const trimmedTag = newTag.trim().toLowerCase();
    if (trimmedTag && !editTags.includes(trimmedTag)) {
      setEditTags(prev => [...prev, trimmedTag]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setEditTags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const handleTagRightClick = (e: React.MouseEvent, tag: string) => {
    if (!canEdit) return;
    
    e.preventDefault();
    e.stopPropagation();
    setTagColorMenu({
      show: true,
      tag: tag,
      x: Math.round(e.clientX),
      y: Math.round(e.clientY)
    });
  };

  const changeTagColor = async (tag: string, color: string) => {
    if (!canEdit) return;
    
    setSnippets(prev => prev.map(snippet => 
      snippet.tags.includes(tag) 
        ? { ...snippet, color: color, updatedAt: new Date() }
        : snippet
    ));
    setTagColorMenu({ show: false, tag: "", x: 0, y: 0 });
  };

  // Filter and sort snippets
  const filteredSnippets = snippets.filter(snippet => {
    if (!matchesSearch(snippet, searchQuery)) return false;
    if (tagFilters.size > 0) {
      const hasSelectedTag = snippet.tags.some(tag => tagFilters.has(tag));
      if (!hasSelectedTag) return false;
    }
    return true;
  });

  const sortedSnippets = filteredSnippets.sort((a, b) => {
    const aIndex = snippetOrder.indexOf(a.id);
    const bIndex = snippetOrder.indexOf(b.id);
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  // Ensure snippets have totalViews property for sidebar compatibility and spaceId is always a string
  const snippetsWithViews = snippets.map(snippet => ({
    ...snippet,
    totalViews: snippet.totalViews ?? 0,
    spaceId: snippet.spaceId ?? (spaceId || "unknown")
  }));

  const sortedSnippetsWithViews = sortedSnippets.map(snippet => ({
    ...snippet,
    totalViews: snippet.totalViews ?? 0,
    spaceId: snippet.spaceId ?? (spaceId || "unknown")
  }));

  return (
    <div className="flex h-screen bg-gray-300">
      {/* Fixed Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0 md:static md:inset-0`}>
        <Sidebar 
          boxes={snippetsWithViews}
          visibleBoxes={sortedSnippetsWithViews}
          boxOrder={snippetOrder}
          searchQuery={searchQuery}
          tagFilters={tagFilters}
          getAllTags={getAllTags}
          onSearchChange={setSearchQuery}
          onToggleTagFilter={toggleTagFilter}
          onClearAllFilters={clearAllFilters}
          onTagRightClick={handleTagRightClick}
          onNavigateToBox={snippet => navigateToSnippet({ ...snippet, totalViews: snippet.totalViews ?? 0 })}
          onReorderBoxes={reorderSnippets}
          onStartEditing={snippet => startEditing({ ...snippet, totalViews: snippet.totalViews ?? 0 })}
          canEdit={canEdit}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:ml-0">
        {/* Header Controls */}
        <div className="flex items-center justify-between p-4 bg-white shadow-sm border-b z-20">
          <div className="flex items-center gap-2">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Space info */}
            {spaceData && (
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-gray-900">{spaceData.name}</h1>
                {!spaceData.isPublic && (
                  <span className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">
                    Private
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom controls */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-md p-1">
              <button 
                onClick={() => zoom(-0.2)} 
                className="p-1 text-gray-600 hover:text-gray-900 hover:bg-white rounded"
                title="Zoom out"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="px-2 text-sm text-gray-600 min-w-[3rem] text-center">
                {Math.round(scale * 100)}%
              </span>
              <button 
                onClick={() => zoom(0.2)} 
                className="p-1 text-gray-600 hover:text-gray-900 hover:bg-white rounded"
                title="Zoom in"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
            </div>

            {/* Add snippet button */}
            {canEdit && (
              <button 
                onClick={addSnippet} 
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span className="hidden sm:inline">Add Snippet</span>
              </button>
            )}

            {/* WebSocket status indicator */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
              isJoined ? 'bg-green-100 text-green-800' : 
              isConnected ? 'bg-yellow-100 text-yellow-800' : 
              'bg-red-100 text-red-800'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isJoined ? 'bg-green-600' : 
                isConnected ? 'bg-yellow-600' : 
                'bg-red-600'
              }`} />
              <span className="hidden sm:inline">
                {isJoined ? 'Connected' : isConnected ? 'Joining...' : 'Disconnected'}
              </span>
            </div>

            {/* User info */}
            {currentUser && (
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-md">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                  {(currentUser.name || currentUser.username || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block">
                  <div className="text-sm font-medium text-gray-900">
                    {currentUser.name || currentUser.username}
                  </div>
                  <div className="text-xs text-gray-500">{userRole}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Canvas Container */}
        <div 
          ref={containerRef}
          className="flex-1 relative overflow-hidden"
          onWheel={handleWheel}
        >
          {/* Tag Color Menu */}
          {tagColorMenu.show && (
            <TagColorMenu 
              tag={tagColorMenu.tag}
              x={tagColorMenu.x}
              y={tagColorMenu.y}
              onColorSelect={changeTagColor}
              onClose={() => setTagColorMenu({ show: false, tag: "", x: 0, y: 0 })}
            />
          )}

          {/* Edit Modal */}
          {editingSnippet && (
            <EditModal 
              editingSnippet={editingSnippet}
              editTitle={editTitle}
              editDescription={editDescription}
              editColor={editColor}
              editTags={editTags}
              editCode={editCode}
              editCodeLanguage={editCodeLanguage}
              newTag={newTag}
              onTitleChange={setEditTitle}
              onDescriptionChange={setEditDescription}
              onColorChange={setEditColor}
              onTagsChange={setEditTags}
              onCodeChange={setEditCode}
              onCodeLanguageChange={setEditCodeLanguage}
              onNewTagChange={setNewTag}
              onAddTag={addTag}
              onRemoveTag={removeTag}
              onTagKeyPress={handleTagKeyPress}
              onSave={saveEdit}
              onCancel={resetEditState}
              onDelete={deleteSnippet}
              canDelete={canEdit}
            />
          )}

          {/* Canvas */}
          <div
            ref={canvasRef}
            className="w-full h-full cursor-grab"
            style={{
              transform: `scale(${scale}) translate(${panX}px, ${panY}px)`,
              cursor: isDragging ? 'grabbing' : 'grab'
            }}
            onMouseDown={handleMouseDown}
          >
            {sortedSnippets.map(snippet => (
              <Box
                key={snippet.id}
                snippet={snippet}
                scale={scale}
                onUpdatePosition={updateSnippet}
                onStartEditing={startEditing}
                onTagRightClick={handleTagRightClick}
                onFilesChanged={handleFilesChanged}
                canEdit={canEdit}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}