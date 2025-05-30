import React from "react";
import { motion } from "framer-motion";
import { Search, GripVertical } from "lucide-react";
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
  onStartEditing
}) => {
  return (
    <div className="fixed right-4 top-4 bottom-4 w-72 bg-white rounded-lg shadow-lg z-50 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-800">Box Navigator</h3>
        <p className="text-xs text-gray-600 mt-1">Double-click to go to box</p>
        
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search boxes..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          )}
        </div>
      </div>
      
      <div className="p-4 border-b border-gray-200 max-h-64 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-700">Filters</h4>
          {tagFilters.size > 0 && (
            <button
              onClick={onClearAllFilters}
              className="text-xs text-blue-500 hover:text-blue-700"
            >
              Clear All
            </button>
          )}
        </div>
        
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
                  onClick={() => onToggleTagFilter(tag)}
                  onContextMenu={(e) => onTagRightClick(e, tag)}
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
              const itemHeight = 120;
              const newIndex = Math.round(draggedDistance / itemHeight) + index;
              const clampedIndex = Math.max(0, Math.min(visibleBoxes.length - 1, newIndex));
              
              if (clampedIndex !== index) {
                const currentOrder = visibleBoxes.map(b => b.id);
                const originalIndex = boxOrder.indexOf(box.id);
                const targetBox = visibleBoxes[clampedIndex];
                const targetIndex = boxOrder.indexOf(targetBox.id);
                
                if (originalIndex !== -1 && targetIndex !== -1) {
                  onReorderBoxes(originalIndex, targetIndex);
                }
              }
            }}
            whileDrag={{ scale: 1.02, zIndex: 1000 }}
            className="group"
          >
            <div
              onDoubleClick={() => onNavigateToBox(box)}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors mb-2 border border-gray-100 bg-white"
            >
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
                        onContextMenu={(e) => onTagRightClick(e, tag)}
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

        {/* add instructions here */}
        <div>• Drag boxes to move them</div>
        <div>• Double-click box to edit</div>
        <div>• Drag sidebar items to reorder</div>
        <div>• Right-click tags to change color</div>
        <div>• Mouse wheel to zoom</div>
        <div>• Drag background to pan</div>
      </div>
    </div>
  );
};

export default Sidebar;