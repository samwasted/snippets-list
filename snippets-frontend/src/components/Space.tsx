import React from "react";
import { useState, useEffect, useRef } from "react";
import Sidebar from "./Sidebar";
import Box from "./Box";
import EditModal from "./EditModal";
import { motion, animate} from "framer-motion";
import { useSpaceWebSocket } from "./useSpaceWebSocket";
import type { TagColorMenuState, Box as BoxType, colors, colorNames } from "./types";

// Common type definitions harmonized from both components
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
  files?: File[];
}

interface Space {
  id: string;
  name: string;
  order: string[];
  isPublic: boolean;
  ownerId: string;
  snippets?: Snippet[];
}

interface User {
  id: string;
  name: string | null;
  username?: string;
  role?: string;
}

interface SpaceCollaborator {
  userId: string;
  role: string;
}

// API utilities
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

// Main component
export default function Space() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Zoom & pan state
  const [scale, setScale] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);

  // Pan drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Edit modal state
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null);
  const [editText, setEditText] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editCode, setEditCode] = useState("");
  const [editCodeLanguage, setEditCodeLanguage] = useState("javascript");
  const [newTag, setNewTag] = useState("");

  const spaceId = window.location.pathname.split('/').pop() || "";

  // User state
  const [userLoaded, setUserLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string | null;
    username?: string;
    role?: string;
  }>({
    id: "",
    name: null
  });

  const [authToken, setAuthToken] = useState<string | undefined>(() => {
    return localStorage.getItem('token') || undefined;
  });

  const [tagColorMenu, setTagColorMenu] = useState<TagColorMenuState>({
    show: false,
    tag: "",
    x: 0,
    y: 0
  });

  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [snippetOrder, setSnippetOrder] = useState<string[]>([]);
  const [spaceData, setSpaceData] = useState<Space | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tagFilters, setTagFilters] = useState<Set<string>>(new Set());
  const [userRole, setUserRole] = useState<'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER' | null>(null);

  const {
    sendSnippetMove,
    sendSnippetCreate,
    sendSnippetDelete,
    sendSnippetUpdate,
    lastMessage,
    isConnected,
    isJoined,
    lastError,
    userPermissions,
    joinSpace
  } = useSpaceWebSocket({
    spaceId,
    userId: currentUser.id,
    token: authToken,
    enabled: userLoaded && !!currentUser.id
  });

  // Initialize user data
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
          setUserLoaded(true);
        }
      } catch (error) {
        console.error("Failed to fetch user metadata:", error);
      }
    };
    fetchUserMetadata();
  }, []);

  // Handle auth token changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token') {
        setAuthToken(e.newValue || undefined);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Fetch initial space data
  useEffect(() => {
    fetchSpaceData();
  }, []);

  // Canvas pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isOnCanvas = canvasRef.current?.contains(target) || target === canvasRef.current;

    if (!isOnCanvas) return;

    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setPanStart({ x: panX, y: panY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    setPanX(panStart.x + deltaX);
    setPanY(panStart.y + deltaY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Global mouse handlers for canvas panning
  React.useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      setPanX(panStart.x + deltaX);
      setPanY(panStart.y + deltaY);
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

  // WebSocket message handling
  useEffect(() => {
    if (!lastMessage) return;

    console.log('Processing WebSocket message:', lastMessage);

    const isFromCurrentUser = lastMessage.userId === currentUser?.id;

    if (isFromCurrentUser) {
      console.log('Skipping echo from current user');
      return;
    }

    switch (lastMessage.type) {
      case 'snippet-moved':
        const moveId = lastMessage.payload.snippetId || lastMessage.payload.id;
        if (!moveId) return;

        setSnippets(prev => prev.map(snippet => {
          if (snippet.id === moveId) {
            return {
              ...snippet,
              x: Math.round(lastMessage.payload.x ?? snippet.x),
              y: Math.round(lastMessage.payload.y ?? snippet.y),
              updatedAt: new Date(lastMessage.payload.updatedAt || Date.now())
            };
          }
          return snippet;
        }));
        break;

      case 'snippet-created':
        const snippetId = lastMessage.payload.snippetId || lastMessage.payload.id;
        if (!snippetId) return;

        setSnippets(prev => {
          const exists = prev.some(s => s.id === snippetId);
          if (exists) return prev;

          const newSnippet = {
            id: snippetId,
            title: lastMessage.payload.title || 'Untitled Snippet',
            description: lastMessage.payload.description || '',
            code: lastMessage.payload.code || '',
            tags: Array.isArray(lastMessage.payload.tags) ? lastMessage.payload.tags : [],
            color: lastMessage.payload.color || 'bg-gray-400',
            x: Math.round(lastMessage.payload.x ?? 100),
            y: Math.round(lastMessage.payload.y ?? 100),
            spaceId: lastMessage.payload.spaceId || spaceId,
            ownerId: lastMessage.payload.ownerId || lastMessage.payload.createdBy || lastMessage.userId || currentUser?.id || '',
            createdAt: new Date(lastMessage.payload.createdAt || Date.now()),
            updatedAt: new Date(lastMessage.payload.updatedAt || Date.now())
          };

          return [...prev, newSnippet];
        });

        setSnippetOrder(prev => {
          if (!snippetId || prev.includes(snippetId)) return prev;
          return [...prev, snippetId];
        });
        break;

      case 'snippet-deleted':
        const deletedId = lastMessage.payload.snippetId || lastMessage.payload.id;
        if (!deletedId) return;

        setSnippets(prev => prev.filter(snippet => snippet.id !== deletedId));
        setSnippetOrder(prev => prev.filter(id => id !== deletedId));
        break;

      case 'snippet-updated':
        const targetId = lastMessage.payload.snippetId || lastMessage.payload.id;
        if (!targetId) return;

        setSnippets(prev => prev.map(snippet => {
          if (snippet.id === targetId) {
            return {
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
          }
          return snippet;
        }));
        break;

      case 'space-view':
        if (lastMessage.payload.order && Array.isArray(lastMessage.payload.order)) {
          setSnippetOrder(lastMessage.payload.order);
        }
        break;
    }
  }, [lastMessage, spaceId, currentUser?.id]);

  const navigateToBox = (snippet: Snippet) => {
    if (!containerRef.current || !canvasRef.current) return;
    
    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    const containerCenterX = containerWidth / 2;
    const containerCenterY = containerHeight / 2;
    
    const targetX = -snippet.x * scale + containerCenterX;
    const targetY = -snippet.y * scale + containerCenterY;
    
    animate(panX, targetX, {
      type: 'spring',
      duration: 0.8,
      bounce: 0.2,
      onUpdate: (value) => setPanX(value),
    });
    
    animate(panY, targetY, {
      type: 'spring',
      duration: 0.8,
      bounce: 0.2,
      onUpdate: (value) => setPanY(value),
    });
  };

  // Fetch space data
  const fetchSpaceData = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching space data via HTTP...');

      const spaceResponse = await apiRequest(`/space/${spaceId}`);
      console.log('Space data received:', spaceResponse);

      if (spaceResponse.space) {
        const space = spaceResponse.space;
        setSpaceData(space);
        setUserRole(spaceResponse.userRole);
        console.log("The user role is " + spaceResponse.userRole);
        
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

  // Add the handleToggleSpaceVisibility function
  const handleToggleSpaceVisibility = async (isPublic: boolean) => {
    try {
      console.log(`Toggling space visibility to ${isPublic ? 'public' : 'private'}...`);
      
      await apiRequest(`/space/${spaceId}/visibility`, {
        method: 'PUT',
        body: JSON.stringify({
          isPublic: isPublic
        })
      });
      
      // Update local state to reflect the change
      setSpaceData(prevData => prevData ? { ...prevData, isPublic } : prevData);
      
      console.log(`Space visibility updated to ${isPublic ? 'public' : 'private'}`);
    } catch (error) {
      console.error('Error updating space visibility:', error);
      throw error; // Re-throw to allow Sidebar component to handle the error
    }
  };

  // Sync snippet order with current snippets
  React.useEffect(() => {
    const currentIds = snippets.map(snippet => snippet.id);
    const newIds = currentIds.filter(id => !snippetOrder.includes(id));
    const validIds = snippetOrder.filter(id => currentIds.includes(id));
    setSnippetOrder([...validIds, ...newIds]);
  }, [snippets.length]);

  // Close tag color menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => {
      setTagColorMenu({ show: false, tag: "", x: 0, y: 0 });
    };
    if (tagColorMenu.show) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [tagColorMenu.show]);

  // Zoom handlers
  const handleWheel = (e: React.WheelEvent) => {
    const target = e.target as HTMLElement;
    const isOnCanvas = canvasRef.current?.contains(target) || target === canvasRef.current;

    if (!isOnCanvas) {
      return;
    }

    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(prev => Math.max(0.5, Math.min(3, prev + delta)));
  };

  const zoom = (delta: number) => {
    setScale(prev => Math.max(0.5, Math.min(3, prev + delta)));
  };

  // Edit modal handlers
  const startEditing = (snippet: Snippet) => {
    setEditingSnippet(snippet);
    setEditText(snippet.title);
    setEditDescription(snippet.description || "");
    setEditColor(snippet.color);
    setEditTags([...snippet.tags]);
    setEditCode(snippet.code || "");
    setEditCodeLanguage("javascript");
    setNewTag("");
  };

  const cancelEdit = () => {
    setEditingSnippet(null);
    setEditText("");
    setEditDescription("");
    setEditColor("");
    setEditTags([]);
    setEditCode("");
    setEditCodeLanguage("javascript");
    setNewTag("");
  };

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

  const saveEdit = async () => {
    if (!editingSnippet) return;

    const updates = {
      title: editText,
      description: editDescription,
      color: editColor,
      tags: editTags,
      code: editCode
    };

    await updateSnippet(editingSnippet.id, updates);
    cancelEdit();
  };

  // Tag color management
  const handleTagRightClick = (e: React.MouseEvent, tag: string) => {
    e.preventDefault();
    e.stopPropagation();
    setTagColorMenu({
      show: true,
      tag: tag,
      x: e.clientX,
      y: e.clientY
    });
  };

  const [lastCreationTime, setLastCreationTime] = useState(0);

  // Create snippet
  const addSnippet = async () => {
    if (Date.now() - lastCreationTime < 100) {
      console.log('Too rapid snippet creation');
      return;
    }
    setLastCreationTime(Date.now());

    const newSnippetData = {
      title: `New Snippet ${Date.now()}`,
      description: "Click to edit this snippet",
      code: "// Add your code here",
      tags: ["new"],
      color: "bg-blue-400",
      x: Math.round(Math.random() * 400 + 200),
      y: Math.round(Math.random() * 400 + 200),
      spaceId: spaceId
    };

    try {
      console.log('Creating snippet via HTTP...', newSnippetData);
      const response = await apiRequest(`/space/${spaceId}/snippet`, {
        method: "POST",
        body: JSON.stringify(newSnippetData)
      });

      if (!response || !response.snippet || !response.snippet.id) {
        throw new Error('Invalid response from server');
      }

      const createdSnippet = {
        id: response.snippet.id,
        title: response.snippet.title,
        description: response.snippet.description || newSnippetData.description,
        code: response.snippet.code || newSnippetData.code,
        tags: Array.isArray(response.snippet.tags) ? response.snippet.tags : newSnippetData.tags,
        color: response.snippet.color || newSnippetData.color,
        x: Math.round(response.snippet.x),
        y: Math.round(response.snippet.y),
        spaceId: spaceId,
        ownerId: currentUser?.id || '',
        createdAt: new Date(response.snippet.createdAt),
        updatedAt: new Date(response.snippet.updatedAt)
      };

      setSnippets(prev => {
        const exists = prev.some(s => s.id === createdSnippet.id);
        if (exists) return prev;
        return [...prev, createdSnippet];
      });

      setSnippetOrder(prev => {
        if (prev.includes(createdSnippet.id)) return prev;
        return [...prev, createdSnippet.id];
      });

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
      console.error("Failed to create snippet:", error);
    }
  };

  // Update snippet
  const updateSnippet = async (id: string, updates: Partial<Snippet>) => {
    const processedUpdates = {
      ...updates,
      ...(updates.x !== undefined && { x: Math.round(updates.x) }),
      ...(updates.y !== undefined && { y: Math.round(updates.y) })
    };

    const originalSnippet = snippets.find(s => s.id === id);
    if (!originalSnippet) {
      console.error("Cannot update snippet that doesn't exist:", id);
      return;
    }

    // Apply optimistic update
    setSnippets(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, ...processedUpdates, updatedAt: new Date() };
      }
      return s;
    }));

    try {
      console.log('Updating snippet via HTTP...', { id, updates: processedUpdates });
      await apiRequest(`/space/${spaceId}/snippet/${id}`, {
        method: "PUT",
        body: JSON.stringify(processedUpdates)
      });

      if (sendSnippetUpdate && isJoined) {
        console.log('Broadcasting snippet update via WebSocket...');
        const { files, ...wsPayload } = processedUpdates;
        await sendSnippetUpdate({
          snippetId: id,
          ...wsPayload
        });
      }
    } catch (error) {
      console.error("Failed to update snippet:", error);
      if (originalSnippet) {
        setSnippets(prev => prev.map(s => s.id === id ? originalSnippet : s));
      } else {
        fetchSpaceData();
      }
    }
  };

  // Move snippet with proper coordinate calculation
  const moveSnippet = async (id: string, deltaX: number, deltaY: number) => {
    const snippet = snippets.find(s => s.id === id);
    if (!snippet) return;

    const newX = Math.round(snippet.x + deltaX);
    const newY = Math.round(snippet.y + deltaY);

    // Apply optimistic update
    setSnippets(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, x: newX, y: newY, updatedAt: new Date() };
      }
      return s;
    }));

    try {
      console.log('Updating snippet position via HTTP...', { id, x: newX, y: newY });
      await apiRequest(`/space/${spaceId}/snippet/${id}`, {
        method: "PUT",
        body: JSON.stringify({ x: newX, y: newY })
      });

      if (sendSnippetMove && isJoined) {
        console.log('Broadcasting snippet movement via WebSocket...');
        await sendSnippetMove({
          snippetId: id,
          x: newX,
          y: newY
        });
      }
    } catch (error) {
      console.error("Failed to update snippet position:", error);
      if (snippet) {
        setSnippets(prev => prev.map(s => s.id === id ? snippet : s));
      } else {
        fetchSpaceData();
      }
    }
  };

  // Delete snippet
  const deleteSnippet = async (id: string) => {
    const snippetToDelete = snippets.find(s => s.id === id);
    if (!snippetToDelete) return;

    const originalOrderIndex = snippetOrder.indexOf(id);

    setSnippets(prev => prev.filter(s => s.id !== id));
    setSnippetOrder(prev => prev.filter(snippetId => snippetId !== id));

    try {
      console.log('Deleting snippet via HTTP...', id);
      await apiRequest(`/space/${spaceId}/snippet/${id}`, {
        method: "DELETE"
      });

      if (sendSnippetDelete && isJoined) {
        console.log('Broadcasting snippet deletion via WebSocket...');
        await sendSnippetDelete({ snippetId: id });
      }
    } catch (error) {
      console.error("Failed to delete snippet:", error);
      if (snippetToDelete) {
        setSnippets(prev => [...prev, snippetToDelete]);
        setSnippetOrder(prev => {
          const newOrder = [...prev];
          if (originalOrderIndex >= 0 && originalOrderIndex < newOrder.length) {
            newOrder.splice(originalOrderIndex, 0, id);
          } else {
            newOrder.push(id);
          }
          return newOrder;
        });
      } else {
        fetchSpaceData();
      }
    }
  };

  // Handle file changes for snippets
  const handleSnippetFilesChanged = (id: string, files: File[]) => {
    setSnippets(prev => prev.map(snippet =>
      snippet.id === id ? { ...snippet, files } : snippet
    ));
  };

  // Reorder snippets
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
    } catch (error) {
      console.error("HTTP: Failed to update order:", error);
      fetchSpaceData();
    }
  };

  // Tag management
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

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const changeTagColor = async (tag: string, color: string) => {
    setSnippets(prev => prev.map(snippet => 
      snippet.tags.includes(tag) 
        ? { ...snippet, color: color, updatedAt: new Date() }
        : snippet
    ));
    setTagColorMenu({ show: false, tag: "", x: 0, y: 0 });

    // Update all snippets with this tag to have this color via WebSocket
    snippets.forEach(snippet => {
      if (snippet.tags.includes(tag)) {
        if (sendSnippetUpdate && isJoined) {
          sendSnippetUpdate({
            snippetId: snippet.id,
            color: color
          });
        }
      }
    });
  };

  // Filter and sort snippets
  const matchesSearch = (snippet: Snippet, query: string) => {
    if (!query.trim()) return true;
    const searchTerm = query.toLowerCase().trim();
    return (
      snippet.title.toLowerCase().includes(searchTerm) ||
      (snippet.description && snippet.description.toLowerCase().includes(searchTerm)) ||
      snippet.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
      (snippet.code && snippet.code.toLowerCase().includes(searchTerm))
    );
  };

  const filteredSnippets = snippets.filter(snippet => {
    const matches = matchesSearch(snippet, searchQuery);
    const tagMatch = tagFilters.size === 0 || 
                    snippet.tags.some(tag => tagFilters.has(tag));
    return matches && tagMatch;
  });

  // Sort snippets by order
  const sortedSnippets = filteredSnippets.sort((a, b) => {
    const aIndex = snippetOrder.indexOf(a.id);
    const bIndex = snippetOrder.indexOf(b.id);
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  // FIXED: Added missing getOrderedSnippets function
  const getOrderedSnippets = () => {
    return snippets.sort((a, b) => {
      const aIndex = snippetOrder.indexOf(a.id);
      const bIndex = snippetOrder.indexOf(b.id);
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  };

  // Get permissions and connection status
  const canEdit = userPermissions?.allowed || 
                 userPermissions?.isOwner || 
                 spaceData?.ownerId === currentUser.id;

  const connectionStatus = (() => {
    if (isJoined) return { status: 'Connected & Joined', color: 'bg-green-100 text-green-800' };
    if (isConnected) return { status: 'Connected (Joining...)', color: 'bg-yellow-100 text-yellow-800' };
    if (lastError) return { status: `Error: ${lastError.slice(0, 30)}...`, color: 'bg-red-100 text-red-800' };
    return { status: 'Disconnected', color: 'bg-red-100 text-red-800' };
  })();

  // Convert Snippet to BoxType for Box component
  const convertSnippetToBox = (snippet: Snippet): BoxType => ({
    id: snippet.id,
    x: snippet.x,
    y: snippet.y,
    code: snippet.code || "",
    codeLanguage: "javascript",
    color: snippet.color,
    label: snippet.title,
    description: snippet.description || "",
    tags: snippet.tags,
    files: snippet.files,
    totalViews: 0,
    createdAt: new Date(snippet.createdAt).toISOString(),
    updatedAt: new Date(snippet.updatedAt).toISOString(),
    text: snippet.title || "",
  });

  return (
    <div className="h-screen bg-gray-100">
      {/* Main Content - Full Width */}
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">
                {spaceData?.name || 'Code Space'}
              </h1>
              {isLoading && <span className="text-sm text-gray-500">Loading...</span>}
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

              <div className={`px-3 py-1 rounded text-sm ${connectionStatus.color}`}>
                WS: {connectionStatus.status}
              </div>

              {userPermissions && (
                <div className="px-3 py-1 rounded text-sm bg-blue-100 text-blue-800">
                  {userRole || "VIEWER"}
                </div>
              )}

              <button
                onClick={() => zoom(0.1)}
                className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
                title="Zoom In"
              >
                +
              </button>

              <button
                onClick={() => zoom(-0.1)}
                className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
                title="Zoom Out"
              >
                -
              </button>

              <span className="text-sm text-gray-600">
                {Math.round(scale * 100)}%
              </span>

              <button
                onClick={addSnippet}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                disabled={!canEdit}
              >
                Add Snippet
              </button>

              <button
                onClick={fetchSpaceData}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Canvas with Infinite Grid - Full Width */}
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden relative bg-gray-50"
          onWheel={handleWheel}
        >
          <motion.div
            ref={canvasRef}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
            style={{
              transform: `translate(${panX}px, ${panY}px) scale(${scale})`,
              transformOrigin: '0 0',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            {/* Infinite Grid background */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
                `,
                backgroundSize: `${20 * scale}px ${20 * scale}px`,
                backgroundPosition: `${panX % (20 * scale)}px ${panY % (20 * scale)}px`
              }}
            />

            {/* Render snippets as draggable boxes */}
            {filteredSnippets.map(snippet => (
              <Box
                key={snippet.id}
                box={snippet}
                scale={scale}
                onUpdatePosition={moveSnippet}
                onStartEditing={() => startEditing(snippet)}
                onTagRightClick={handleTagRightClick}
                onFilesChanged={handleSnippetFilesChanged}
              />
            ))}

            {/* Empty state */}
            {filteredSnippets.length === 0 && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                <div className="text-gray-500 mb-4 text-lg">No snippets found</div>
                <button
                  onClick={addSnippet}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  disabled={!userPermissions?.allowed}
                >
                  Create Your First Snippet
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Right-side Fixed Sidebar */}
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
        onNavigateToBox={navigateToBox} 
        spaceId={spaceId} 
        userRole={userRole || "VIEWER"}   
        isSpacePublic={spaceData?.isPublic || false}
        onToggleSpaceVisibility={handleToggleSpaceVisibility}   
      />

      {/* Edit Modal */}
      {editingSnippet && (
        <EditModal
          editingBox={convertSnippetToBox(editingSnippet)}
          editText={editText}
          editDescription={editDescription}
          editColor={editColor}
          editTags={editTags}
          editCode={editCode}
          editCodeLanguage={editCodeLanguage}
          newTag={newTag}
          onTextChange={setEditText}
          onDescriptionChange={setEditDescription}
          onColorChange={setEditColor}
          onTagsChange={setEditTags}
          onCodeChange={setEditCode}
          onCodeLanguageChange={setEditCodeLanguage}
          onNewTagChange={setNewTag}
          onAddTag={addTag}
          onRemoveTag={removeTag}
          onTagKeyPress={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTag();
            }
          }}
          onSave={saveEdit}
          onCancel={cancelEdit}
          onDelete={deleteSnippet}
        />
      )}

      {/* Tag Color Menu */}
      {tagColorMenu.show && (
        <div
          className="fixed bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-50"
          style={{ left: tagColorMenu.x, top: tagColorMenu.y }}
        >
          <div className="text-sm text-gray-600 p-2">
            Change color for "{tagColorMenu.tag}"
          </div>
        </div>
      )}
    </div>
  );
}
