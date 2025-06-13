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
  isDarkMode: boolean;
}

const Box: React.FC<BoxProps> = ({ 
  box, 
  scale,
  onUpdatePosition, 
  onStartEditing,
  onTagRightClick,
  onFilesChanged,
  isDarkMode
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Manual drag state
  const dragState = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    initialBoxX: 0,
    initialBoxY: 0
  });

  // Manual drag implementation using mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Prevent canvas pan and text selection
    e.preventDefault();
    e.stopPropagation();

    // Only start drag on left mouse button
    if (e.button !== 0) return;

    // Store initial drag state
    dragState.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      initialBoxX: box.x,
      initialBoxY: box.y
    };

    setIsDragging(true);

    // Add global mouse event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Prevent text selection during drag
    document.body.style.userSelect = 'none';
  }, [box.x, box.y]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState.current.isDragging) return;

    // Calculate mouse movement delta
    const deltaX = e.clientX - dragState.current.startX;
    const deltaY = e.clientY - dragState.current.startY;

    // Apply scale factor to convert screen movement to canvas movement
    const scaledDeltaX = deltaX / scale;
    const scaledDeltaY = deltaY / scale;

    // Call update with the scaled delta values
    onUpdatePosition(box.id, scaledDeltaX, scaledDeltaY);
  }, [box.id, scale, onUpdatePosition]);

  const handleMouseUp = useCallback(() => {
    if (!dragState.current.isDragging) return;

    // Reset drag state
    dragState.current.isDragging = false;
    setIsDragging(false);

    // Remove global event listeners
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

  // File drag and drop handlers
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
      className={`absolute w-48 h-40 rounded-lg shadow-lg flex flex-col cursor-pointer select-none transition-all duration-300 ease-out ${
        box.color
      } ${
        isDragOver ? 'ring-2 ring-white ring-opacity-50' : ''
      } ${
        isDragging ? 'z-50 shadow-2xl' : isHovered ? 'shadow-2xl' : 'hover:shadow-xl'
      } ${
        isDragging ? 'scale-110 rotate-3' : isHovered ? 'scale-105 -rotate-1' : 'hover:scale-105 hover:-rotate-1'
      }`}
      
      style={{ 
        left: box.x, 
        top: box.y,
        // Critical: Set transform origin to center for better scaling
        transformOrigin: 'center center',
        // Improve rendering performance
        willChange: isDragging || isHovered ? 'transform' : 'auto',
        // Ensure proper z-index during drag
        zIndex: isDragging ? 1000 : isHovered ? 10 : 1
      }}
      
      // Manual drag event handlers
      onMouseDown={handleMouseDown}
      onDoubleClick={() => onStartEditing(box)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      
      // File drop handlers
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
        <div className={`font-semibold text-center mb-2 truncate transition-all duration-300 ${
          isDarkMode ? 'text-white' : 'text-white'
        } ${
          isHovered ? 'text-shadow-lg scale-105' : ''
        }`}>
          {box.title}
        </div>
        
        {box.description && !showFiles && (
          <div className={`text-xs flex-1 overflow-hidden transition-all duration-300 ${
            isDarkMode ? 'text-white/90' : 'text-white/90'
          } ${
            isHovered ? 'text-white scale-105' : ''
          }`}>
            <div className="line-clamp-3">{box.description}</div>
          </div>
        )}

        {/* Files section */}
        {showFiles && box.files && box.files.length > 0 && (
          <div className={`text-xs flex-1 overflow-y-auto transition-all duration-300 ${
            isDarkMode ? 'text-white/90' : 'text-white/90'
          }`}>
            <div className="space-y-1 max-h-20">
              {box.files.map((file, index) => (
                <div key={`${file.name}-${index}`} className={`flex items-center justify-between rounded px-2 py-1 transition-all duration-200 hover:scale-105 ${
                  isDarkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-white/10 hover:bg-white/20'
                }`}>
                  <div className="flex-1 truncate">
                    <div className="truncate font-medium" title={file.name}>
                      {file.name}
                    </div>
                    <div className={`transition-colors duration-300 ${
                      isDarkMode ? 'text-white/70' : 'text-white/70'
                    }`}>
                      {formatFileSize(file.size)}
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadFile(file);
                      }}
                      className={`text-xs px-1 py-0.5 rounded transition-all duration-200 hover:scale-110 ${
                        isDarkMode 
                          ? 'text-white/70 hover:text-white hover:bg-white/10' 
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                      title="Download"
                    >
                      ↓
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile(index);
                      }}
                      className={`text-xs px-1 py-0.5 rounded transition-all duration-200 hover:scale-110 hover:text-red-300 ${
                        isDarkMode 
                          ? 'text-white/70 hover:text-white hover:bg-white/10' 
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
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
                className={`inline-block text-white text-xs px-1.5 py-0.5 rounded cursor-context-menu truncate max-w-16 transition-all duration-200 hover:scale-110 ${
                  isDarkMode 
                    ? 'bg-white/20 hover:bg-white/30' 
                    : 'bg-white/20 hover:bg-white/30'
                } ${
                  isHovered ? 'bg-white/30 scale-105' : ''
                }`}
                title={tag}
              >
                {tag}
              </span>
            ))}
            {box.tags.length > 3 && (
              <span 
                className={`inline-block text-white text-xs px-1.5 py-0.5 rounded transition-all duration-200 ${
                  isDarkMode 
                    ? 'bg-white/20' 
                    : 'bg-white/20'
                } ${
                  isHovered ? 'bg-white/30 scale-105' : ''
                }`}
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
              className={`text-white text-xs px-1.5 py-0.5 rounded transition-all duration-200 hover:scale-110 ${
                isDarkMode 
                  ? 'bg-white/20 hover:bg-white/30' 
                  : 'bg-white/20 hover:bg-white/30'
              } ${
                isHovered ? 'bg-white/30 scale-105' : ''
              }`}
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
            className={`text-white text-xs px-1.5 py-0.5 rounded transition-all duration-200 hover:scale-110 ${
              isDarkMode 
                ? 'bg-white/20 hover:bg-white/30' 
                : 'bg-white/20 hover:bg-white/30'
            } ${
              isHovered ? 'bg-white/30 scale-105' : ''
            }`}
            title="Add files"
          >
            +
          </button>
        </div>

        {/* Drop zone overlay */}
        {isDragOver && (
          <div className={`absolute inset-0 border-2 border-dashed rounded-lg flex items-center justify-center backdrop-blur-sm transition-all duration-300 ${
            isDarkMode 
              ? 'bg-white/20 border-white/50' 
              : 'bg-white/20 border-white/50'
          }`}>
            <div className={`text-sm font-medium px-3 py-1 rounded transition-all duration-200 ${
              isDarkMode 
                ? 'text-white bg-black/20' 
                : 'text-white bg-black/20'
            }`}>
              Drop files here
            </div>
          </div>
        )}

        {/* Enhanced drag indicator */}
        {isDragging && (
          <div className="absolute -top-2 -left-2 w-3 h-3 bg-white rounded-full shadow-lg animate-pulse ring-2 ring-blue-400" />
        )}

        {/* Hover glow effect */}
        {isHovered && !isDragging && (
          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-400/20 to-purple-400/20 animate-pulse pointer-events-none" />
        )}
      </div>

      {/* Enhanced hover effects with CSS custom properties */}
      <style>{`
        .text-shadow-lg {
          text-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        }
        
        @keyframes gentle-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-2px); }
        }
        
        .hover\\:animate-float:hover {
          animation: gentle-float 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Box;
