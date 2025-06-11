import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import { useSpaceWebSocket } from "./useSpaceWebSocket";

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

interface Space {
  id: string;
  name: string;
  order: string[];
  isPublic: boolean;
  ownerId: string;
}

const API_BASE_URL = 'http://localhost:3000/api/v1';

const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token') || 'mock-token';
  const url = `${API_BASE_URL}${endpoint}`;
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  };

  const response = await fetch(url, config);
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
};

export default function Space() {
  const spaceId = window.location.pathname.split('/').pop() || "";
  const [currentUser, setCurrentUser] = useState<{ 
  id: string; 
  name: string | null; 
  username?: string; 
  role?: string 
}>({ 
  id: "", 
  name: null 
});

useEffect(() => {
  const fetchUserMetadata = async () => {
    try {
      const response = await apiRequest('/user/metadata');
      if (response && response.metadata) {
        setCurrentUser({
          id: response.metadata.id,
          name: response.metadata.name,
          username: response.metadata.username,
          role: response.metadata.role
        });
      }
    } catch (error) {
      console.error("Failed to fetch user metadata:", error);
    }
  };
  
  fetchUserMetadata();
}, []);

  const [authToken, setAuthToken] = useState<string | undefined>(() => {
    return localStorage.getItem('token') || undefined;
  });
  
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [snippetOrder, setSnippetOrder] = useState<string[]>([]);
  const [spaceData, setSpaceData] = useState<Space | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tagFilters, setTagFilters] = useState<Set<string>>(new Set());

  const { 
    sendSnippetMove, 
    sendSnippetCreate, 
    sendSnippetDelete, 
    sendSnippetUpdate,
    lastMessage,
    isConnected,
    isJoined,
    joinSpace,
    connectionState,
    lastError,
    userPermissions
  } = useSpaceWebSocket({
    spaceId,
    userId: currentUser.id,
    token: authToken,
    enabled: true
  });

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token') {
        setAuthToken(e.newValue || undefined);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    fetchSpaceData();
  }, []);

  // FIXED: Enhanced WebSocket message handling with proper userId check
  useEffect(() => {
    if (!lastMessage) return;

    console.log('Processing WebSocket message:', lastMessage);

    // Check if message is from current user to avoid applying duplicate updates
    const isFromCurrentUser = lastMessage.userId === currentUser.id;
    console.log('Message from current user:', isFromCurrentUser, lastMessage.userId, currentUser.id);

    // For received messages from other users, apply updates
    if (!isFromCurrentUser) {
      switch (lastMessage.type) {
        case 'snippet-moved':
          setSnippets(prev => prev.map(snippet => {
            // Support both id and snippetId in payload
            if (snippet.id === lastMessage.payload.id || snippet.id === lastMessage.payload.snippetId) {
              const updatedSnippet = {
                ...snippet,
                x: Math.round(lastMessage.payload.x ?? snippet.x),
                y: Math.round(lastMessage.payload.y ?? snippet.y),
                updatedAt: new Date(lastMessage.payload.updatedAt || Date.now())
              };
              console.log('Updated snippet position:', updatedSnippet);
              return updatedSnippet;
            }
            return snippet;
          }));
          break;

        case 'snippet-created':
          setSnippets(prev => {
            const snippetId = lastMessage.payload.id || lastMessage.payload.snippetId;
            // Check if snippet already exists to avoid duplicates
            const exists = prev.some(s => s.id === snippetId);
            if (exists) {
              console.log('Snippet already exists, skipping creation');
              return prev;
            }
            
            const newSnippet: Snippet = {
              id: snippetId || `ws_${Date.now()}`,
              title: lastMessage.payload.title || 'Untitled Snippet',
              description: lastMessage.payload.description || '',
              code: lastMessage.payload.code || '',
              tags: Array.isArray(lastMessage.payload.tags) ? lastMessage.payload.tags : [],
              color: lastMessage.payload.color || 'bg-gray-400',
              x: Math.round(lastMessage.payload.x ?? 100),
              y: Math.round(lastMessage.payload.y ?? 100),
              spaceId: lastMessage.payload.spaceId || spaceId,
              ownerId: lastMessage.payload.ownerId || lastMessage.payload.createdBy || lastMessage.userId || currentUser.id,
              createdAt: new Date(lastMessage.payload.createdAt || Date.now()),
              updatedAt: new Date(lastMessage.payload.updatedAt || Date.now())
            };
            
            console.log('Adding new snippet from WebSocket:', newSnippet);
            return [...prev, newSnippet];
          });
          
          // Update order with functional update
          setSnippetOrder(prev => {
            const snippetId = lastMessage.payload.id || lastMessage.payload.snippetId;
            if (!snippetId || prev.includes(snippetId)) return prev;
            return [...prev, snippetId];
          });
          break;

        case 'snippet-deleted':
          const deletedId = lastMessage.payload.snippetId || lastMessage.payload.id;
          if (deletedId) {
            console.log('Deleting snippet from WebSocket:', deletedId);
            setSnippets(prev => prev.filter(snippet => snippet.id !== deletedId));
            setSnippetOrder(prev => prev.filter(id => id !== deletedId));
          }
          break;

        case 'snippet-updated':
          setSnippets(prev => prev.map(snippet => {
            const targetId = lastMessage.payload.id || lastMessage.payload.snippetId;
            if (snippet.id === targetId) {
              const updatedSnippet = {
                ...snippet,
                ...(lastMessage.payload.title !== undefined && { title: lastMessage.payload.title }),
                ...(lastMessage.payload.description !== undefined && { description: lastMessage.payload.description }),
                ...(lastMessage.payload.code !== undefined && { code: lastMessage.payload.code }),
                ...(Array.isArray(lastMessage.payload.tags) && { tags: lastMessage.payload.tags }),
                ...(lastMessage.payload.color !== undefined && { color: lastMessage.payload.color }),
                ...(lastMessage.payload.x !== undefined && { x: Math.round(lastMessage.payload.x) }),
                ...(lastMessage.payload.y !== undefined && { y: Math.round(lastMessage.payload.y) }),
                updatedAt: new Date(lastMessage.payload.updatedAt || Date.now())
              };
              
              console.log('Snippet updated from WebSocket:', updatedSnippet);
              return updatedSnippet;
            }
            return snippet;
          }));
          break;

        case 'space-view':
          if (lastMessage.payload.order && Array.isArray(lastMessage.payload.order)) {
            console.log('Updating snippet order from WebSocket:', lastMessage.payload.order);
            setSnippetOrder(lastMessage.payload.order);
          }
          break;

        default:
          console.log('Unknown or unhandled WebSocket message type:', lastMessage.type);
          break;
      }
    } else {
      console.log('Ignoring message from current user to prevent duplication');
    }
  }, [lastMessage, currentUser.id, spaceId]);

  const fetchSpaceData = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching space data via HTTP...');
      
      const spaceResponse = await apiRequest(`/space/${spaceId}`);
      console.log('Space data received:', spaceResponse);
      
      if (spaceResponse.space) {
        const space = spaceResponse.space;
        setSpaceData(space);
        
        if (space.snippets) {
          setSnippets(space.snippets);
        }
        
        if (space.order && Array.isArray(space.order) && space.order.length > 0) {
          setSnippetOrder(space.order);
        } else if (space.snippets) {
          const defaultOrder = space.snippets
            .sort((a: Snippet, b: Snippet) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            .map((snippet: Snippet) => snippet.id);
          setSnippetOrder(defaultOrder);
        }
      }
      
    } catch (error) {
      console.error("HTTP: Failed to fetch space data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // FIXED: Enhanced create function with optimistic updates
  const addSnippet = async () => {
    const newSnippetData = {
      title: `Test Snippet ${Date.now()}`,
      description: "Test description",
      code: "console.log('Hello World');",
      tags: ["test", "demo"],
      color: "bg-blue-400",
      x: Math.round(Math.random() * 400 + 200),
      y: Math.round(Math.random() * 400 + 200),
      spaceId: spaceId
    };

    try {
      // First create via HTTP
      console.log('Creating snippet via HTTP...', newSnippetData);
      const response = await apiRequest(`/space/${spaceId}/snippet`, {
        method: "POST",
        body: JSON.stringify(newSnippetData)
      });
      console.log('Snippet created via HTTP:', response);

      // Create an optimistic local version
      const createdSnippet: Snippet = {
        id: response.snippet.id,
        title: response.snippet.title,
        description: response.snippet.description || newSnippetData.description,
        code: response.snippet.code || newSnippetData.code,
        tags: Array.isArray(response.snippet.tags) ? response.snippet.tags : newSnippetData.tags,
        color: response.snippet.color || newSnippetData.color,
        x: Math.round(response.snippet.x),
        y: Math.round(response.snippet.y),
        spaceId: spaceId,
        ownerId: currentUser.id,
        createdAt: new Date(response.snippet.createdAt),
        updatedAt: new Date(response.snippet.updatedAt)
      };
      
      // Add to local state with functional update
      setSnippets(prev => {
        const exists = prev.some(s => s.id === createdSnippet.id);
        if (exists) return prev;
        return [...prev, createdSnippet];
      });
      
      setSnippetOrder(prev => {
        if (prev.includes(createdSnippet.id)) return prev;
        return [...prev, createdSnippet.id];
      });

      // Then broadcast to others via WebSocket
      if (sendSnippetCreate && isJoined) {
        console.log('Broadcasting snippet creation via WebSocket...');
        await sendSnippetCreate({
          title: createdSnippet.title,
          description: createdSnippet.description,
          code: createdSnippet.code,
          tags: createdSnippet.tags,
          color: createdSnippet.color,
          files: [],
          x: Math.round(createdSnippet.x),
          y: Math.round(createdSnippet.y)
        });
      }
    } catch (error) {
      console.error("HTTP: Failed to create snippet:", error);
    }
  };

  // FIXED: Enhanced update function
  const updateSnippet = async (id: string, updates: Partial<Snippet>) => {
    // Round coordinates if present
    const processedUpdates = {
      ...updates,
      ...(updates.x !== undefined && { x: Math.round(updates.x) }),
      ...(updates.y !== undefined && { y: Math.round(updates.y) })
    };

    // Apply optimistic update immediately
    setSnippets(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, ...processedUpdates, updatedAt: new Date() };
      }
      return s;
    }));

    try {
      // Update via HTTP
      console.log('Updating snippet via HTTP...', { id, updates: processedUpdates });
      await apiRequest(`/space/${spaceId}/snippet/${id}`, {
        method: "PUT",
        body: JSON.stringify(processedUpdates)
      });
      console.log('Snippet updated via HTTP successfully');

      // Broadcast via WebSocket
      if (sendSnippetUpdate && isJoined) {
        console.log('Broadcasting snippet update via WebSocket...');
        await sendSnippetUpdate({
          snippetId: id,
          ...processedUpdates
        });
      }
    } catch (error) {
      console.error("HTTP: Failed to update snippet:", error);
      // Revert on error
      fetchSpaceData();
    }
  };

  // FIXED: Enhanced move function
  const moveSnippet = async (id: string, x: number, y: number) => {
    const intX = Math.round(x);
    const intY = Math.round(y);

    // Apply optimistic update immediately
    setSnippets(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, x: intX, y: intY, updatedAt: new Date() };
      }
      return s;
    }));

    try {
      // Update via HTTP
      console.log('Updating snippet position via HTTP...', { id, x: intX, y: intY });
      await apiRequest(`/space/${spaceId}/snippet/${id}`, {
        method: "PUT",
        body: JSON.stringify({ x: intX, y: intY })
      });
      console.log('Snippet position updated via HTTP successfully');

      // Broadcast via WebSocket
      if (sendSnippetMove && isJoined) {
        console.log('Broadcasting snippet movement via WebSocket...');
        await sendSnippetMove({
          snippetId: id,
          x: intX,
          y: intY
        });
      }
    } catch (error) {
      console.error("HTTP: Failed to update snippet position:", error);
      // Revert on error
      fetchSpaceData();
    }
  };

  // FIXED: Enhanced delete function
  const deleteSnippet = async (id: string) => {
    // Apply optimistic delete immediately
    setSnippets(prev => prev.filter(s => s.id !== id));
    setSnippetOrder(prev => prev.filter(snippetId => snippetId !== id));

    try {
      // Delete via HTTP
      console.log('Deleting snippet via HTTP...', id);
      await apiRequest(`/space/${spaceId}/snippet/${id}`, { method: "DELETE" });
      console.log('Snippet deleted via HTTP successfully');
      
      // Broadcast via WebSocket
      if (sendSnippetDelete && isJoined) {
        console.log('Broadcasting snippet deletion via WebSocket...');
        await sendSnippetDelete({ snippetId: id });
      }
    } catch (error) {
      console.error("HTTP: Failed to delete snippet:", error);
      // Revert on error
      fetchSpaceData();
    }
  };

  const reorderSnippets = async (startIndex: number, endIndex: number) => {
    setSnippetOrder(prev => {
      const newOrder = [...prev];
      const [removed] = newOrder.splice(startIndex, 1);
      newOrder.splice(endIndex, 0, removed);
      updateSnippetOrder(newOrder);
      return newOrder;
    });
  };

  const updateSnippetOrder = async (newOrder: string[]) => {
    try {
      console.log('Updating snippet order via HTTP...', newOrder);
      await apiRequest(`/space/${spaceId}/order`, {
        method: "PUT",
        body: JSON.stringify({ order: newOrder })
      });
      console.log('Snippet order updated via HTTP');
    } catch (error) {
      console.error("HTTP: Failed to update order:", error);
      fetchSpaceData();
    }
  };

  const getOrderedSnippets = () => {
    if (!snippetOrder.length) return snippets;
    
    const snippetMap = new Map(snippets.map(snippet => [snippet.id, snippet]));
    const orderedSnippets = snippetOrder
      .map(id => snippetMap.get(id))
      .filter((snippet): snippet is Snippet => snippet !== undefined);
    
    const orderedIds = new Set(snippetOrder);
    const unorderedSnippets = snippets.filter(snippet => !orderedIds.has(snippet.id));
    
    return [...orderedSnippets, ...unorderedSnippets];
  };

  const getAllTags = () => {
    const tagSet = new Set<string>();
    snippets.forEach(snippet => {
      snippet.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
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

  const filteredSnippets = getOrderedSnippets().filter(snippet => {
    const matchesSearch = !searchQuery.trim() || 
      snippet.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      snippet.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      snippet.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesFilters = tagFilters.size === 0 || 
      snippet.tags.some(tag => tagFilters.has(tag));
    
    return matchesSearch && matchesFilters;
  });

  const getConnectionStatus = () => {
    if (isJoined) return { status: 'Connected & Joined', color: 'bg-green-100 text-green-800' };
    if (isConnected) return { status: 'Connected (Joining...)', color: 'bg-yellow-100 text-yellow-800' };
    if (lastError) return { status: `Error: ${lastError.slice(0, 30)}...`, color: 'bg-red-100 text-red-800' };
    return { status: 'Disconnected', color: 'bg-red-100 text-red-800' };
  };

  const connectionStatus = getConnectionStatus();

  return (
    <div className="flex h-screen bg-gray-100">
      {sidebarOpen && (
        <div className="w-80 bg-white border-r border-gray-200">
          <Sidebar 
            snippets={getOrderedSnippets()}
            filteredSnippets={filteredSnippets}
            snippetOrder={snippetOrder}
            searchQuery={searchQuery}
            tagFilters={tagFilters}
            getAllTags={getAllTags}
            onSearchChange={setSearchQuery}
            onToggleTagFilter={toggleTagFilter}
            onClearAllFilters={clearAllFilters}
            onReorderSnippets={reorderSnippets}
            onUpdateSnippet={updateSnippet}
            onDeleteSnippet={deleteSnippet}
          />
        </div>
      )}

      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200"
              >
                {sidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
              </button>
              
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold">
                  {spaceData?.name || 'Test Space'}
                </h1>
                {isLoading && <span className="text-sm text-gray-500">Loading...</span>}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className={`px-3 py-1 rounded text-sm ${connectionStatus.color}`}>
                WS: {connectionStatus.status}
              </div>

              {userPermissions && (
                <div className="px-3 py-1 rounded text-sm bg-blue-100 text-blue-800">
                  {userPermissions.isOwner ? 'Owner' : userPermissions.userRole || 'User'}
                </div>
              )}

              <button
                onClick={addSnippet}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                disabled={!userPermissions?.allowed}
              >
                Add Snippet
              </button>

              <button
                onClick={fetchSpaceData}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Refresh Data
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 p-8 overflow-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSnippets.map(snippet => (
              <div
                key={snippet.id}
                className={`p-4 rounded-lg shadow-md cursor-move ${snippet.color} transition-all duration-200 hover:shadow-lg`}
                onClick={() => {
                  const newX = Math.round(snippet.x + Math.random() * 100 - 50);
                  const newY = Math.round(snippet.y + Math.random() * 100 - 50);
                  moveSnippet(snippet.id, newX, newY);
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-white">{snippet.title}</h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSnippet(snippet.id);
                    }}
                    className="text-white hover:text-red-200 text-sm disabled:opacity-50"
                    disabled={!userPermissions?.allowed}
                  >
                    ×
                  </button>
                </div>
                
                {snippet.description && (
                  <p className="text-white text-sm mb-2 opacity-90">{snippet.description}</p>
                )}
                
                <div className="flex flex-wrap gap-1 mb-2">
                  {snippet.tags?.map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-white bg-opacity-20 rounded text-xs text-white"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="text-xs text-white opacity-75">
                  Position: ({Math.round(snippet.x)}, {Math.round(snippet.y)})
                </div>

                <div className="mt-2 pt-2 border-t border-white border-opacity-20">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateSnippet(snippet.id, {
                        title: `Updated ${Date.now()}`,
                        description: "Updated via test button"
                      });
                    }}
                    className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded text-white hover:bg-opacity-30 disabled:opacity-50 mr-2"
                    disabled={!userPermissions?.allowed}
                  >
                    Test Update
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      moveSnippet(snippet.id, Math.random() * 500, Math.random() * 500);
                    }}
                    className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded text-white hover:bg-opacity-30 disabled:opacity-50"
                    disabled={!userPermissions?.allowed}
                  >
                    Random Move
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredSnippets.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">No snippets found</div>
              <button
                onClick={addSnippet}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                disabled={!userPermissions?.allowed}
              >
                Create First Snippet
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
