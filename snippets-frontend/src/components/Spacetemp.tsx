import React, { useState, useRef, useEffect } from "react";
import { animate } from "framer-motion";
import Box from "./Box";
import EditModal from "./EditModal";
import TagColorMenu from "./TagColorMenu";
import Sidebar from "./Sidebar";
import { colors, type TagColorMenuState, type Space, type SpaceCollaborator, type User, type Snippet } from "./types";
import { useSpaceWebSocket } from "./useSpaceWebSocket";

interface SpaceProps {
  spaceData?: Space;
  initialSnippets?: Snippet[];
  currentUser?: User;
  collaborators?: SpaceCollaborator[];
}

export default function Space({ 
  spaceData, 
  initialSnippets = [], 
  currentUser,
  collaborators = []
}: SpaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Zoom & pan - replaced framer-motion with native state
  const [scale, setScale] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [editCodeLanguage, setEditCodeLanguage] = useState("javascript");
  
  // Pan drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // WebSocket integration
  const { sendSnippetUpdate, sendSnippetCreate, sendSnippetDelete, lastMessage } = useSpaceWebSocket();
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Snippets state (renamed from boxes)
  const [snippets, setSnippets] = useState<Snippet[]>(
    initialSnippets.length > 0 ? initialSnippets : [
      {
        id: "1",
        title: "Sample Snippet 1",
        description: "This is the first snippet with some sample description text.",
        code: "// Sample JavaScript code\nfunction greet(name) {\n  return `Hello, ${name}!`;\n}\n\nconsole.log(greet('World'));",
        tags: ["important", "sample"],
        color: "bg-red-400",
        files: [],
        x: 100,
        y: 100,
        totalViews: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        ownerId: currentUser?.id || "demo-user",
        spaceId: spaceData?.id || null
      }
    ]
  );

  const [nextSnippetId, setNextSnippetId] = useState<number>(3);
  const [snippetOrder, setSnippetOrder] = useState<string[]>(spaceData?.order || []);

  // Edit state (updated for snippets)
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editCode, setEditCode] = useState("");
  const [newTag, setNewTag] = useState("");
  const [tagFilters, setTagFilters] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  // Tag color menu state
  const [tagColorMenu, setTagColorMenu] = useState<TagColorMenuState>({ 
    show: false, 
    tag: "", 
    x: 0, 
    y: 0 
  });

  // Check user permissions
  const userRole = collaborators.find(c => c.userId === currentUser?.id)?.role || 'VIEWER';
  const canEdit = userRole === 'EDITOR' || userRole === 'ADMIN' || spaceData?.ownerId === currentUser?.id;
  const canAdmin = userRole === 'ADMIN' || spaceData?.ownerId === currentUser?.id;

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      switch(lastMessage.type) {
        case 'snippetMoved':
          // Only update if the move was not initiated by current user
          if (lastMessage.payload.movedBy !== currentUser?.id) {
            setSnippets(prev => prev.map(snippet => 
              snippet.id === lastMessage.payload.id ? { 
                ...snippet, 
                x: lastMessage.payload.x,
                y: lastMessage.payload.y,
                updatedAt: new Date(lastMessage.payload.updatedAt)
              } : snippet
            ));
          }
          break;
        
        case 'snippetCreated':
          setSnippets(prev => {
            // Check if snippet already exists to avoid duplicates
            const exists = prev.some(s => s.id === lastMessage.payload.id);
            if (!exists) {
              const newSnippet: Snippet = {
                ...lastMessage.payload,
                createdAt: new Date(lastMessage.payload.createdAt),
                updatedAt: new Date(lastMessage.payload.updatedAt),
                spaceId: spaceData?.id || null,
                ownerId: spaceData?.ownerId || "idk"
              };
              return [...prev, newSnippet];
            }
            return prev;
          });
          break;
        
        case 'snippetDeleted':
          setSnippets(prev => prev.filter(snippet => snippet.id !== lastMessage.payload.id));
          break;
        
        case 'userJoined':
          // Handle user joined notification
          console.log(`User joined: ${lastMessage.payload.userId}`);
          break;
        
        case 'userLeft':
          // Handle user left notification
          console.log(`User left: ${lastMessage.payload.userId}`);
          break;
      }
    }
  }, [lastMessage, currentUser?.id, spaceData?.id]);

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceRef.current).forEach(clearTimeout);
    };
  }, []);

  // Native pan handlers
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

  // Add mouse event listeners for global mouse events
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

  // Get all unique tags from all snippets
  const getAllTags = () => {
    const tagSet = new Set<string>();
    snippets.forEach(snippet => {
      snippet.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  };

  const handleFilesChanged = (id: string, files: File[]) => {
    if (!canEdit) return;
    
    // Convert File objects to file paths/names for database storage
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
    
    // TODO: Upload files to server and get actual file paths
    // This would be handled by your API layer
  };

  // Initialize snippet order when snippets change
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

  // Zoom handlers - only zoom when on canvas
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

  // Add new snippet with WebSocket integration
  const addSnippet = async () => {
    if (!canEdit) return;
    
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newSnippet: Snippet = {
      id: String(nextSnippetId), // In real app, this would be generated by the database
      title: `Snippet ${nextSnippetId}`,
      description: "",
      code: "",
      tags: [],
      color: randomColor,
      files: [],
      x: Math.random() * 400 + 200,
      y: Math.random() * 400 + 200,
      totalViews: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      ownerId: currentUser?.id || "demo-user",
      spaceId: spaceData?.id || null
    };
    
    // Optimistic update
    setSnippets(prev => [...prev, newSnippet]);
    setNextSnippetId(prev => prev + 1);
    
    // Send WebSocket update
    if (sendSnippetCreate) {
      sendSnippetCreate({
        id: newSnippet.id,
        title: newSnippet.title,
        description: newSnippet.description || undefined,
        code: newSnippet.code || undefined,
        tags: newSnippet.tags,
        color: newSnippet.color,
        files: newSnippet.files,
        x: newSnippet.x,
        y: newSnippet.y,
        totalViews: newSnippet.totalViews,
        createdAt: newSnippet.createdAt.toISOString(),
        updatedAt: newSnippet.updatedAt.toISOString()
      });
    }
    
    // Persist to database
    try {
      await fetch(`/api/space/${spaceData?.id}/snippet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSnippet)
      });
    } catch (error) {
      console.error("Failed to create snippet:", error);
      // Optionally revert optimistic update on error
      setSnippets(prev => prev.filter(s => s.id !== newSnippet.id));
    }
  };

  // Edit snippet
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
      updatedAt: new Date()
    };
    
    setSnippets(prev => prev.map(snippet => 
      snippet.id === editingSnippet.id ? updatedSnippet : snippet
    ));
    
    setEditingSnippet(null);
    
    // TODO: Send WebSocket update for snippet edit
    // TODO: Save to database
    try {
      await fetch(`/api/space/${spaceData?.id}/snippet/${editingSnippet.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedSnippet)
      });
    } catch (error) {
      console.error("Failed to update snippet:", error);
    }
  };

  const cancelEdit = () => {
    setEditingSnippet(null);
    setEditTitle("");
    setEditDescription("");
    setEditColor("");
    setEditTags([]);
    setEditCode("");
    setNewTag("");
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

  // Tag color management
  const handleTagRightClick = (e: React.MouseEvent, tag: string) => {
    if (!canEdit) return;
    
    e.preventDefault();
    e.stopPropagation();
    setTagColorMenu({
      show: true,
      tag: tag,
      x: e.clientX,
      y: e.clientY
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
    
    // TODO: Update database
    // await updateSnippetsWithTag(tag, { color });
  };

  // Delete snippet with WebSocket integration
  const deleteSnippet = async (id: string) => {
    if (!canEdit) return;
    
    // Optimistic update
    setSnippets(prev => prev.filter(snippet => snippet.id !== id));
    
    // Send WebSocket update
    if (sendSnippetDelete) {
      sendSnippetDelete({ id });
    }
    
    // Persist to database
    try {
      await fetch(`/api/space/${spaceData?.id}/snippet/${id}`, {
        method: "DELETE"
      });
    } catch (error) {
      console.error("Failed to delete snippet:", error);
      // Optionally restore snippet on error
    }
  };

  // Updated snippet position update with WebSocket integration
  const updateSnippet = async (id: string, deltaX: number, deltaY: number) => {
    if (!canEdit) return;

    let updatedSnippet: Snippet | null = null;
    setSnippets(prev => {
      const updated = prev.map(snippet =>
        snippet.id === id
          ? {
              ...snippet,
              x: snippet.x + deltaX / scale,
              y: snippet.y + deltaY / scale,
              updatedAt: new Date()
            }
          : snippet
      );
      // Find the updated snippet after mapping
      updatedSnippet = updated.find((s): s is Snippet => s.id === id) || null;
      return updated;
    });

    // Immediate WebSocket update
    // Use a setTimeout to ensure updatedSnippet is set after setSnippets runs
    setTimeout(() => {
      if (updatedSnippet && sendSnippetUpdate) {
        sendSnippetUpdate({
          id: updatedSnippet!.id,
          x: updatedSnippet!.x,
          y: updatedSnippet!.y,
          updatedAt: updatedSnippet!.updatedAt.toISOString(),
          movedBy: currentUser?.id
        });
      }
    }, 0);

    // Debounced HTTP persistence
    if (debounceRef.current[id]) {
      clearTimeout(debounceRef.current[id]);
    }

    debounceRef.current[id] = setTimeout(async () => {
      const currentSnippet = snippets.find(s => s.id === id);
      if (currentSnippet) {
        try {
          await fetch(`/api/space/${spaceData?.id}/snippet/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              x: currentSnippet.x,
              y: currentSnippet.y
            })
          });
        } catch (error) {
          console.error("Position update failed:", error);
        }
      }
    }, 1000);
  };

  // Navigate to snippet - still using framer-motion animate for smooth navigation
  const navigateToSnippet = (snippet: Snippet) => {
    const centerX = -snippet.x * scale + window.innerWidth / 2 - 96;
    const centerY = -snippet.y * scale + window.innerHeight / 2 - 64;

    // Using framer-motion animate for smooth navigation 
    animate(panX, centerX, { 
      type: "spring", 
      stiffness: 100, 
      damping: 20,
      onUpdate: (value) => setPanX(value)
    });
    animate(panY, centerY, { 
      type: "spring", 
      stiffness: 100, 
      damping: 20,
      onUpdate: (value) => setPanY(value)
    });
  };

  // Filter functions
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

  // Drag reorder function
  const reorderSnippets = async (startIndex: number, endIndex: number) => {
    if (!canEdit) return;
    
    const newOrder = [...snippetOrder];
    const [removed] = newOrder.splice(startIndex, 1);
    newOrder.splice(endIndex, 0, removed);
    setSnippetOrder(newOrder);
    
    // TODO: Update order in database
    try {
      await fetch(`/api/space/${spaceData?.id}/order`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: newOrder })
      });
    } catch (error) {
      console.error("Failed to update order:", error);
    }
  };

  // Apply filters and search
  const filteredSnippets = snippets.filter(snippet => {
    if (!matchesSearch(snippet, searchQuery)) return false;
    if (tagFilters.size > 0) {
      const hasSelectedTag = snippet.tags.some(tag => tagFilters.has(tag));
      if (!hasSelectedTag) return false;
    }
    return true;
  });

  // Sort snippets according to custom order
  const sortedFilteredSnippets = filteredSnippets.sort((a, b) => {
    const aIndex = snippetOrder.indexOf(a.id);
    const bIndex = snippetOrder.indexOf(b.id);
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  const visibleSnippets = sortedFilteredSnippets;

  return (
    <div
      ref={containerRef}
      className="w-screen h-screen bg-gray-300 relative overflow-hidden"
      onWheel={handleWheel}
    >
      {/* Controls */}
      <div className="fixed top-4 left-4 z-50 flex gap-2">
        <button onClick={() => zoom(0.2)} className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">+</button>
        <button onClick={() => zoom(-0.2)} className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">-</button>
        {canEdit && (
          <button onClick={addSnippet} className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600">
            Add Snippet
          </button>
        )}
        {spaceData && (
          <div className="bg-white px-3 py-1 rounded shadow">
            <span className="text-sm font-medium">{spaceData.name}</span>
            {!spaceData.isPublic && <span className="ml-2 text-xs text-gray-500">Private</span>}
          </div>
        )}
      </div>

      {/* User info */}
      {currentUser && (
        <div className="fixed top-4 right-4 z-50 bg-white px-3 py-1 rounded shadow">
          <span className="text-sm">{currentUser.name || currentUser.username}</span>
          <span className="ml-2 text-xs text-gray-500">({userRole})</span>
        </div>
      )}

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
          onCancel={cancelEdit}
          onDelete={deleteSnippet}
          canDelete={canEdit}
        />
      )}

      {/* Sidebar */}
      <Sidebar 
        boxes={snippets} // You may need to update Sidebar to handle Snippet type
        visibleBoxes={visibleSnippets}
        boxOrder={snippetOrder}
        searchQuery={searchQuery}
        tagFilters={tagFilters}
        getAllTags={getAllTags}
        onSearchChange={setSearchQuery}
        onToggleTagFilter={toggleTagFilter}
        onClearAllFilters={clearAllFilters}
        onTagRightClick={handleTagRightClick}
        onNavigateToBox={navigateToSnippet}
        onReorderBoxes={reorderSnippets}
        onStartEditing={startEditing}
        canEdit={canEdit}
      />

      {/* Canvas - Native pan container */}
      <div
        ref={canvasRef}
        className="w-full h-full cursor-grab"
        style={{ 
          transform: `scale(${scale}) translate(${panX}px, ${panY}px)`,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Snippets (rendered as boxes) */}
        {visibleSnippets.map(snippet => (
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
  );
}