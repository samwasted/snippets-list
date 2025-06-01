import React, { useState, useRef } from "react";
import { motion, useMotionValue, animate } from "framer-motion";
import Box from "./components/Box";
import EditModal from "./components/EditModal";
import TagColorMenu from "./components/TagColorMenu";
import Sidebar from "./components/Sidebar";
import { colors, type Box as BoxType, type TagColorMenuState } from "./components/types";
// import Line from "./line";
//CANT KEEP UNUSED IMPORTS IN TS

// Local Storage Helpers - Updated to handle files
const LOCAL_STORAGE_KEY = "box-data";

const saveToLocalStorage = (data: { boxes: BoxType[]; nextBoxId: number; boxOrder: string[] }) => {
  // Clone data and convert File objects to serializable format
  const serializableData = {
    ...data,
    boxes: data.boxes.map(box => ({
      ...box,
      files: box.files?.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        // Store file content as base64 for small files (< 1MB)
        content: file.size < 1024 * 1024 ? null : null // We'll handle file storage differently
      })) || []
    }))
  };
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(serializableData));
};

const loadFromLocalStorage = (): { boxes: BoxType[]; nextBoxId: number; boxOrder: string[] } | null => {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as { boxes: BoxType[]; nextBoxId: number; boxOrder: string[] };
    // Note: Files won't be restored from localStorage as File objects can't be serialized
    // You might want to implement a proper file storage solution for persistence
    return data;
  } catch (e) {
    console.error("Failed to parse localStorage:", e);
    return null;
  }
};

export default function Space() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Load persisted data
  const initialData = loadFromLocalStorage();

  // Zoom & pan
  const [scale, setScale] = useState(1);
  const panX = useMotionValue(0);
  const panY = useMotionValue(0);

  // Boxes and links
  const [boxes, setBoxes] = useState<BoxType[]>(
    initialData?.boxes || [
      { 
        id: "1", 
        x: 100, 
        y: 100, 
        color: "bg-red-400", 
        label: "Box 1",
        description: "This is the first box with some sample description text.",
        tags: ["important", "sample"],
        files: []
      },
      { 
        id: "2", 
        x: 400, 
        y: 200, 
        color: "bg-green-400", 
        label: "Box 2",
        description: "Second box for demonstration purposes.",
        tags: ["demo", "test"],
        files: []
      },
    ]
  );
  const [nextBoxId, setNextBoxId] = useState<number>(initialData?.nextBoxId || 3);
  const [boxOrder, setBoxOrder] = useState<string[]>(initialData?.boxOrder || []);

  // Persist state changes (including files)
  React.useEffect(() => {
    saveToLocalStorage({ boxes, nextBoxId, boxOrder });
  }, [boxes, nextBoxId, boxOrder]);

  const [editingBox, setEditingBox] = useState<BoxType | null>(null);
  const [editText, setEditText] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
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


  // const exportAllFiles = () => {
  //   boxes.forEach(box => {
  //     if (box.files && box.files.length > 0) {
  //       box.files.forEach(file => {
  //         const url = URL.createObjectURL(file);
  //         const a = document.createElement('a');
  //         a.href = url;
  //         a.download = `${box.label}_${file.name}`;
  //         a.click();
  //         URL.revokeObjectURL(url);
  //       });
  //     }
  //   });
  // };
  // see isko later

  // const getTotalFileCount = () => {
  //   return boxes.reduce((total, box) => total + (box.files?.length || 0), 0);
  // };

  // const getTotalFileSize = () => {
  //   return boxes.reduce((total, box) => {
  //     return total + (box.files?.reduce((size, file) => size + file.size, 0) || 0);
  //   }, 0);
  // };

  // const formatFileSize = (bytes: number) => {
  //   if (bytes === 0) return '0 Bytes';
  //   const k = 1024;
  //   const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  //   const i = Math.floor(Math.log(bytes) / Math.log(k));
  //   return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  // };

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

  // const reset = () => {
  //   setScale(1);
  //   panX.set(0);
  //   panY.set(0);
  // }; //causing issues

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
      files: []
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
              tags: editTags
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

  // Navigate to box
  const navigateToBox = (box: BoxType) => {
    const centerX = -box.x * scale + window.innerWidth / 2 - 96;
    const centerY = -box.y * scale + window.innerHeight / 2 - 64;

    animate(panX, centerX, { type: "spring", stiffness: 100, damping: 20 });
    animate(panY, centerY, { type: "spring", stiffness: 100, damping: 20 });
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
      box.files?.some(file => file.name.toLowerCase().includes(searchTerm))
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
        {/* <button onClick={reset} className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600">Recenter</button> */}
        <button onClick={addBox} className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600">Add Box</button>
        
        {/* File statistics (improve kardiyo isko)*/}
        {/* {getTotalFileCount() > 0 && (
          <div className="bg-purple-500 text-white px-3 py-1 rounded flex items-center gap-2">
            <div className="flex items-center gap-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"/>
              </svg>
              <span>{getTotalFileCount()} files ({formatFileSize(getTotalFileSize())})</span>
            </div>
            <button 
              onClick={exportAllFiles}
              className="bg-purple-600 hover:bg-purple-700 px-2 py-0.5 rounded text-xs flex items-center gap-1"
              title="Export all files"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
              </svg>
              All
            </button>
          </div>
        )} */}
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
          newTag={newTag}
          onTextChange={setEditText}
          onDescriptionChange={setEditDescription}
          onColorChange={setEditColor}
          onTagsChange={setEditTags}
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

      {/* Canvas - Pan container */}
      <motion.div
        ref={canvasRef}
        style={{ scale, x: panX, y: panY }}
        drag
        className="w-full h-full"
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
      </motion.div>
    </div>
  );
}