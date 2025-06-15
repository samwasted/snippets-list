import React, { useState } from "react";
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

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
  totalViews?: number;
}

interface BoxProps {
  box: Snippet;
  scale: number;
  onStartEditing: (box: Snippet) => void;
  onTagRightClick: (e: React.MouseEvent, tag: string) => void;
  onCodeUpdate: (id: string, code: string, language: string, fileName: string) => void;
  isDarkMode: boolean;
}

const Box: React.FC<BoxProps> = ({ 
  box, 
  scale,
  onStartEditing,
  onTagRightClick,
  onCodeUpdate,
  isDarkMode
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // dnd-kit draggable hook with proper coordinate handling
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging
  } = useDraggable({
    id: box.id,
    data: {
      type: 'box',
      box: box
    }
  });

  // Convert dnd-kit transform to CSS transform with scale compensation
  // FIXED: Removed opacity hiding - keep the original element visible during drag
  const style = {
    transform: CSS.Transform.toString({
      x: transform ? transform.x / scale : 0,
      y: transform ? transform.y / scale : 0,
      scaleX: 1,
      scaleY: 1
    }),
    // Apply initial position
    left: box.x,
    top: box.y,
    transformOrigin: 'center center',
    willChange: isDragging || isHovered ? 'transform' : 'auto',
    zIndex: isDragging ? 1000 : isHovered ? 10 : 1,
    touchAction: 'none'
    // REMOVED: opacity: isDragging ? 0 : 1
  };

  // Code file detection
  const isCodeFile = (file: File) => {
    const codeExtensions = [
      '.js', '.jsx', '.ts', '.tsx',
      '.py', '.pyw', '.java', '.class',
      '.c', '.h', '.cpp', '.cc', '.cxx', '.hpp', '.hxx',
      '.cs', '.php', '.rb', '.go', '.rs', '.swift',
      '.kt', '.kts', '.scala', '.r', '.R', '.m',
      '.pl', '.pm', '.sh', '.bash', '.sql',
      '.html', '.htm', '.xml', '.css', '.scss', '.sass', '.less',
      '.json', '.yaml', '.yml', '.toml', '.md', '.markdown',
      '.vim', '.lua', '.asm'
    ];
    
    const fileName = file.name.toLowerCase();
    return codeExtensions.some(ext => fileName.endsWith(ext));
  };

  // Language detection
  const detectLanguageFromExtension = (fileName: string) => {
    const extensionMap: Record<string, string> = {
      '.js': 'javascript', '.jsx': 'javascript', '.ts': 'typescript', '.tsx': 'typescript',
      '.py': 'python', '.pyw': 'python', '.java': 'java', '.c': 'c', '.h': 'c',
      '.cpp': 'cpp', '.cc': 'cpp', '.cxx': 'cpp', '.hpp': 'cpp', '.hxx': 'cpp',
      '.cs': 'csharp', '.php': 'php', '.rb': 'ruby', '.go': 'go', '.rs': 'rust',
      '.swift': 'swift', '.kt': 'kotlin', '.kts': 'kotlin', '.scala': 'scala',
      '.r': 'r', '.R': 'r', '.m': 'matlab', '.pl': 'perl', '.pm': 'perl',
      '.sh': 'bash', '.bash': 'bash', '.sql': 'sql', '.html': 'html',
      '.htm': 'html', '.xml': 'xml', '.css': 'css', '.scss': 'scss',
      '.sass': 'sass', '.less': 'less', '.json': 'json', '.yaml': 'yaml',
      '.yml': 'yaml', '.toml': 'toml', '.md': 'markdown', '.markdown': 'markdown',
      '.vim': 'vim', '.lua': 'lua', '.asm': 'assembly'
    };
    
    const extension = fileName.toLowerCase().match(/\.[^.]*$/)?.[0];
    return extension && extensionMap[extension] ? extensionMap[extension] : 'text';
  };

  // File reading
  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target?.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  };

  // Drag and drop handlers for file dropping
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.types.includes('Files')) {
      const files = Array.from(e.dataTransfer.files || []);
      const hasCodeFiles = files.some(isCodeFile);
      setIsDragOver(hasCodeFiles);
      e.dataTransfer.dropEffect = hasCodeFiles ? 'copy' : 'none';
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (!e.dataTransfer.types.includes('Files')) return;

    const droppedFiles = Array.from(e.dataTransfer.files);
    const codeFiles = droppedFiles.filter(isCodeFile);
    
    if (codeFiles.length === 0) {
      alert('Please drop only code files (.js, .py, .java, .cpp, etc.)');
      return;
    }

    const file = codeFiles[0];
    
    try {
      const content = await readFileContent(file);
      const language = detectLanguageFromExtension(file.name);
      onCodeUpdate(box.id, content, language, file.name);
    } catch (error) {
      console.error('Error reading file:', error);
      alert('Error reading file content');
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`absolute w-48 h-40 rounded-lg shadow-lg z-50 flex flex-col cursor-pointer select-none transition-all duration-300 ease-out ${
        box.color
      } ${
        isDragOver ? 'ring-2 ring-white ring-opacity-50' : ''
      } ${
        isDragging ? 'z-50 shadow-2xl scale-100 rotate-3' : isHovered ? 'shadow-2xl scale-105 -rotate-1' : 'hover:shadow-xl hover:scale-105 hover:-rotate-1'
      }`}
      
      style={style}
      
      {...listeners}
      {...attributes}
      
      onDoubleClick={() => onStartEditing(box)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      
      // File drop handlers
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="p-3 flex-1 flex flex-col relative">
        <div className={`font-semibold text-center mb-2 truncate transition-all duration-300 ${
          isDarkMode ? 'text-white' : 'text-white'
        } ${
          isHovered ? 'text-shadow-lg scale-105' : ''
        }`}>
          {box.title}
        </div>
        
        {box.description && (
          <div className={`text-xs flex-1 overflow-hidden transition-all duration-300 ${
            isDarkMode ? 'text-white/90' : 'text-white/90'
          } ${
            isHovered ? 'text-white scale-105' : ''
          }`}>
            <div className="line-clamp-3">{box.description}</div>
          </div>
        )}
        
        {/* Tags section */}
        {box.tags.length > 0 && (
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
              Drop code file to replace
            </div>
          </div>
        )}

        {/* Drag indicator - enhanced during actual drag */}
        {isDragging && (
          <div className="absolute -top-2 -left-2 w-3 h-3 bg-white rounded-full shadow-lg animate-pulse ring-2 ring-blue-400" />
        )}

        {/* Hover effect */}
        {isHovered && !isDragging && (
          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-400/20 to-purple-400/20 animate-pulse pointer-events-none" />
        )}
      </div>
    </div>
  );
};

export default Box;
