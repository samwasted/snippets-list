import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import type { Snippet } from "./types";

interface BoxProps {
  snippet: Snippet;
  scale: number;
  onUpdatePosition: (id: string, deltaX: number, deltaY: number) => void;
  onStartEditing: (snippet: Snippet) => void;
  onTagRightClick: (e: React.MouseEvent, tag: string) => void;
  onFilesChanged: (id: string, files: File[]) => void;
  canEdit: boolean;
}

const Box: React.FC<BoxProps> = ({ 
  snippet, 
  scale,
  onUpdatePosition, 
  onStartEditing,
  onTagRightClick,
  onFilesChanged,
  canEdit
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    if (!canEdit) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!canEdit) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      onFilesChanged(snippet.id, droppedFiles);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canEdit) return;
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      onFilesChanged(snippet.id, selectedFiles);
    }
    // Clear the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (fileIndex: number) => {
    if (!canEdit) return;
    // Note: This will need to be updated to work with file paths from database
    // For now, we'll assume files array contains File objects for local state
    const currentFiles = snippet.files as any[]; // Cast needed since DB stores paths as strings
    const newFiles = currentFiles.filter((_, index) => index !== fileIndex);
    onFilesChanged(snippet.id, newFiles);
  };

  const handleDownloadFile = async (file: any) => {
    try {
      // Handle both File objects (local) and file paths (from database)
      if (typeof file === 'string') {
        // If it's a file path from database, we'd need to fetch it from server
        // For now, just alert that this needs server implementation
        alert('File download from server not yet implemented');
        return;
      }

      // Handle File objects (local files)
      if (!(file instanceof File)) {
        console.error('Invalid file object:', file);
        return;
      }

      // Create blob URL
      const blob = new Blob([file], { type: file.type || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name || 'download';
      a.style.display = 'none';
      
      // Add to DOM, click, and remove
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Clean up the URL
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);
      
    } catch (error) {
      console.error('Error downloading file:', error);
      
      // Fallback: try to open file in new tab
      try {
        if (file instanceof File) {
          const url = URL.createObjectURL(file);
          window.open(url, '_blank');
          setTimeout(() => {
            URL.revokeObjectURL(url);
          }, 1000);
        }
      } catch (fallbackError) {
        console.error('Fallback download also failed:', fallbackError);
        alert('Unable to download file. Please try again.');
      }
    }
  };

  const formatFileSize = (file: any) => {
    // Handle both File objects and file paths
    const bytes = file instanceof File ? file.size : 0;
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileName = (file: any) => {
    // Handle both File objects and file paths
    return file instanceof File ? file.name : file;
  };

  // Prevent canvas pan when dragging snippet
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleDragStart = (event: MouseEvent | TouchEvent | PointerEvent) => {
    event.stopPropagation();
  };

  return (
    <motion.div
      drag={canEdit}
      dragMomentum={false}
      whileDrag={{ scale: 1.05 }}
      whileHover={{ scale: 1.02 }}
      onDrag={(_, info) => canEdit && onUpdatePosition(snippet.id, info.delta.x/scale, info.delta.y/scale)}
      onDragStart={handleDragStart}
      onMouseDown={handleMouseDown}
      onDoubleClick={() => canEdit && onStartEditing(snippet)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`absolute w-48 h-40 rounded-lg shadow-lg flex flex-col select-none transition-all ${
        snippet.color || 'bg-blue-400'
      } ${
        isDragOver ? 'ring-2 ring-white ring-opacity-50 scale-105' : ''
      } hover:shadow-xl transition-shadow ${
        canEdit ? 'cursor-pointer' : 'cursor-default'
      }`}
      style={{
      left: `${snippet.x ?? 0}px`,
      top:  `${snippet.y ?? 0}px`
      }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {canEdit && (
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInput}
          className="hidden"
        />
      )}

      <div className="p-3 flex-1 flex flex-col relative">
        <div className="font-semibold text-white text-center mb-2">{snippet.title}</div>
        
        {snippet.description && !showFiles && (
          <div className="text-xs text-white/90 flex-1 overflow-hidden">
            <div className="line-clamp-3">{snippet.description}</div>
          </div>
        )}

        {/* Files section */}
        {showFiles && snippet.files && snippet.files.length > 0 && (
          <div className="text-xs text-white/90 flex-1 overflow-y-auto">
            <div className="space-y-1">
              {snippet.files.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-white/10 rounded px-2 py-1">
                  <div className="flex-1 truncate">
                    <div className="truncate font-medium">{getFileName(file)}</div>
                    <div className="text-white/70">{formatFileSize(file)}</div>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadFile(file);
                      }}
                      className="text-white/70 hover:text-white text-xs px-1 py-0.5 rounded hover:bg-white/10"
                      title="Download"
                    >
                      ↓
                    </button>
                    {canEdit && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(index);
                        }}
                        className="text-white/70 hover:text-white text-xs px-1 py-0.5 rounded hover:bg-white/10"
                        title="Remove"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {Array.isArray(snippet.tags) && snippet.tags.length > 0 && !showFiles && (
          <div className="flex flex-wrap gap-1 mt-2">
            {snippet.tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                onContextMenu={(e) => canEdit && onTagRightClick(e, tag)}
                className={`inline-block bg-white/20 text-white text-xs px-1.5 py-0.5 rounded ${
                  canEdit ? 'cursor-context-menu' : 'cursor-default'
                }`}
              >
                {tag}
              </span>
            ))}
            {snippet.tags.length > 3 && (
              <span className="inline-block bg-white/20 text-white text-xs px-1.5 py-0.5 rounded">
                +{snippet.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* File controls */}
        <div className="absolute top-1 right-1 flex gap-1">
          {snippet.files && snippet.files.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowFiles(!showFiles);
              }}
              className="bg-white/20 text-white text-xs px-1.5 py-0.5 rounded hover:bg-white/30 transition-colors"
              title={showFiles ? "Hide files" : "Show files"}
            >
              📁 {snippet.files.length}
            </button>
          )}
          {canEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="bg-white/20 text-white text-xs px-1.5 py-0.5 rounded hover:bg-white/30 transition-colors"
              title="Add files"
            >
              +
            </button>
          )}
        </div>

        {/* Drop zone overlay */}
        {isDragOver && canEdit && (
          <div className="absolute inset-0 bg-white/20 border-2 border-dashed border-white/50 rounded-lg flex items-center justify-center">
            <div className="text-white text-sm font-medium">Drop files here</div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Box;