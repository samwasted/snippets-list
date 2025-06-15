import React from "react";
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from "./Sidebar";
import Box from "./Box";
import EditModal from "./EditModal";
import { motion, animate } from "framer-motion";
import { useSpaceWebSocket } from "./useSpaceWebSocket";
import useDarkMode from "./useDarkMode";
import type { TagColorMenuState, Box as BoxType } from "./types";

// Type definitions
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
  files?: string[];
}

interface Space {
  id: string;
  name: string;
  totalViews: number;
  order: string[];
  isPublic: boolean;
  ownerId: string;
  snippets?: Snippet[];
  createdAt: Date; 
  updatedAt: Date; 
}

// API utilities
const API_BASE_URL = `${import.meta.env.VITE_HTTP_URL}/api/v1`;

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
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { spaceId } = useParams<{ spaceId: string }>();

  // Safety check for spaceId
  if (!spaceId) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Invalid Space ID</h1>
          <p className="text-gray-600">The space ID is missing or invalid.</p>
        </div>
      </div>
    );
  }

  // State management
  const [isDarkMode, toggleDarkMode] = useDarkMode();
  const [scale, setScale] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSpaceDragDisabled, setIsSpaceDragDisabled] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [refreshKey, setRefreshKey] = useState(0);

  // Edit modal state
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null);
  const [editText, setEditText] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editCode, setEditCode] = useState("");
  const [editCodeLanguage, setEditCodeLanguage] = useState("javascript");
  const [newTag, setNewTag] = useState("");

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

  // Handle orientation changes
  useEffect(() => {
    const handleResize = () => {
      setIsDragging(false);
      setDragStart({ x: 0, y: 0 });
      setPanStart({ x: panX, y: panY });

      if (containerRef.current) {
        setRefreshKey(prev => prev + 1);
      }
    };

    const handleOrientationChange = () => {
      setIsDragging(false);
      setDragStart({ x: 0, y: 0 });
      setPanStart({ x: panX, y: panY });

      setTimeout(() => {
        if (containerRef.current) {
          // const rect = containerRef.current.getBoundingClientRect();
        }
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }

    if (screen.orientation) {
      screen.orientation.addEventListener('change', handleOrientationChange);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
      if (screen.orientation) {
        screen.orientation.removeEventListener('change', handleOrientationChange);
      }
    };
  }, [panX, panY]);

  // Validate touch coordinates after orientation changes
  const validateTouchCoordinates = (touch: Touch) => {
    if (!containerRef.current) return null;

    const rect = containerRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
      return { x: touch.clientX, y: touch.clientY };
    }

    return null;
  };

  // Mouse event handlers for canvas panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isSpaceDragDisabled) return;
    
    const target = e.target as HTMLElement;
    const isOnCanvas = canvasRef.current?.contains(target) || target === canvasRef.current;

    if (!isOnCanvas) return;

    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setPanStart({ x: panX, y: panY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || isSpaceDragDisabled) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    setPanX(panStart.x + deltaX);
    setPanY(panStart.y + deltaY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle code updates from drag-and-drop
  const handleCodeUpdate = async (snippetId: string, code: string, fileName: string) => {
    try {
      setSnippets(prev => prev.map(snippet =>
        snippet.id === snippetId
          ? {
            ...snippet,
            code: code,
            title: fileName.replace(/\.[^/.]+$/, ""),
            description: `Loaded from: ${fileName}`
          }
          : snippet
      ));

      const response = await fetch(`/api/spaces/${spaceId}/snippet/${snippetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code,
          title: fileName.replace(/\.[^/.]+$/, ""),
          description: `Loaded from: ${fileName}`
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        console.error('Failed to save code to server');
      }
    } catch (error) {
      console.error('Error updating snippet code:', error);
    }
  };

  // Touch event handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isSpaceDragDisabled) return;
    
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    const target = e.target as HTMLElement;
    const isOnCanvas = canvasRef.current?.contains(target) || target === canvasRef.current;

    if (!isOnCanvas) return;

    const validatedCoords = validateTouchCoordinates(touch as unknown as Touch);
    if (!validatedCoords) {
      console.log('Invalid touch coordinates detected, skipping');
      return;
    }

    e.preventDefault();
    setIsDragging(false);

    setTimeout(() => {
      setIsDragging(true);
      setDragStart({ x: touch.clientX, y: touch.clientY });
      setPanStart({ x: panX, y: panY });
    }, 10);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1 || isSpaceDragDisabled) return;

    const touch = e.touches[0];

    const validatedCoords = validateTouchCoordinates(touch as Touch);
    if (!validatedCoords) {
      console.log('Invalid touch coordinates during move, resetting drag');
      setIsDragging(false);
      return;
    }

    const deltaX = touch.clientX - dragStart.x;
    const deltaY = touch.clientY - dragStart.y;

    setPanX(panStart.x + deltaX);
    setPanY(panStart.y + deltaY);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Global mouse and touch handlers
  React.useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging || isSpaceDragDisabled) return;

      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      setPanX(panStart.x + deltaX);
      setPanY(panStart.y + deltaY);
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (!isDragging || e.touches.length !== 1 || isSpaceDragDisabled) return;

      if (!containerRef.current) {
        setIsDragging(false);
        return;
      }

      const touch = e.touches[0];
      const deltaX = touch.clientX - dragStart.x;
      const deltaY = touch.clientY - dragStart.y;

      setPanX(panStart.x + deltaX);
      setPanY(panStart.y + deltaY);
    };

    const handleGlobalTouchEnd = () => {
      setIsDragging(false);
    };

    const handleOrientationChangeDuringTouch = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
      document.addEventListener('touchend', handleGlobalTouchEnd);
      document.addEventListener('touchcancel', handleGlobalTouchEnd);
      window.addEventListener('orientationchange', handleOrientationChangeDuringTouch);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('touchmove', handleGlobalTouchMove);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
      document.removeEventListener('touchcancel', handleGlobalTouchEnd);
      window.removeEventListener('orientationchange', handleOrientationChangeDuringTouch);
    };
  }, [isDragging, dragStart, panStart, panX, panY, isSpaceDragDisabled]);

  // Move snippet position
  const moveSnippet = async (id: string, deltaX: number, deltaY: number) => {
    const snippet = snippets.find(s => s.id === id);
    if (!snippet) return;

    const newX = Math.round(snippet.x + deltaX);
    const newY = Math.round(snippet.y + deltaY);

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

      if (sendSnippetMove && isJoined && (userRole === 'EDITOR' || userRole === 'OWNER' || userRole === 'ADMIN' || userRole === 'VIEWER')) {
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

  // WebSocket message handling
  useEffect(() => {
    if (!lastMessage) return;

    console.log('Processing WebSocket message:', lastMessage);
    const isFromCurrentUser = lastMessage.userId === currentUser?.id;

    switch (lastMessage.type) {
      case 'snippet-moved':
        const moveId = lastMessage.payload.id;
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
        const snippetId = lastMessage.payload.snippetId;
        if (!snippetId) return;

        setSnippets(prev => {
          const exists = prev.some(s => s.id === snippetId);

          if (exists && isFromCurrentUser) {
            console.log('Skipping duplicate creation from current user');
            return prev;
          }

          if (!exists) {
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
              ownerId: lastMessage.payload.ownerId || lastMessage.userId || currentUser?.id || '',
              createdAt: new Date(lastMessage.payload.createdAt || Date.now()),
              updatedAt: new Date(lastMessage.payload.updatedAt || Date.now())
            };

            console.log('Sending HTTP edit request for newly created snippet...');
            try {
              fetchSpaceData()
            } catch (e) {
              console.log("Failed to fetch space data after creation")
            }

            return [...prev, newSnippet];
          }

          return prev;
        });

        setSnippetOrder(prev => {
          if (!snippetId || prev.includes(snippetId)) return prev;
          return [...prev, snippetId];
        });
        break;

      case 'snippet-updated':
        const targetId = lastMessage.payload.snippetId || lastMessage.payload.id;
        if (!targetId) return;

        const shouldSkipUpdate = isFromCurrentUser &&
          typeof lastMessage.timestamp === 'number' &&
          (Date.now() - lastMessage.timestamp < 1000);

        if (!shouldSkipUpdate) {
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
        }
        break;

      case 'snippet-deleted':
        const deletedId = lastMessage.payload.snippetId || lastMessage.payload.id;
        if (!deletedId) return;

        setSnippets(prev => prev.filter(snippet => snippet.id !== deletedId));
        setSnippetOrder(prev => prev.filter(id => id !== deletedId));
        break;

      case 'space-view':
        if (lastMessage.payload.order && Array.isArray(lastMessage.payload.order)) {
          setSnippetOrder(lastMessage.payload.order);
        }
        break;
    }
  }, [lastMessage, spaceId, currentUser?.id]);

  // Navigate to specific snippet
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

  // Fetch space data from API
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

  // Toggle space visibility
  const handleToggleSpaceVisibility = async (isPublic: boolean) => {
    try {
      console.log(`Toggling space visibility to ${isPublic ? 'public' : 'private'}...`);

      await apiRequest(`/space/${spaceId}/visibility`, {
        method: 'PUT',
        body: JSON.stringify({
          isPublic: isPublic
        })
      });

      setSpaceData(prevData => prevData ? { ...prevData, isPublic } : prevData);

      console.log(`Space visibility updated to ${isPublic ? 'public' : 'private'}`);
    } catch (error) {
      console.error('Error updating space visibility:', error);
      throw error;
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

  // Handle zoom via mouse wheel
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

  // Zoom control functions
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

  // Handle tag right-click for color menu
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

  // Create new snippet
  const addSnippet = async () => {
    if (Date.now() - lastCreationTime < 100) {
      console.log('Too rapid snippet creation');
      return;
    }
    setLastCreationTime(Date.now());

    const newSnippetData = {
      title: `Box`,
      description: "Click to edit this snippet",
      code: "// Add your code here",
      tags: [],
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

      if (sendSnippetCreate && (userRole === 'EDITOR' || userRole === 'OWNER' || userRole === 'ADMIN')) {
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

  // Update existing snippet
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

  // Tag management functions
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

  const changeTagColor = async (tag: string, color: string) => {
    setSnippets(prev => prev.map(snippet =>
      snippet.tags.includes(tag)
        ? { ...snippet, color: color, updatedAt: new Date() }
        : snippet
    ));
    setTagColorMenu({ show: false, tag: "", x: 0, y: 0 });

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

  // Filtering and search functions
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

  // Permission and connection status helpers
  console.log(userPermissions)
  const canEdit = userRole === 'OWNER' || 
  userRole === 'EDITOR' || 
  userRole === 'ADMIN' ||
  userPermissions?.allowed ||
  userPermissions?.isOwner ||
  spaceData?.ownerId === currentUser.id;

  const connectionStatus = (() => {
    if (isJoined) return { status: 'Connected & Joined', color: isDarkMode ? 'bg-green-900/50 text-green-200' : 'bg-green-100 text-green-800' };
    if (isConnected) return { status: 'Connected (Joining...)', color: isDarkMode ? 'bg-yellow-900/50 text-yellow-200' : 'bg-yellow-100 text-yellow-800' };
    if (lastError) return { status: `Error: ${lastError.slice(0, 30)}...`, color: isDarkMode ? 'bg-red-900/50 text-red-200' : 'bg-red-100 text-red-800' };
    return { status: 'Disconnected', color: isDarkMode ? 'bg-red-900/50 text-red-200' : 'bg-red-100 text-red-800' };
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
    <div className={`h-screen transition-colors duration-300 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'
      }`} key={refreshKey}>
      {/* Main Content */}
      <div className="flex flex-col h-full">
        {/* Header with Back Button and Controls */}
        <div className={`border-b p-3 sm:p-4 transition-colors duration-300 ${isDarkMode
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
          }`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {/* Back Button */}
              <button
                onClick={() => navigate('/dashboard')}
                className={`p-2 rounded-md transition-colors duration-300 ${isDarkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                  }`}
                title="Back to dashboard"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>

              <h1 className={`text-lg font-semibold truncate transition-colors duration-300 hidden sm:block ${isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                {spaceData?.name || 'Code Space'}
              </h1>
              {isLoading && (
                <span className={`text-sm transition-colors duration-300 hidden ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                  Loading...
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-md transition-colors duration-300 ${isDarkMode
                    ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDarkMode ? (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>

              {/* Zoom Controls */}
              <div className={`flex items-center gap-1 rounded-md p-1 transition-colors duration-300 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                }`}>
                <button
                  onClick={() => zoom(-0.2)}
                  className={`p-1 rounded transition-colors duration-300 ${isDarkMode
                      ? 'text-gray-300 hover:text-white hover:bg-gray-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                    }`}
                  title="Zoom out"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                <span className={`px-2 text-xs sm:text-sm min-w-[2.5rem] sm:min-w-[3rem] text-center transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={() => zoom(0.2)}
                  className={`p-1 rounded transition-colors duration-300 ${isDarkMode
                      ? 'text-gray-300 hover:text-white hover:bg-gray-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                    }`}
                  title="Zoom in"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
              </div>

              {/* Space Drag Toggle */}
              <button
                onClick={() => setIsSpaceDragDisabled(!isSpaceDragDisabled)}
                className={`p-2 rounded-md transition-colors duration-300 ${
                  isSpaceDragDisabled
                    ? isDarkMode
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-red-500 text-white hover:bg-red-600'
                    : isDarkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                }`}
                title={isSpaceDragDisabled ? 'Enable space dragging' : 'Disable space dragging'}
              >
                {isSpaceDragDisabled ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                )}
              </button>

              {/* WebSocket Status */}
              <div className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm transition-colors duration-300 hidden sm:block ${connectionStatus.color}`}>
                <span className="hidden sm:inline">WS: </span>
                {connectionStatus.status}
              </div>

              {/* User Role */}
              {userPermissions && (
                <div className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm transition-colors duration-300 hidden sm:block ${isDarkMode ? 'bg-blue-900/50 text-blue-200' : 'bg-blue-100 text-blue-800'
                  }`}>
                  {userRole || "VIEWER"}
                </div>
              )}

              {/* Action Buttons */}
              <button
                onClick={addSnippet}
                className={`px-3 sm:px-4 py-2 rounded text-sm sm:text-base font-medium transition-colors duration-300 disabled:opacity-50 ${isDarkMode
                    ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400'
                  }`}
                disabled={!canEdit}
              >
                <span className="hidden sm:inline">Add Snippet</span>
                <span className="sm:hidden">Add</span>
              </button>

              <button
                onClick={fetchSpaceData}
                className={`px-3 sm:px-4 py-2 rounded text-sm sm:text-base font-medium transition-colors duration-300 ${isDarkMode
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
              >
                <span className="hidden sm:inline">Refresh</span>
                <span className="sm:hidden">↻</span>
              </button>

              {/* Sidebar Toggle */}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`p-2 rounded-md transition-all duration-300 ease-in-out transform hover:scale-105 ${isDarkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                  }`}
                title={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
              >
                <svg
                  className="h-5 w-5 transition-transform duration-300 ease-in-out"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  style={{
                    transform: isSidebarOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                  }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={isSidebarOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
                    className="transition-all duration-300 ease-in-out"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Canvas with Infinite Grid */}
        <div
          ref={containerRef}
          className={`flex-1 overflow-hidden relative transition-colors duration-300 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'
            }`}
          onWheel={handleWheel}
        >
          <motion.div
            ref={canvasRef}
            className={`absolute inset-0 ${
              isSpaceDragDisabled 
                ? 'cursor-default' 
                : 'cursor-grab active:cursor-grabbing'
            }`}
            style={{
              transform: `translate(${panX}px, ${panY}px) scale(${scale})`,
              transformOrigin: '0 0',
              touchAction: 'none'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Grid Background */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `
                  linear-gradient(${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} 1px, transparent 1px),
                  linear-gradient(90deg, ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} 1px, transparent 1px)
                `,
                backgroundSize: `${20 * scale}px ${20 * scale}px`,
                backgroundPosition: `${panX % (20 * scale)}px ${panY % (20 * scale)}px`
              }}
            />

            {/* Render Snippets */}
            {filteredSnippets.map(snippet => (
              <Box
                key={snippet.id}
                box={snippet}
                scale={scale}
                onUpdatePosition={moveSnippet}
                onStartEditing={() => startEditing(snippet)}
                onTagRightClick={handleTagRightClick}
                onCodeUpdate={handleCodeUpdate}
                isDarkMode={isDarkMode}
              />
            ))}

            {/* Empty State */}
            {filteredSnippets.length === 0 && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                <div className={`mb-4 text-lg transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                  No snippets found
                </div>
                <button
                  onClick={addSnippet}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors duration-300 disabled:opacity-50 ${isDarkMode
                      ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400'
                    }`}
                  disabled={!userPermissions?.allowed}
                >
                  Create Your First Snippet
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Sidebar */}
      {isSidebarOpen && (
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
          isDarkMode={isDarkMode}
        />
      )}

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
          isDarkMode={isDarkMode}
        />
      )}

      {/* Tag Color Menu */}
      {tagColorMenu.show && (
        <div
          className={`fixed rounded-lg shadow-lg border p-2 z-50 transition-colors duration-300 ${isDarkMode
              ? 'bg-gray-800 border-gray-600'
              : 'bg-white border-gray-200'
            }`}
          style={{ left: tagColorMenu.x, top: tagColorMenu.y }}
        >
          <div className={`text-sm p-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
            Change color for "{tagColorMenu.tag}"
          </div>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {['bg-red-400', 'bg-blue-400', 'bg-green-400', 'bg-yellow-400', 'bg-purple-400', 'bg-pink-400', 'bg-indigo-400', 'bg-gray-400'].map(color => (
              <button
                key={color}
                onClick={() => changeTagColor(tagColorMenu.tag, color)}
                className={`w-6 h-6 rounded ${color} hover:scale-110 transition-transform`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
