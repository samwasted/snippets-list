import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  GripVertical,
  ChevronRight,
  X,
} from "lucide-react";
import { type Snippet } from "./types";

interface SidebarProps {
  boxes: Snippet[];
  visibleBoxes: Snippet[];
  boxOrder: string[];
  searchQuery: string;
  tagFilters: Set<string>;
  getAllTags: () => string[];
  onSearchChange: (query: string) => void;
  onToggleTagFilter: (tag: string) => void;
  onClearAllFilters: () => void;
  onTagRightClick: (e: React.MouseEvent, tag: string) => void;
  onNavigateToBox: (box: Snippet) => void;
  onReorderBoxes: (startIndex: number, endIndex: number) => void;
  onStartEditing: (box: Snippet) => void;
  canEdit: boolean;
  onClose: () => void
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
  onStartEditing,
  canEdit,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <>
      <motion.div
        animate={{ width: isCollapsed ? 60 : 380 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="fixed right-4 top-4 bottom-4 bg-white rounded-xl shadow-2xl z-50 flex flex-col border border-gray-100 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)',
          backdropFilter: 'blur(10px)'
        }}
        onWheel={(e) => e.stopPropagation()}
        onMouseEnter={(e) => e.stopPropagation()}
      >
        {/* Header Section */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-xl">
          {!isCollapsed && (
            <div className="flex-1">
              <h3 className="font-bold text-gray-800 text-lg bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text ">
                Space Navigator
              </h3>
              <p className="text-xs text-gray-600 mt-1">Manage your workspace</p>
            </div>
          )}

          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-white/50 rounded-full transition-all duration-200 flex-shrink-0 backdrop-blur-sm"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <motion.div
              animate={{ rotate: isCollapsed ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </motion.div>
          </button>
        </div>

        {/* Collapsed State */}
        {isCollapsed && (
          <div className="flex-1 flex flex-col items-center justify-center p-3 space-y-6">
            <div className="text-center">
              <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {boxes.length}
              </div>
              <div className="text-xs text-gray-500">snippets</div>
            </div>

            {tagFilters.size > 0 && (
              <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse" title="Filters active"></div>
            )}

            {searchQuery && (
              <div className="w-4 h-4 bg-gradient-to-r from-green-500 to-teal-500 rounded-full animate-pulse" title="Search active"></div>
            )}

            <div className="flex flex-col space-y-2 w-full">
              {visibleBoxes.slice(0, 6).map((box) => (
                <motion.div
                  key={box.id}
                  onClick={() => onNavigateToBox(box)}
                  className={`w-full h-8 rounded-lg cursor-pointer ${box.color} opacity-75 hover:opacity-100 transition-all duration-200 hover:scale-105 shadow-md`}
                  title={box.title}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                />
              ))}
              {visibleBoxes.length > 6 && (
                <div className="text-xs text-gray-500 text-center font-medium">
                  +{visibleBoxes.length - 6} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Expanded Content */}
        {!isCollapsed && (
          <>
            {/* Search Section */}
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search snippets..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full pl-10 pr-8 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-gradient-to-r from-gray-50 to-gray-100"
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-200 rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Filters Section */}
            <div
              className="p-4 border-b border-gray-100 max-h-48 overflow-y-auto"
              onWheel={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-700 text-sm">Filters</h4>
                {tagFilters.size > 0 && (
                  <button
                    onClick={onClearAllFilters}
                    className="text-xs text-purple-600 hover:text-purple-800 font-semibold transition-colors px-2 py-1 rounded-full hover:bg-purple-50"
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
                        className={`inline-flex items-center text-xs px-3 py-2 rounded-full transition-all duration-200 font-medium shadow-sm hover:shadow-md ${isSelected
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg scale-105'
                            : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 hover:from-gray-200 hover:to-gray-300'
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

              <div className="text-xs text-gray-500 mt-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-gray-100">
                {tagFilters.size === 0 && !searchQuery.trim()
                  ? `Showing all ${boxes.length} snippets`
                  : `Showing ${visibleBoxes.length} of ${boxes.length} snippets`
                }
              </div>
            </div>

            {/* Snippet List */}
            <div
              className="flex-1 overflow-y-auto p-3"
              onWheel={(e) => e.stopPropagation()}
            >
              <div className="space-y-3">
                {(visibleBoxes ?? []).map((box, index) => (
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
                      className="flex items-start gap-3 p-4 rounded-xl hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 cursor-pointer transition-all duration-200 border border-gray-100 bg-white hover:shadow-lg hover:scale-[1.02]"
                    >
                      {/* Drag Handle */}
                      {canEdit && (
                        <motion.div
                          drag="y"
                          dragConstraints={{ top: 0, bottom: 0 }}
                          dragElastic={0.1}
                          onDragEnd={(_, info) => {
                            const draggedDistance = info.offset.y;
                            const itemHeight = 90;
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
                          className="flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-2 -m-2 rounded-lg hover:bg-gradient-to-r hover:from-purple-100 hover:to-pink-100"
                        >
                          <GripVertical className="w-4 h-4 text-gray-400" />
                        </motion.div>
                      )}

                      <div className="flex flex-col gap-2 flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-lg ${box.color} shadow-lg flex-shrink-0`}></div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-800 truncate text-sm">{box.title}</div>
                            <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                              <span>x: {Math.round(box.x)}, y: {Math.round(box.y)}</span>
                              <span>•</span>
                              <span>{box.totalViews || 0} views</span>
                            </div>
                          </div>
                        </div>

                        {box.description && (
                          <div className="text-xs text-gray-600 pl-9 line-clamp-2 leading-relaxed">
                            {box.description}
                          </div>
                        )}

                        {(box.tags?.length ?? 0) > 0 && (
                          <div className="flex flex-wrap gap-1 pl-9">
                            {box.tags.map(tag => (
                              <span
                                key={`${box.id}-${tag}`}
                                onContextMenu={(e) => onTagRightClick(e, tag)}
                                className="inline-block bg-gradient-to-r from-gray-100 to-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full cursor-context-menu hover:from-gray-200 hover:to-gray-300 transition-all duration-200 shadow-sm"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex items-center justify-between pl-9 pt-2">
                          {canEdit && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onStartEditing(box);
                              }}
                              className="text-xs text-purple-600 hover:text-purple-800 font-semibold transition-colors px-2 py-1 rounded-full hover:bg-purple-50"
                            >
                              Edit
                            </button>
                          )}
                          <div className="text-xs text-gray-400">
                           {box.updatedAt ? new Date(box.updatedAt).toLocaleDateString() : "Unknown date"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {(visibleBoxes ?? []).length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📦</div>
                    <div className="text-gray-500 font-medium mb-2">No snippets found</div>
                    <div className="text-xs text-gray-400">
                      {searchQuery || tagFilters.size > 0
                        ? "Try adjusting your filters or search terms"
                        : "Create your first snippet to get started"
                      }
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </motion.div>

      {/* Line clamp utility */}
      <style>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </>
  );
};

export default Sidebar;