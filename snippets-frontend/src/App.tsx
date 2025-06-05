import React, { useState, useRef } from "react";
import { animate } from "framer-motion";
import Box from "./components/Box";
import EditModal from "./components/EditModal";
import TagColorMenu from "./components/TagColorMenu";
import Sidebar from "./components/Sidebar";
import { colors, type Box as BoxType, type TagColorMenuState } from "./components/types";

export default function Space() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Zoom & pan - replaced framer-motion with native state
  const [scale, setScale] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  
  // Pan drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Boxes and links
  const [boxes, setBoxes] = useState<BoxType[]>([
    { 
      id: "1", 
      x: 100, 
      y: 100, 
      color: "bg-red-400", 
      label: "Box 1",
      description: "This is the first box with some sample description text.",
      tags: ["important", "sample"],
      files: [],
      code: "",
      codeLanguage: "javascript"
    },
    { 
      id: "2", 
      x: 400, 
      y: 200, 
      color: "bg-green-400", 
      label: "Box 2",
      description: "Second box for demonstration purposes.",
      tags: ["demo", "test"],
      files: [],
      code: "// Sample JavaScript code\nfunction greet(name) {\n  return `Hello, ${name}!`;\n}\n\nconsole.log(greet('World'));",
      codeLanguage: "javascript"
    },
  ]);
  const [nextBoxId, setNextBoxId] = useState<number>(3);
  const [boxOrder, setBoxOrder] = useState<string[]>([]);

  const [editingBox, setEditingBox] = useState<BoxType | null>(null);
  const [editText, setEditText] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editCode, setEditCode] = useState("");
  const [editCodeLanguage, setEditCodeLanguage] = useState("javascript");
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

  // Get all unique tags from all boxes
  const getAllTags = () => {
    const tagSet = new Set<string>();
    boxes.forEach(box => {
      box.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  };

  const handleFilesChanged = (id: string, files: File[]) => {
    setBoxes(prevBoxes => 
      prevBoxes.map(box => 
        box.id === id ? { ...box, files } : box
      )
    );
  };

  // Initialize box order when boxes change
  React.useEffect(() => {
    const currentIds = boxes.map(box => box.id);
    const newIds = currentIds.filter(id => !boxOrder.includes(id));
    const validIds = boxOrder.filter(id => currentIds.includes(id));
    setBoxOrder([...validIds, ...newIds]);
  }, [boxes.length]);

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

  // Add new box
  const addBox = () => {
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newBox: BoxType = {
      id: String(nextBoxId),
      x: Math.random() * 400 + 200,
      y: Math.random() * 400 + 200,
      color: randomColor,
      label: `Box ${nextBoxId}`,
      description: "",
      tags: [],
      files: [],
      code: "",
      codeLanguage: "javascript"
    };
    setBoxes(prev => [...prev, newBox]);
    setNextBoxId(prev => prev + 1);
  };

  // Edit box
  const startEditing = (box: BoxType) => {
    setEditingBox(box);
    setEditText(box.label);
    setEditDescription(box.description);
    setEditColor(box.color);
    setEditTags([...box.tags]);
    setEditCode(box.code || "");
    setEditCodeLanguage(box.codeLanguage || "javascript");
    setNewTag("");
  };

  const saveEdit = () => {
    if (editingBox) {
      setBoxes(prev => prev.map(box => 
        box.id === editingBox.id 
          ? { 
              ...box, 
              label: editText, 
              description: editDescription,
              color: editColor,
              tags: editTags,
              code: editCode,
              codeLanguage: editCodeLanguage
            }
          : box
      ));
    }
    setEditingBox(null);
  };

  const cancelEdit = () => {
    setEditingBox(null);
    setEditText("");
    setEditDescription("");
    setEditColor("");
    setEditTags([]);
    setEditCode("");
    setEditCodeLanguage("javascript");
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
    e.preventDefault();
    e.stopPropagation();
    setTagColorMenu({
      show: true,
      tag: tag,
      x: e.clientX,
      y: e.clientY
    });
  };

  const changeTagColor = (tag: string, color: string) => {
    setBoxes(prev => prev.map(box => 
      box.tags.includes(tag) 
        ? { ...box, color: color }
        : box
    ));
    setTagColorMenu({ show: false, tag: "", x: 0, y: 0 });
  };

  // Delete box
  const deleteBox = (id: string) => {
    setBoxes(prev => prev.filter(box => box.id !== id));
  };

  // Box position update
  const updateBox = (id: string, deltaX: number, deltaY: number) => {
    setBoxes(prev => prev.map(box => 
      box.id === id 
        ? { ...box, x: box.x + deltaX / scale, y: box.y + deltaY / scale }
        : box
    ));
  };

  // Navigate to box - still using framer-motion animate for smooth navigation
  const navigateToBox = (box: BoxType) => {
    const centerX = -box.x * scale + window.innerWidth / 2 - 96;
    const centerY = -box.y * scale + window.innerHeight / 2 - 64;

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

  const matchesSearch = (box: BoxType, query: string) => {
    if (!query.trim()) return true;
    const searchTerm = query.toLowerCase().trim();
    return (
      box.label.toLowerCase().includes(searchTerm) ||
      box.description.toLowerCase().includes(searchTerm) ||
      box.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
      box.files?.some(file => file.name.toLowerCase().includes(searchTerm)) ||
      (box.code && box.code.toLowerCase().includes(searchTerm))
    );
  };

  // Drag reorder function
  const reorderBoxes = (startIndex: number, endIndex: number) => {
    const newOrder = [...boxOrder];
    const [removed] = newOrder.splice(startIndex, 1);
    newOrder.splice(endIndex, 0, removed);
    setBoxOrder(newOrder);
  };

  // Apply filters and search
  const filteredBoxes = boxes.filter(box => {
    if (!matchesSearch(box, searchQuery)) return false;
    if (tagFilters.size > 0) {
      const hasSelectedTag = box.tags.some(tag => tagFilters.has(tag));
      if (!hasSelectedTag) return false;
    }
    return true;
  });

  // Sort boxes according to custom order
  const sortedFilteredBoxes = filteredBoxes.sort((a, b) => {
    const aIndex = boxOrder.indexOf(a.id);
    const bIndex = boxOrder.indexOf(b.id);
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  const visibleBoxes = sortedFilteredBoxes;

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
        <button onClick={addBox} className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600">Add Box</button>
      </div>

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
      {editingBox && (
        <EditModal 
          editingBox={editingBox}
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
          onTagKeyPress={handleTagKeyPress}
          onSave={saveEdit}
          onCancel={cancelEdit}
          onDelete={deleteBox}
        />
      )}

      {/* Sidebar */}
      <Sidebar 
        boxes={boxes}
        visibleBoxes={visibleBoxes}
        boxOrder={boxOrder}
        searchQuery={searchQuery}
        tagFilters={tagFilters}
        getAllTags={getAllTags}
        onSearchChange={setSearchQuery}
        onToggleTagFilter={toggleTagFilter}
        onClearAllFilters={clearAllFilters}
        onTagRightClick={handleTagRightClick}
        onNavigateToBox={navigateToBox}
        onReorderBoxes={reorderBoxes}
        onStartEditing={startEditing}
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
        {/* Boxes */}
        {visibleBoxes.map(box => (
          <Box 
            key={box.id}
            box={box}
            scale={scale}
            onUpdatePosition={updateBox}
            onStartEditing={startEditing}
            onTagRightClick={handleTagRightClick}
            onFilesChanged={handleFilesChanged}
          />
        ))}
      </div>
    </div>
  );
}