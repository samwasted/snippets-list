import React, { useState } from "react";
import { motion } from "framer-motion";
import { Search, GripVertical, ChevronRight } from "lucide-react";
import type { Box as BoxType } from "./types";

interface SidebarProps {
  boxes: BoxType[];
  visibleBoxes: BoxType[];
  boxOrder: string[];
  searchQuery: string;
  tagFilters: Set<string>;
  getAllTags: () => string[];
  onSearchChange: (query: string) => void;
  onToggleTagFilter: (tag: string) => void;
  onClearAllFilters: () => void;
  onTagRightClick: (e: React.MouseEvent, tag: string) => void;
  onNavigateToBox: (box: BoxType) => void;
  onReorderBoxes: (startIndex: number, endIndex: number) => void;
  onStartEditing: (box: BoxType) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  boxes,
  visibleBoxes,
  boxOrder,
  searchQuery,
  tagFilters,
  getAllTags,
  onSearchChange,
  onToggleTagFilter,
  onClearAllFilters,
  onTagRightClick,
  onNavigateToBox,
  onReorderBoxes,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <motion.div
      animate={{ width: isCollapsed ? 60 : 320 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed right-4 top-4 bottom-4 bg-white rounded-lg shadow-lg z-50 flex flex-col border border-gray-200"
      onWheel={(e) => e.stopPropagation()}
      onMouseEnter={(e) => e.stopPropagation()}
    >
      {/* Header with toggle */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        {!isCollapsed && (
          <div className="flex-1">
            <h3 className="font-semibold text-gray-800 text-sm">Box Navigator</h3>
            <p className="text-xs text-gray-600 mt-1">Double-click to go to box</p>
          </div>
        )}
        
        <button
          onClick={toggleSidebar}
          className="p-2 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <motion.div
            animate={{ rotate: isCollapsed ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </motion.div>
        </button>
      </div>

      {/* Collapsed state */}
      {isCollapsed && (
        <div className="flex-1 flex flex-col items-center justify-center p-3 space-y-4">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-700">{boxes.length}</div>
            <div className="text-xs text-gray-500">boxes</div>
          </div>
          
          {tagFilters.size > 0 && (
            <div className="w-3 h-3 bg-blue-500 rounded-full" title="Filters active"></div>
          )}
          
          {searchQuery && (
            <div className="w-3 h-3 bg-green-500 rounded-full" title="Search active"></div>
          )}
          
          <div className="flex flex-col space-y-2 w-full">
            {visibleBoxes.slice(0, 8).map((box) => (
              <div
                key={box.id}
                onClick={() => onNavigateToBox(box)}
                className={`w-full h-6 rounded cursor-pointer ${box.color} opacity-75 hover:opacity-100 transition-opacity`}
                title={box.label}
              />
            ))}
            {visibleBoxes.length > 8 && (
              <div className="text-xs text-gray-500 text-center">
                +{visibleBoxes.length - 8} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Expanded content */}
      {!isCollapsed && (
        <>
          {/* Search section */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search boxes..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ×
                </button>
              )}
            </div>
          </div>
          
          {/* Filters section */}
          <div 
            className="p-4 border-b border-gray-200 max-h-48 overflow-y-auto"
            onWheel={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-700 text-sm">Filters</h4>
              {tagFilters.size > 0 && (
                <button
                  onClick={onClearAllFilters}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>
            
            <div>
              <h5 className="text-sm font-medium text-gray-600 mb-2">Tags</h5>
              <p className="text-xs text-gray-500 mb-3">Right-click to change tag color</p>
              <div className="flex flex-wrap gap-2">
                {getAllTags().map(tag => {
                  const boxCount = boxes.filter(box => box.tags.includes(tag)).length;
                  const isSelected = tagFilters.has(tag);
                  
                  return (
                    <button
                      key={tag}
                      onClick={() => onToggleTagFilter(tag)}
                      onContextMenu={(e) => onTagRightClick(e, tag)}
                      className={`inline-flex items-center text-xs px-3 py-1.5 rounded-full transition-all font-medium ${
                        isSelected
                          ? 'bg-blue-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {tag}
                      <span className="ml-1.5 opacity-70">({boxCount})</span>
                    </button>
                  );
                })}
                {getAllTags().length === 0 && (
                  <span className="text-xs text-gray-500 italic">No tags yet</span>
                )}
              </div>
            </div>
            
            <p className="text-xs text-gray-500 mt-4 p-2 bg-gray-50 rounded">
              {tagFilters.size === 0 && !searchQuery.trim()
                ? `Showing all ${boxes.length} boxes`
                : `Showing ${visibleBoxes.length} of ${boxes.length} boxes`
              }
            </p>
          </div>
          
          {/* Box list */}
          <div 
            className="flex-1 overflow-y-auto p-3"
            onWheel={(e) => e.stopPropagation()}
          >
            <div className="space-y-2">
              {visibleBoxes.map((box, index) => (
                <motion.div
                  key={box.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="group"
                >
                  <div
                    onDoubleClick={() => onNavigateToBox(box)}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-all border border-gray-100 bg-white hover:shadow-sm"
                  >
                    {/* Drag handle - only this area is draggable */}
                    <motion.div
                      drag="y"
                      dragConstraints={{ top: 0, bottom: 0 }}
                      dragElastic={0.1}
                      onDragEnd={(_, info) => {
                        const draggedDistance = info.offset.y;
                        const itemHeight = 80;
                        const newIndex = Math.round(draggedDistance / itemHeight) + index;
                        const clampedIndex = Math.max(0, Math.min(visibleBoxes.length - 1, newIndex));
                        
                        if (clampedIndex !== index) {
                          const originalIndex = boxOrder.indexOf(box.id);
                          const targetBox = visibleBoxes[clampedIndex];
                          const targetIndex = boxOrder.indexOf(targetBox.id);
                          
                          if (originalIndex !== -1 && targetIndex !== -1) {
                            onReorderBoxes(originalIndex, targetIndex);
                          }
                        }
                      }}
                      whileDrag={{ scale: 1.1, zIndex: 1000 }}
                      className="flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1 -m-1 rounded hover:bg-gray-200"
                    >
                      <GripVertical className="w-4 h-4 text-gray-400" />
                    </motion.div>
                    
                    <div className="flex flex-col gap-2 flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-md ${box.color} shadow-sm flex-shrink-0`}></div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-800 truncate text-sm">{box.label}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            x: {Math.round(box.x)}, y: {Math.round(box.y)}
                          </div>
                        </div>
                      </div>
                      
                      {box.description && (
                        <div className="text-xs text-gray-600 pl-8 line-clamp-2 leading-relaxed">
                          {box.description}
                        </div>
                      )}
                      
                      {box.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pl-8">
                          {box.tags.map(tag => (
                            <span
                              key={tag}
                              onContextMenu={(e) => onTagRightClick(e, tag)}
                              className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full cursor-context-menu hover:bg-gray-200 transition-colors"
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
            </div>
            
            {boxes.length === 0 && (
              <div className="text-center text-gray-500 py-12">
                <div className="text-lg mb-2">📦</div>
                <div className="font-medium mb-1">No boxes yet</div>
                <span className="text-sm">Click "Add Box" to create one!</span>
              </div>
            )}
            
            {boxes.length > 0 && visibleBoxes.length === 0 && (
              <div className="text-center text-gray-500 py-12">
                <div className="text-lg mb-2">🔍</div>
                {searchQuery.trim() ? (
                  <>
                    <div className="font-medium mb-1">No matches found</div>
                    <span className="text-sm">Try different search terms</span>
                  </>
                ) : (
                  <>
                    <div className="font-medium mb-1">All boxes filtered out</div>
                    <span className="text-sm">Clear filters to see boxes</span>
                  </>
                )}
              </div>
            )}
          </div>
          
          {/* Instructions footer */}
          <div className="p-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
              <div>• Drag to move boxes</div>
              <div>• Double-click to edit</div>
              <div>• Drag grip to reorder</div>
              <div>• Right-click tags</div>
              <div>• Mouse wheel to zoom</div>
              <div>• Drag background to pan</div>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
};

export default Sidebar;