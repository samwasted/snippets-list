import React, { useState, useRef } from "react";
import { motion, useMotionValue } from "framer-motion";
import { Search, GripVertical } from "lucide-react";

type Box = {
  id: string;
  x: number;
  y: number;
  color: string;
  label: string;
  description: string;
  tags: string[];
};

export default function EnhancedZoomDrag() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Zoom & pan
  const [scale, setScale] = useState(1);
  const panX = useMotionValue(0);
  const panY = useMotionValue(0);
  
  // Boxes and links
  const [boxes, setBoxes] = useState<Box[]>([
    { 
      id: "1", 
      x: 100, 
      y: 100, 
      color: "bg-red-400", 
      label: "Box 1",
      description: "This is the first box with some sample description text.",
      tags: ["important", "sample"]
    },
    { 
      id: "2", 
      x: 400, 
      y: 200, 
      color: "bg-green-400", 
      label: "Box 2",
      description: "Second box for demonstration purposes.",
      tags: ["demo", "test"]
    },
    { 
      id: "3", 
      x: 300, 
      y: 400, 
      color: "bg-blue-400", 
      label: "Box 3",
      description: "Third box in our collection.",
      tags: ["collection", "example"]
    },
  ]);
  
  const [nextBoxId, setNextBoxId] = useState(4);
  const [editingBox, setEditingBox] = useState<Box | null>(null);
  const [editText, setEditText] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [tagFilters, setTagFilters] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [boxOrder, setBoxOrder] = useState<string[]>([]);
  
  // Tag color menu state
  const [tagColorMenu, setTagColorMenu] = useState<{
    show: boolean;
    tag: string;
    x: number;
    y: number;
  }>({ show: false, tag: "", x: 0, y: 0 });
  
  // Available colors for new boxes
  const colors = [
    "bg-red-400", "bg-green-400", "bg-blue-400", "bg-yellow-400", 
    "bg-purple-400", "bg-pink-400", "bg-indigo-400", "bg-teal-400",
    "bg-orange-400", "bg-cyan-400"
  ];
  
  const colorNames = {
    "bg-red-400": "Red",
    "bg-green-400": "Green", 
    "bg-blue-400": "Blue",
    "bg-yellow-400": "Yellow",
    "bg-purple-400": "Purple",
    "bg-pink-400": "Pink",
    "bg-indigo-400": "Indigo",
    "bg-teal-400": "Teal",
    "bg-orange-400": "Orange",
    "bg-cyan-400": "Cyan"
  };
  
  // Get all unique tags from all boxes
  const getAllTags = () => {
    const tagSet = new Set<string>();
    boxes.forEach(box => {
      box.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
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
  
  // Zoom handlers
  const zoom = (delta: number) => {
    setScale(prev => Math.max(0.5, Math.min(3, prev + delta)));
  };
  
  const reset = () => {
    setScale(1);
    panX.set(0);
    panY.set(0);
  };
  
  // Add new box
  const addBox = () => {
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newBox: Box = {
      id: String(nextBoxId),
      x: Math.random() * 400 + 200,
      y: Math.random() * 300 + 150,
      color: randomColor,
      label: `Box ${nextBoxId}`,
      description: "",
      tags: []
    };
    
    setBoxes(prev => [...prev, newBox]);
    setNextBoxId(prev => prev + 1);
  };
  
  // Edit box
  const startEditing = (box: Box) => {
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
  const navigateToBox = (box: Box) => {
    const centerX = -box.x * scale + window.innerWidth / 2 - 96;
    const centerY = -box.y * scale + window.innerHeight / 2 - 64;
    
    panX.set(centerX);
    panY.set(centerY);
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

  // Search function
  const matchesSearch = (box: Box, query: string) => {
    if (!query.trim()) return true;
    
    const searchTerm = query.toLowerCase().trim();
    return (
      box.label.toLowerCase().includes(searchTerm) ||
      box.description.toLowerCase().includes(searchTerm) ||
      box.tags.some(tag => tag.toLowerCase().includes(searchTerm))
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
    // Search filter
    if (!matchesSearch(box, searchQuery)) {
      return false;
    }
    
    // Tag filter (if any tags are selected, show only boxes with those tags)
    if (tagFilters.size > 0) {
      const hasSelectedTag = box.tags.some(tag => tagFilters.has(tag));
      if (!hasSelectedTag) {
        return false;
      }
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
      className="w-screen h-screen bg-gray-100 relative overflow-hidden pr-80"
      onWheel={(e) => {
        e.preventDefault();
        zoom(e.deltaY > 0 ? -0.1 : 0.1);
      }}
    >
      {/* Controls */}
      <div className="fixed top-4 left-4 z-50 flex gap-2">
        <button onClick={() => zoom(0.2)} className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">+</button>
        <button onClick={() => zoom(-0.2)} className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">-</button>
        <button onClick={reset} className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600">Reset</button>
        <button onClick={addBox} className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600">Add Box</button>
      </div>
      
      {/* Tag Color Menu */}
      {tagColorMenu.show && (
        <div
          className="fixed z-[9999] bg-white rounded-lg shadow-xl border border-gray-200 p-3"
          style={{
            left: tagColorMenu.x,
            top: tagColorMenu.y,
            transform: 'translate(-50%, -10px)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-sm font-medium text-gray-700 mb-2">
            Change color for tag: <span className="font-semibold text-blue-600">"{tagColorMenu.tag}"</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {colors.map(color => (
              <button
                key={color}
                onClick={() => changeTagColor(tagColorMenu.tag, color)}
                className={`w-8 h-8 rounded ${color} border-2 border-gray-300 hover:border-gray-500 transition-all hover:scale-110`}
                title={colorNames[color as keyof typeof colorNames]}
              />
            ))}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            This will change the color of all boxes with this tag
          </div>
        </div>
      )}
      
      {/* Edit Modal */}
      {editingBox && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[500px] max-h-[90vh] overflow-y-auto shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Edit Box</h3>
            
            {/* Text Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Box Title
              </label>
              <input
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter box title..."
                autoFocus
              />
            </div>
            
            {/* Description Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
                placeholder="Enter description..."
              />
            </div>
            
            {/* Tags Management */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              
              {/* Add new tag */}
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={handleTagKeyPress}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Add a tag..."
                />
                <button
                  onClick={addTag}
                  className="bg-blue-500 text-white px-3 py-2 rounded-md hover:bg-blue-600 text-sm"
                >
                  Add
                </button>
              </div>
              
              {/* Current tags */}
              <div className="flex flex-wrap gap-2">
                {editTags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {editTags.length === 0 && (
                  <span className="text-gray-500 text-sm italic">No tags added</span>
                )}
              </div>
            </div>
            
            {/* Color Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Box Color
              </label>
              <div className="grid grid-cols-5 gap-2">
                {colors.map(color => (
                  <button
                    key={color}
                    onClick={() => setEditColor(color)}
                    className={`w-12 h-12 rounded-lg ${color} border-2 transition-all ${
                      editColor === color 
                        ? 'border-gray-800 ring-2 ring-blue-500' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    title={colorNames[color as keyof typeof colorNames]}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Selected: {colorNames[editColor as keyof typeof colorNames]}
              </p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={saveEdit}
                className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
              >
                Save Changes
              </button>
              <button
                onClick={cancelEdit}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteBox(editingBox.id);
                  setEditingBox(null);
                }}
                className="bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Sidebar */}
      <div className="fixed right-4 top-4 bottom-4 w-72 bg-white rounded-lg shadow-lg z-50 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800">Box Navigator</h3>
          <p className="text-xs text-gray-600 mt-1">Double-click to go to box</p>
          
          {/* Search Bar */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search boxes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            )}
          </div>
        </div>
        
        {/* Filters Section */}
        <div className="p-4 border-b border-gray-200 max-h-64 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-700">Filters</h4>
            {tagFilters.size > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-blue-500 hover:text-blue-700"
              >
                Clear All
              </button>
            )}
          </div>
          
          {/* Tag Filters */}
          <div>
            <h5 className="text-sm font-medium text-gray-600 mb-2">Tags</h5>
            <p className="text-xs text-gray-500 mb-2">Right-click to change tag color</p>
            <div className="flex flex-wrap gap-1">
              {getAllTags().map(tag => {
                const boxCount = boxes.filter(box => box.tags.includes(tag)).length;
                const isSelected = tagFilters.has(tag);
                
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTagFilter(tag)}
                    onContextMenu={(e) => handleTagRightClick(e, tag)}
                    className={`inline-flex items-center text-xs px-2 py-1 rounded-full transition-all ${
                      isSelected
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tag}
                    <span className="ml-1 opacity-70">({boxCount})</span>
                  </button>
                );
              })}
              {getAllTags().length === 0 && (
                <span className="text-xs text-gray-500 italic">No tags yet</span>
              )}
            </div>
          </div>
          
          <p className="text-xs text-gray-500 mt-3">
            {tagFilters.size === 0 && !searchQuery.trim()
              ? `Showing all ${boxes.length} boxes`
              : `Showing ${visibleBoxes.length} of ${boxes.length} boxes`
            }
          </p>
        </div>
        
        {/* Box List */}
        <div className="flex-1 overflow-y-auto p-2">
          {visibleBoxes.map((box, index) => (
            <motion.div
              key={box.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.1}
              onDragEnd={(_, info) => {
                const draggedDistance = info.offset.y;
                const itemHeight = 120; // Approximate height of each item
                const newIndex = Math.round(draggedDistance / itemHeight) + index;
                const clampedIndex = Math.max(0, Math.min(visibleBoxes.length - 1, newIndex));
                
                if (clampedIndex !== index) {
                  const currentOrder = visibleBoxes.map(b => b.id);
                  const originalIndex = boxOrder.indexOf(box.id);
                  const targetBox = visibleBoxes[clampedIndex];
                  const targetIndex = boxOrder.indexOf(targetBox.id);
                  
                  if (originalIndex !== -1 && targetIndex !== -1) {
                    reorderBoxes(originalIndex, targetIndex);
                  }
                }
              }}
              whileDrag={{ scale: 1.02, zIndex: 1000 }}
              className="group"
            >
              <div
                onDoubleClick={() => navigateToBox(box)}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors mb-2 border border-gray-100 bg-white"
              >
                {/* Drag Handle */}
                <div className="flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="w-4 h-4 text-gray-400 cursor-grab active:cursor-grabbing" />
                </div>
                
                <div className="flex flex-col gap-2 flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded ${box.color} shadow-sm flex-shrink-0`}></div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 truncate">{box.label}</div>
                      <div className="text-xs text-gray-500">
                        x: {Math.round(box.x)}, y: {Math.round(box.y)}
                      </div>
                    </div>
                  </div>
                  
                  {box.description && (
                    <div className="text-xs text-gray-600 pl-9 line-clamp-2">
                      {box.description}
                    </div>
                  )}
                  
                  {box.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pl-9">
                      {box.tags.map(tag => (
                        <span
                          key={tag}
                          onContextMenu={(e) => handleTagRightClick(e, tag)}
                          className="inline-block bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded cursor-context-menu"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
          
          {boxes.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No boxes yet.<br />
              <span className="text-sm">Click "Add Box" to create one!</span>
            </div>
          )}
          
          {boxes.length > 0 && visibleBoxes.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              {searchQuery.trim() ? (
                <>
                  No boxes match "{searchQuery}"<br />
                  <span className="text-sm">Try different search terms.</span>
                </>
              ) : (
                <>
                  All boxes are filtered out.<br />
                  <span className="text-sm">Clear filters to see boxes.</span>
                </>
              )}
            </div>
          )}
        </div>
        
        <div className="p-3 border-t border-gray-200 text-xs text-gray-600">
          <div>• Drag boxes to move them</div>
          <div>• Double-click box to edit</div>
          <div>• Drag sidebar items to reorder</div>
          <div>• Right-click tags to change color</div>
          <div>• Mouse wheel to zoom</div>
          <div>• Drag background to pan</div>
        </div>
      </div>
      
      {/* Pan container */}
      <motion.div
        style={{ scale, x: panX, y: panY }}
        drag
        dragConstraints={{ left: -2000, right: 2000, top: -2000, bottom: 2000 }}
        className="w-full h-full"
      >
        {/* Boxes */}
        {visibleBoxes.map(box => (
          <motion.div
            key={box.id}
            drag
            dragMomentum={false}
            whileDrag={{ scale: 1.05 }}
            whileHover={{ scale: 1.02 }}
            onDrag={(_, info) => updateBox(box.id, info.delta.x, info.delta.y)}
            onDoubleClick={() => startEditing(box)}
            className={`absolute w-48 h-40 rounded-lg shadow-lg flex flex-col cursor-pointer select-none ${box.color} hover:shadow-xl transition-shadow`}
            style={{ left: box.x, top: box.y }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <div className="p-3 flex-1 flex flex-col">
              <div className="font-semibold text-white text-center mb-2">{box.label}</div>
              
              {box.description && (
                <div className="text-xs text-white/90 flex-1 overflow-hidden">
                  <div className="line-clamp-3">{box.description}</div>
                </div>
              )}
              
              {box.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {box.tags.slice(0, 3).map(tag => (
                    <span
                      key={tag}
                      onContextMenu={(e) => handleTagRightClick(e, tag)}
                      className="inline-block bg-white/20 text-white text-xs px-1.5 py-0.5 rounded cursor-context-menu"
                    >
                      {tag}
                    </span>
                  ))}
                  {box.tags.length > 3 && (
                    <span className="inline-block bg-white/20 text-white text-xs px-1.5 py-0.5 rounded">
                      +{box.tags.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
            
            <div className="text-xs text-white/70 text-center pb-2">
              Double-click to edit
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

