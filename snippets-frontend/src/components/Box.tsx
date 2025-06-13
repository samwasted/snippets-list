import React, { useState, useRef, useCallback } from "react";

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
  files?: File[];
  totalViews?: number;
}

interface BoxProps {
  box: Snippet;
  scale: number;
  onUpdatePosition: (id: string, deltaX: number, deltaY: number) => void;
  onStartEditing: (box: Snippet) => void;
  onTagRightClick: (e: React.MouseEvent, tag: string) => void;
  onFilesChanged: (id: string, files: File[]) => void;
}

const Box: React.FC<BoxProps> = ({ 
  box, 
  scale,
  onUpdatePosition, 
  onStartEditing,
  onTagRightClick,
  onFilesChanged
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Manual drag state
  const dragState = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    initialBoxX: 0,
    initialBoxY: 0
  });

  // Manual drag implementation using mouse events [7][11][14]
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Prevent canvas pan and text selection
    e.preventDefault();
    e.stopPropagation();

    // Only start drag on left mouse button
    if (e.button !== 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    
    // Store initial drag state [14]
    dragState.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      initialBoxX: box.x,
      initialBoxY: box.y
    };

    setIsDragging(true);

    // Add global mouse event listeners [11][16]
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Prevent text selection during drag
    document.body.style.userSelect = 'none';
  }, [box.x, box.y]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState.current.isDragging) return;

    // Calculate mouse movement delta [7][11]
    const deltaX = e.clientX - dragState.current.startX;
    const deltaY = e.clientY - dragState.current.startY;

    // Apply scale factor to convert screen movement to canvas movement [10]
    const scaledDeltaX = deltaX / scale;
    const scaledDeltaY = deltaY / scale;

    // Call update with the scaled delta values
    onUpdatePosition(box.id, scaledDeltaX, scaledDeltaY);
  }, [box.id, scale, onUpdatePosition]);

  const handleMouseUp = useCallback(() => {
    if (!dragState.current.isDragging) return;

    // Reset drag state [14]
    dragState.current.isDragging = false;
    setIsDragging(false);

    // Remove global event listeners [11][16]
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    
    // Restore text selection
    document.body.style.userSelect = '';
  }, [handleMouseMove]);

  // Clean up event listeners on unmount
  React.useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };
  }, [handleMouseMove, handleMouseUp]);

  // File drag and drop handlers [13]
  const handleDragOver = (e: React.DragEvent) => {
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
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      const existingFiles = box.files || [];
      const newFiles = [...existingFiles, ...droppedFiles];
      onFilesChanged(box.id, newFiles);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      const existingFiles = box.files || [];
      const newFiles = [...existingFiles, ...selectedFiles];
      onFilesChanged(box.id, newFiles);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (fileIndex: number) => {
    const existingFiles = box.files || [];
    const newFiles = existingFiles.filter((_, index) => index !== fileIndex);
    onFilesChanged(box.id, newFiles);
  };

  const handleDownloadFile = async (file: File) => {
    try {
      if (!(file instanceof File)) {
        console.error('Invalid file object:', file);
        return;
      }

      const blob = new Blob([file], { type: file.type || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name || 'download';
      a.style.display = 'none';
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);
      
    } catch (error) {
      console.error('Error downloading file:', error);
      
      try {
        const url = URL.createObjectURL(file);
        window.open(url, '_blank');
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 1000);
      } catch (fallbackError) {
        console.error('Fallback download also failed:', fallbackError);
        alert('Unable to download file. Please try again.');
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div
      className={`absolute w-48 h-40 rounded-lg shadow-lg flex flex-col cursor-pointer select-none transition-all ${
        box.color
      } ${
        isDragOver ? 'ring-2 ring-white ring-opacity-50 scale-105' : ''
      } ${
        isDragging ? 'scale-105 shadow-2xl z-50' : 'hover:shadow-xl'
      } transition-shadow`}
      
      style={{ 
        left: box.x, 
        top: box.y,
        // Critical: Set transform origin to top-left for consistent scaling [7]
        transformOrigin: '0 0',
        // Improve rendering performance [10]
        willChange: isDragging ? 'transform' : 'auto',
        // Ensure proper z-index during drag
        zIndex: isDragging ? 1000 : 1
      }}
      
      // Manual drag event handlers
      onMouseDown={handleMouseDown}
      onDoubleClick={() => onStartEditing(box)}
      
      // File drop handlers [13]
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileInput}
        className="hidden"
      />

      <div className="p-3 flex-1 flex flex-col relative">
        <div className="font-semibold text-white text-center mb-2 truncate">
          {box.title}
        </div>
        
        {box.description && !showFiles && (
          <div className="text-xs text-white/90 flex-1 overflow-hidden">
            <div className="line-clamp-3">{box.description}</div>
          </div>
        )}

        {/* Files section */}
        {showFiles && box.files && box.files.length > 0 && (
          <div className="text-xs text-white/90 flex-1 overflow-y-auto">
            <div className="space-y-1 max-h-20">
              {box.files.map((file, index) => (
                <div key={`${file.name}-${index}`} className="flex items-center justify-between bg-white/10 rounded px-2 py-1">
                  <div className="flex-1 truncate">
                    <div className="truncate font-medium" title={file.name}>
                      {file.name}
                    </div>
                    <div className="text-white/70">
                      {formatFileSize(file.size)}
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadFile(file);
                      }}
                      className="text-white/70 hover:text-white text-xs px-1 py-0.5 rounded hover:bg-white/10 transition-colors"
                      title="Download"
                    >
                      ↓
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile(index);
                      }}
                      className="text-white/70 hover:text-white text-xs px-1 py-0.5 rounded hover:bg-white/10 transition-colors"
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Tags section */}
        {box.tags.length > 0 && !showFiles && (
          <div className="flex flex-wrap gap-1 mt-2">
            {box.tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                onContextMenu={(e) => onTagRightClick(e, tag)}
                className="inline-block bg-white/20 text-white text-xs px-1.5 py-0.5 rounded cursor-context-menu hover:bg-white/30 transition-colors truncate max-w-16"
                title={tag}
              >
                {tag}
              </span>
            ))}
            {box.tags.length > 3 && (
              <span 
                className="inline-block bg-white/20 text-white text-xs px-1.5 py-0.5 rounded"
                title={`Additional tags: ${box.tags.slice(3).join(', ')}`}
              >
                +{box.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* File controls */}
        <div className="absolute top-1 right-1 flex gap-1">
          {box.files && box.files.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowFiles(!showFiles);
              }}
              className="bg-white/20 text-white text-xs px-1.5 py-0.5 rounded hover:bg-white/30 transition-colors"
              title={showFiles ? "Hide files" : "Show files"}
            >
              📁 {box.files.length}
            </button>
          )}
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
        </div>

        {/* Drop zone overlay */}
        {isDragOver && (
          <div className="absolute inset-0 bg-white/20 border-2 border-dashed border-white/50 rounded-lg flex items-center justify-center backdrop-blur-sm">
            <div className="text-white text-sm font-medium bg-black/20 px-3 py-1 rounded">
              Drop files here
            </div>
          </div>
        )}

        {/* Drag indicator */}
        {isDragging && (
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-white rounded-full shadow-lg animate-pulse" />
        )}
      </div>
    </div>
  );
};

export default Box;
