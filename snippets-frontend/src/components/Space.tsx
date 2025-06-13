import React, { useState, useRef, useEffect } from "react";
import { animate, motion } from "framer-motion";
import Sidebar from "./Sidebar";
import EditModal from "./EditModal";
import Box from "./Box";
import TagColorMenu from "./TagColorMenu";
import { useSpaceWebSocket } from "./useSpaceWebSocket";
import { useParams } from 'react-router-dom';

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
  files: File[];
  totalViews?: number;
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
  const { spaceId } = useParams<{ spaceId: string }>() || { spaceId: window.location.pathname.split('/').pop() || "" };
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // User state
  const [userLoaded, setUserLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState<User>({
    id: "",
    name: null
  });
  
  // Auth state
  const [authToken, setAuthToken] = useState<string | undefined>(() => {
    return localStorage.getItem('token') || undefined;
  });

  // Content state
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [snippetOrder, setSnippetOrder] = useState<string[]>([]);
  const [spaceData, setSpaceData] = useState<Space | null>(null);
  
  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tagFilters, setTagFilters] = useState<Set<string>>(new Set());
  const [lastCreationTime, setLastCreationTime] = useState(0);
  
  // Pan and zoom state
  const [scale, setScale] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Edit state
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editCode, setEditCode] = useState("");
  const [editCodeLanguage, setEditCodeLanguage] = useState("javascript");
  const [newTag, setNewTag] = useState("");
  
  // Tag color menu state
  const [tagColorMenu, setTagColorMenu] = useState<{
    show: boolean, 
    tag: string, 
    x: number, 
    y: number
  }>({
    show: false, tag: "", x: 0, y: 0
  });

  // WebSocket connection
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

  // Fetch user data
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

  // Auth token management
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token') {
        setAuthToken(e.newValue || undefined);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Join space when token is available
  useEffect(() => {
    if (authToken && isConnected && !isJoined && joinSpace) {
      joinSpace(authToken);
    }
  }, [authToken, isConnected, isJoined, joinSpace]);

  // Initial data fetch
  useEffect(() => {
    fetchSpaceData();
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceRef.current).forEach(clearTimeout);
    };
  }, []);

  // Keep snippet order in sync with snippets
  useEffect(() => {
    const currentIds = snippets.map(snippet => snippet.id);
    const newIds = currentIds.filter(id => !snippetOrder.includes(id));
    const validIds = snippetOrder.filter(id => currentIds.includes(id));
    
    if (newIds.length > 0 || validIds.length !== snippetOrder.length) {
      setSnippetOrder([...validIds, ...newIds]);
    }
  }, [snippets.length, snippetOrder]);
  
  // Close tag color menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setTagColorMenu({ show: false, tag: "", x: 0, y: 0 });
    };
    
    if (tagColorMenu.show) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [tagColorMenu.show]);
  
  // WebSocket message handling - Enhanced with error recovery
  useEffect(() => {
    if (!lastMessage) return;

    console.log('Processing WebSocket message:', lastMessage);

    // Simple user-based filtering only
    const isFromCurrentUser = lastMessage.userId === currentUser?.id;
    
    if (isFromCurrentUser) {
      console.log('Skipping echo from current user');
      return; // Only skip direct echoes
    }

    // Always process messages from other users
    switch (lastMessage.type) {
      case 'snippet-moved':
        const moveId = lastMessage.payload.snippetId || lastMessage.payload.id;
        if (!moveId) {
          console.error('Invalid snippet-moved message, missing id/snippetId:', lastMessage);
          return;
        }
        
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
        if (!snippetId) {
          console.error('Invalid snippet-created message, missing id/snippetId:', lastMessage);
          return;
        }

        // Check if snippet already exists to avoid duplicates
        setSnippets(prev => {
          const exists = prev.some(s => s.id === snippetId);
          if (exists) {
            console.log('Snippet already exists, skipping creation');
            return prev;
          }

          const newSnippet: Snippet = {
            id: snippetId,
            title: lastMessage.payload.title || 'Untitled Snippet',
            description: lastMessage.payload.description || '',
            code: lastMessage.payload.code || '',
            tags: Array.isArray(lastMessage.payload.tags) ? lastMessage.payload.tags : [],
            color: lastMessage.payload.color || 'bg-gray-400',
            x: Math.round(lastMessage.payload.x ?? 100),
            y: Math.round(lastMessage.payload.y ?? 100),
            spaceId: String(lastMessage.payload.spaceId ?? spaceId ?? ""),
            ownerId: lastMessage.payload.ownerId || lastMessage.payload.createdBy || lastMessage.userId || currentUser?.id || '',
            createdAt: new Date(lastMessage.payload.createdAt || Date.now()),
            updatedAt: new Date(lastMessage.payload.updatedAt || Date.now()),
            files: lastMessage.payload.files || []
          };

          console.log('Adding new snippet from WebSocket:', newSnippet);
          return [...prev, newSnippet];
        });

        // Update order with functional update
        setSnippetOrder(prev => {
          if (!snippetId || prev.includes(snippetId)) return prev;
          return [...prev, snippetId];
        });
        break;

      case 'snippet-deleted':
        const deletedId = lastMessage.payload.snippetId || lastMessage.payload.id;
        if (!deletedId) {
          console.error('Invalid snippet-deleted message, missing snippetId/id:', lastMessage);
          return;
        }

        console.log('Deleting snippet from WebSocket:', deletedId);

        setSnippets(prev => prev.filter(snippet => snippet.id !== deletedId));
        setSnippetOrder(prev => prev.filter(id => id !== deletedId));
        break;

      case 'snippet-updated':
        const targetId = lastMessage.payload.snippetId || lastMessage.payload.id;
        if (!targetId) {
          console.error('Invalid snippet-updated message, missing snippetId/id:', lastMessage);
          return;
        }

        setSnippets(prev => prev.map(snippet => {
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
              ...(Array.isArray(lastMessage.payload.files) && { files: lastMessage.payload.files }),
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
        console.log('Unknown or unhandled WebSocket message type:', lastMessage.type);
        break;
    }
  }, [lastMessage, spaceId, currentUser?.id]);

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

  // Data fetching
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
          // Ensure snippets have files property
          const snippetsWithFiles = space.snippets.map((snippet: Snippet) => ({
            ...snippet,
            files: snippet.files || []
          }));
          setSnippets(snippetsWithFiles);
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

  // CRUD operations with enhanced error handling
  const addSnippet = async () => {
    if (Date.now() - lastCreationTime < 100) {
      console.log('Too rapid snippet creation');
      return;
    }
    setLastCreationTime(Date.now());
    
    const newSnippetData = {
      title: `New Snippet ${Date.now().toString().slice(-4)}`,
      description: "",
      code: "",
      tags: [],
      color: "bg-blue-400",
      files: [],
      x: Math.round(Math.random() * 400 + 200),
      y: Math.round(Math.random() * 400 + 200),
      spaceId: spaceId
    };

    try {
      // HTTP request first
      console.log('Creating snippet via HTTP...', newSnippetData);
      const response = await apiRequest(`/space/${spaceId}/snippet`, {
        method: "POST",
        body: JSON.stringify(newSnippetData)
      });
      console.log('Snippet created via HTTP:', response);

      if (!response || !response.snippet || !response.snippet.id) {
        throw new Error('Invalid response from server');
      }

      // Apply optimistic update immediately after HTTP success
      const createdSnippet = {
        id: response.snippet.id,
        title: response.snippet.title,
        description: response.snippet.description || newSnippetData.description,
        code: response.snippet.code || newSnippetData.code,
        tags: Array.isArray(response.snippet.tags) ? response.snippet.tags : newSnippetData.tags,
        color: response.snippet.color || newSnippetData.color,
        files: response.snippet.files || [],
        x: Math.round(response.snippet.x),
        y: Math.round(response.snippet.y),
        spaceId: spaceId || 'error',
        ownerId: currentUser?.id || '',
        createdAt: new Date(response.snippet.createdAt),
        updatedAt: new Date(response.snippet.updatedAt)
      };

      // Update local state immediately
      setSnippets(prev => {
          const exists = prev.some(s => s.id === createdSnippet.id);
        if (exists) return prev;
        return [...prev, createdSnippet];
        
        
      });

      setSnippetOrder(prev => {
        if (prev.includes(createdSnippet.id)) return prev;
        return [...prev, createdSnippet.id];
      });

      // Broadcast via WebSocket
      if (sendSnippetCreate && isJoined) {
        console.log('Broadcasting snippet creation via WebSocket...');
        await sendSnippetCreate({
          title: createdSnippet.title,
          description: createdSnippet.description,
          code: createdSnippet.code,
          tags: createdSnippet.tags,
          color: createdSnippet.color,
          files: createdSnippet.files || [],
          x: Math.round(createdSnippet.x),
          y: Math.round(createdSnippet.y)
        });
      }
    } catch (error) {
      console.error("Failed to create snippet:", error);
    }
  };

  const startEditing = (snippet: Snippet) => {
    setEditingSnippet(snippet);
    setEditTitle(snippet.title);
    setEditDescription(snippet.description || "");
    setEditColor(snippet.color || "bg-blue-400");
    setEditTags([...snippet.tags]);
    setEditCode(snippet.code || "");
    setEditCodeLanguage("javascript");
    setNewTag("");
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

  const updateSnippet = async (id: string, updates: Partial<Snippet>) => {
    // Process coordinates if present
    const processedUpdates = {
      ...updates,
      ...(updates.x !== undefined && { x: Math.round(updates.x) }),
      ...(updates.y !== undefined && { y: Math.round(updates.y) })
    };

    // Save original for error recovery
    const originalSnippet = snippets.find(s => s.id === id);
    if (!originalSnippet) {
      console.error("Cannot update snippet that doesn't exist:", id);
      return;
    }

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
        // Only include files if they are an array of strings, otherwise convert or omit
        let wsPayload: any = { snippetId: id, ...processedUpdates };
        if ('files' in wsPayload && wsPayload.files && Array.isArray(wsPayload.files)) {
          // If files is File[], convert to string[] (file names)
          if (wsPayload.files.length > 0 && typeof wsPayload.files[0] !== 'string') {
            wsPayload.files = wsPayload.files.map((f: any) => f.name);
          }
        }
        // If files is still not string[] (e.g., undefined or wrong type), remove it
        if ('files' in wsPayload && wsPayload.files && Array.isArray(wsPayload.files) && wsPayload.files.length > 0 && typeof wsPayload.files[0] !== 'string') {
          delete wsPayload.files;
        }
        await sendSnippetUpdate(wsPayload);
      }
    } catch (error) {
      console.error("Failed to update snippet:", error);
      // Revert on error
      if (originalSnippet) {
        setSnippets(prev => prev.map(s => s.id === id ? originalSnippet : s));
      } else {
        fetchSpaceData();
      }
    }
  };

  const saveEdit = async () => {
    if (!editingSnippet) return;
    
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
    
    await updateSnippet(editingSnippet.id, updatedSnippet);
    resetEditState();
  };

  const moveSnippet = async (id: string, deltaX: number, deltaY: number) => {
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
      console.log('Broadcasting live snippet movement via WebSocket...');
      await sendSnippetMove({
        snippetId: id,
        x: newX,
        y: newY
      });
    }

    // Debounced HTTP update to reduce server load
    if (debounceRef.current[id]) clearTimeout(debounceRef.current[id]);
    debounceRef.current[id] = setTimeout(async () => {
      try {
        // Update via HTTP
        console.log('Updating snippet position via HTTP...', { id, x: newX, y: newY });
        await apiRequest(`/space/${spaceId}/snippet/${id}`, {
          method: "PUT",
          body: JSON.stringify({ x: newX, y: newY })
        });
        console.log('Snippet position updated via HTTP successfully');
      } catch (error) {
        console.error("Position update failed:", error);
        // We don't revert here since we already sent the WS update
      }
    }, 1000);
  };

  const deleteSnippet = async (id: string) => {
    // Save snippet for error recovery
    const snippetToDelete = snippets.find(s => s.id === id);
    if (!snippetToDelete) {
      console.error("Cannot delete snippet that doesn't exist:", id);
      return;
    }

    // Store original order position for recovery
    const originalOrderIndex = snippetOrder.indexOf(id);

    // Apply optimistic delete immediately
    setSnippets(prev => prev.filter(s => s.id !== id));
    setSnippetOrder(prev => prev.filter(snippetId => snippetId !== id));

    try {
      // Delete via HTTP
      console.log('Deleting snippet via HTTP...', id);
      await apiRequest(`/space/${spaceId}/snippet/${id}`, { 
        method: "DELETE" 
      });
      console.log('Snippet deleted via HTTP successfully');

      // Broadcast via WebSocket
      if (sendSnippetDelete && isJoined) {
        console.log('Broadcasting snippet deletion via WebSocket...');
        await sendSnippetDelete({ snippetId: id });
      }
    } catch (error) {
      console.error("Failed to delete snippet:", error);
      // Revert on error - restore the deleted snippet
      if (snippetToDelete) {
        setSnippets(prev => [...prev, snippetToDelete]);
        setSnippetOrder(prev => {
          const newOrder = [...prev];
          // Try to restore at original position
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

  // File handling
  const handleFilesChanged = (id: string, files: File[]) => {
    const currentSnippet = snippets.find(s => s.id === id);
    if (!currentSnippet) return;

    // Update local state
    setSnippets(prev => prev.map(s => 
      s.id === id ? {
        ...s,
        files: files,
        updatedAt: new Date()
      } : s
    ));

    // No HTTP update for files in this example (would require file upload API)
    // But we can send the file names via WebSocket
    const fileNames = files.map(f => f.name);
    
    if (sendSnippetUpdate && isJoined) {
      sendSnippetUpdate({
        snippetId: id,
        files: fileNames
      });
    }
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
    setSnippets(prev => prev.map(snippet => 
      snippet.tags.includes(tag) 
        ? { ...snippet, color: color, updatedAt: new Date() }
        : snippet
    ));
    setTagColorMenu({ show: false, tag: "", x: 0, y: 0 });

    // Update all snippets with this tag to have this color via WebSocket
    // This is an example of how we could implement this, but it depends on backend support
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

  return (
    <div className="flex h-screen bg-gray-300">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0 md:static md:inset-0 w-80 bg-white border-r border-gray-200`}>
        <Sidebar
          snippets={snippets}
          filteredSnippets={sortedSnippets}
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
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold">
                  {spaceData?.name || 'Space'}
                </h1>
                {isLoading && <span className="text-sm text-gray-500">Loading...</span>}
              </div>
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
                  {userPermissions.isOwner ? 'Owner' : userPermissions.userRole || 'User'}
                </div>
              )}

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
                Refresh Data
              </button>
            </div>
          </div>
        </div>

        {/* Canvas Container */}
        <div 
          ref={containerRef}
          className="flex-1 relative overflow-hidden bg-gray-100"
          onWheel={handleWheel}
        >
          {/* Tag Color Menu */}
          {tagColorMenu.show && (
            <div
              className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-2"
              style={{
                left: tagColorMenu.x,
                top: tagColorMenu.y
              }}
            >
              <div className="grid grid-cols-4 gap-2">
                {["bg-blue-400", "bg-green-400", "bg-red-400", "bg-yellow-400", 
                  "bg-purple-400", "bg-pink-400", "bg-indigo-400", "bg-gray-400"].map(color => (
                  <button
                    key={color}
                    onClick={() => changeTagColor(tagColorMenu.tag, color)}
                    className={`w-8 h-8 rounded-full ${color}`}
                    title={color.replace('bg-', '').replace('-400', '')}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Edit Modal */}
          {editingSnippet && (
            <EditModal
              editingBox={{
                ...editingSnippet,
                label: editingSnippet.title,
                description: editingSnippet.description ?? "",
                totalViews: editingSnippet.totalViews ?? 0,
                createdAt: typeof editingSnippet.createdAt === "string" ? editingSnippet.createdAt : editingSnippet.createdAt.toISOString(),
                updatedAt: typeof editingSnippet.updatedAt === "string" ? editingSnippet.updatedAt : editingSnippet.updatedAt.toISOString(),
              }}
              editText={editTitle}
              editDescription={editDescription}
              editColor={editColor}
              editTags={editTags}
              editCode={editCode}
              editCodeLanguage={editCodeLanguage}
              newTag={newTag}
              onTextChange={setEditTitle}
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
            />
          )}

          {/* Canvas */}
          <div
            ref={canvasRef}
            className="w-full h-full cursor-grab"
            style={{
              transform: `scale(${scale}) translate(${Math.round(panX / scale)}px, ${Math.round(panY / scale)}px)`,
              transformOrigin: '0 0',
              cursor: isDragging ? 'grabbing' : 'grab'
            }}
            onMouseDown={handleMouseDown}
          >
            {sortedSnippets.map(snippet => (
              <Box
                key={snippet.id}
                box={snippet}
                scale={scale}
                onUpdatePosition={moveSnippet}
                onStartEditing={startEditing}
                onTagRightClick={handleTagRightClick}
                onFilesChanged={handleFilesChanged}
              />
            ))}
          </div>

          {/* Empty state */}
          {snippets.length === 0 && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-xl font-semibold mb-2">No Snippets Yet</h3>
                <p className="text-gray-600 mb-6">Get started by creating your first snippet!</p>
                <button
                  onClick={addSnippet}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md"
                  disabled={!canEdit}
                >
                  Create First Snippet
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}