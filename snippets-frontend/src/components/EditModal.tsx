import React, { useRef, useState, useEffect, useCallback } from "react";
import CodeMirror from '@uiw/react-codemirror';
import { loadLanguage } from '@uiw/codemirror-extensions-langs';
import { oneDark } from '@codemirror/theme-one-dark';
import type { Extension } from '@codemirror/state';
import { colors, colorNames } from "./types";

// Define types
interface Box {
  id: string;
  text: string;
  description: string;
  color: string;
  tags: string[];
  code: string;
  codeLanguage: string;
}

// Major programming languages for the dropdown
const PROGRAMMING_LANGUAGES = [
  { value: 'javascript', label: 'JavaScript', extensions: ['.js', '.mjs'] },
  { value: 'typescript', label: 'TypeScript', extensions: ['.ts', '.tsx'] },
  { value: 'python', label: 'Python', extensions: ['.py', '.pyw'] },
  { value: 'java', label: 'Java', extensions: ['.java'] },
  { value: 'cpp', label: 'C++', extensions: ['.cpp', '.cxx', '.cc'] },
  { value: 'c', label: 'C', extensions: ['.c', '.h'] },
  { value: 'csharp', label: 'C#', extensions: ['.cs'] },
  { value: 'php', label: 'PHP', extensions: ['.php'] },
  { value: 'ruby', label: 'Ruby', extensions: ['.rb'] },
  { value: 'go', label: 'Go', extensions: ['.go'] },
  { value: 'rust', label: 'Rust', extensions: ['.rs'] },
  { value: 'swift', label: 'Swift', extensions: ['.swift'] },
  { value: 'kotlin', label: 'Kotlin', extensions: ['.kt', '.kts'] },
  { value: 'html', label: 'HTML', extensions: ['.html', '.htm'] },
  { value: 'css', label: 'CSS', extensions: ['.css', '.scss', '.sass'] },
  { value: 'sql', label: 'SQL', extensions: ['.sql'] },
  { value: 'json', label: 'JSON', extensions: ['.json'] },
  { value: 'xml', label: 'XML', extensions: ['.xml'] },
  { value: 'yaml', label: 'YAML', extensions: ['.yml', '.yaml'] },
  { value: 'markdown', label: 'Markdown', extensions: ['.md', '.markdown'] },
  { value: 'shell', label: 'Shell/Bash', extensions: ['.sh', '.bash'] },
  { value: 'text', label: 'Plain Text', extensions: ['.txt'] }
];

// Function to detect language from file extension
const detectLanguageFromExtension = (filename: string): string => {
  const extension = '.' + filename.split('.').pop()?.toLowerCase();
  const language = PROGRAMMING_LANGUAGES.find(lang =>
    lang.extensions.includes(extension)
  );
  return language?.value || 'text';
};

// Function to get file extension for a language
const getFileExtension = (language: string): string => {
  const lang = PROGRAMMING_LANGUAGES.find(l => l.value === language);
  return lang ? lang.extensions[0] : '.txt';
};

interface EditModalProps {
  editingBox: Box;
  editText: string;
  editDescription: string;
  editColor: string;
  editTags: string[];
  editCode: string;
  editCodeLanguage: string;
  newTag: string;
  onTextChange: (text: string) => void;
  onDescriptionChange: (description: string) => void;
  onColorChange: (color: string) => void;
  onTagsChange: (tags: string[]) => void;
  onCodeChange: (code: string) => void;
  onCodeLanguageChange: (language: string) => void;
  onNewTagChange: (tag: string) => void;
  onAddTag: () => void;
  onRemoveTag: (tagToRemove: string) => void;
  onTagKeyPress: (e: React.KeyboardEvent) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: (id: string) => void;
  isDarkMode: boolean;
}

const EditModal: React.FC<EditModalProps> = React.memo(({
  editingBox,
  editText,
  editDescription,
  editColor,
  editTags,
  editCode,
  editCodeLanguage,
  newTag,
  onTextChange,
  onDescriptionChange,
  onColorChange,
  onCodeChange,
  onCodeLanguageChange,
  onNewTagChange,
  onAddTag,
  onRemoveTag,
  onSave,
  onCancel,
  onDelete,
  isDarkMode
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [shouldFocusTitle, setShouldFocusTitle] = useState(false);
  const [isCodeExpanded, setIsCodeExpanded] = useState(false);

  // Focus preservation for title input
  useEffect(() => {
    if (shouldFocusTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      setShouldFocusTitle(false);
    }
  }, [shouldFocusTitle]);

  // Memoized event handlers to prevent unnecessary re-renders
  const handleTextChange = useCallback((text: string) => {
    onTextChange(text);
    setShouldFocusTitle(true);
  }, [onTextChange]);

  const handleDescriptionChange = useCallback((description: string) => {
    onDescriptionChange(description);
  }, [onDescriptionChange]);

  const handleCodeChange = useCallback((code: string) => {
    onCodeChange(code);
  }, [onCodeChange]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileRead(files[0]);
    }
  }, []);

  const handleFileRead = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const detectedLanguage = detectLanguageFromExtension(file.name);

      onCodeChange(content);
      onCodeLanguageChange(detectedLanguage);
    };
    reader.readAsText(file);
  }, [onCodeChange, onCodeLanguageChange]);

  const handleDownloadCode = useCallback(() => {
    if (!editCode.trim()) return;

    const extension = getFileExtension(editCodeLanguage);
    const filename = editText ? `${editText}${extension}` : `code${extension}`;

    const blob = new Blob([editCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [editCode, editCodeLanguage, editText]);

  const clearCode = useCallback(() => {
    onCodeChange('');
    onCodeLanguageChange('text');
  }, [onCodeChange, onCodeLanguageChange]);

  const toggleCodeExpansion = useCallback(() => {
    setIsCodeExpanded(prev => !prev);
  }, []);

  // Get language extension for CodeMirror
  const getLanguageExtension = useCallback((language: string): Extension[] => {
    try {
      const ext = loadLanguage(language as Parameters<typeof loadLanguage>[0]);
      return ext ? [ext] : [];
    } catch (error) {
      console.warn(`Language ${language} not supported, falling back to plain text`);
      return [];
    }
  }, []);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 cursor-default">
      {/* Dynamic Modal Container - Responsive Width and Height */}
      <div className={`rounded-xl p-4 sm:p-6 shadow-2xl transition-all duration-300 backdrop-blur-lg border-2 scrollbar scrollbar-thumb-rounded ${
        isCodeExpanded 
          ? 'w-[95vw] h-[95vh] max-w-none max-h-none' // Full screen expansion
          : 'w-[95vw] sm:w-[700px] max-h-[90vh]' // Regular modal size
      } overflow-y-auto ${isDarkMode
          ? 'bg-gray-900/30 text-white border-gray-600/40 scrollbar-thumb-gray-600 scrollbar-track-gray-800 hover:scrollbar-thumb-gray-500'
          : 'bg-white/70 text-gray-900 border-gray-300/40 scrollbar-thumb-gray-400 scrollbar-track-gray-50 hover:scrollbar-thumb-gray-500'
        }`}>

        <h3 className={`text-xl font-bold mb-6 flex items-center transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'
          }`}>
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Edit Box
          </span>
          {isCodeExpanded && (
            <span className="ml-4 text-sm opacity-60">Full Screen Mode</span>
          )}
        </h3>

        {/* Responsive Layout Container */}
        <div className={`${isCodeExpanded ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : 'space-y-4'}`}>
          
          {/* Left Column / Top Section - Form Fields */}
          <div className={`${isCodeExpanded ? 'space-y-4' : 'space-y-4'}`}>
            <div>
              <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                Title
              </label>
              <input
                ref={titleInputRef}
                type="text"
                value={editText}
                onChange={(e) => handleTextChange(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 ${isDarkMode
                  ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400'
                  : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                  }`}
                placeholder="Enter box title..."
                autoFocus
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                Description
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                rows={isCodeExpanded ? 4 : 3}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical transition-all duration-300 ${isDarkMode
                  ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400'
                  : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                  }`}
                placeholder="Enter description..."
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                Tags
              </label>

              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => onNewTagChange(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onAddTag()}
                  className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all duration-300 ${isDarkMode
                    ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400'
                    : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                    }`}
                  placeholder="Add a tag..."
                />
                <button
                  onClick={onAddTag}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-md hover:from-blue-600 hover:to-indigo-700 text-sm transition-all transform hover:scale-105 duration-200"
                >
                  ➕ Add
                </button>
              </div>

              {/* Updated Tags Section with Purple Styling */}
              <div className="flex flex-wrap gap-2">
                {editTags.map(tag => (
                  <span
                    key={tag}
                    className={`inline-flex items-center text-sm px-3 py-1 rounded-full transition-all duration-200 hover:scale-105 ${
                      isDarkMode
                        ? 'bg-purple-900/40 text-purple-200 border border-purple-700/60 hover:bg-purple-800/50'
                        : 'bg-purple-100 text-purple-800 border border-purple-300 hover:bg-purple-200'
                    }`}
                  >
                    {tag}
                    <button
                      onClick={() => onRemoveTag(tag)}
                      className={`ml-2 transition-colors duration-200 hover:scale-110 ${
                        isDarkMode
                          ? 'text-purple-300 hover:text-red-400'
                          : 'text-purple-600 hover:text-red-600'
                      }`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-3 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                Color Theme
              </label>
              <div className={`grid ${isCodeExpanded ? 'grid-cols-6 sm:grid-cols-8' : 'grid-cols-4'} gap-3`}>
                {colors.map(color => (
                  <button
                    key={color}
                    onClick={() => onColorChange(color)}
                    className={`h-12 rounded-lg ${color} border-3 transition-all transform hover:scale-105 duration-200 ${editColor === color
                      ? isDarkMode
                        ? 'border-gray-200 shadow-lg ring-2 ring-blue-400'
                        : 'border-gray-800 shadow-lg ring-2 ring-blue-500'
                      : isDarkMode
                        ? 'border-gray-600 hover:border-gray-400'
                        : 'border-gray-300 hover:border-gray-400'
                      }`}
                    title={colorNames[color as keyof typeof colorNames]}
                  >
                    {editColor === color && (
                      <span className={`font-bold transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'
                        }`}>
                        ✓
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column / Bottom Section - Code Editor */}
          <div className={`${isCodeExpanded ? 'lg:col-span-1' : ''}`}>
            <div className="flex items-center justify-between mb-3">
              <label className={`block text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                Code
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={toggleCodeExpansion}
                  className={`text-sm px-3 py-1 rounded-md transition-all duration-200 hover:scale-105 ${isDarkMode
                    ? 'bg-blue-900/50 text-blue-300 hover:bg-blue-800/60'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                >
                  {isCodeExpanded ? '🔽 Collapse' : '📱💻 Expand'}
                </button>
                <select
                  value={editCodeLanguage}
                  onChange={(e) => onCodeLanguageChange(e.target.value)}
                  className={`px-3 py-1 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 ${isDarkMode
                    ? 'border-gray-600 bg-gray-700 text-white'
                    : 'border-gray-300 bg-white text-gray-900'
                    }`}
                >
                  {PROGRAMMING_LANGUAGES.map(lang => (
                    <option key={lang.value} value={lang.value}>
                      {lang.label}
                    </option>
                  ))}
                </select>
                {editCode && (
                  <>
                    <button
                      onClick={handleDownloadCode}
                      className={`text-sm px-3 py-1 rounded-md transition-all duration-200 hover:scale-105 ${isDarkMode
                        ? 'bg-green-900/50 text-green-300 hover:bg-green-800/60'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                    >
                      Download
                    </button>
                    <button
                      onClick={clearCode}
                      className={`text-sm px-3 py-1 rounded-md transition-all duration-200 hover:scale-105 ${isDarkMode
                        ? 'bg-red-900/50 text-red-300 hover:bg-red-800/60'
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                    >
                      Clear
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Responsive Full-Screen Code Editor */}
            <div className={`transition-all duration-300 ${
              isCodeExpanded 
                ? 'h-[calc(95vh-200px)] min-h-[500px]' // Full height in expanded mode
                : 'min-h-[200px] max-h-[400px]' // Standard height
            }`}>
              <div className="relative h-full">
                <div className={`px-4 py-2 rounded-t-lg flex items-center justify-between transition-colors duration-300 ${
                  isDarkMode ? 'bg-gray-900' : 'bg-gray-800'
                }`}>
                  <span className="text-white text-sm font-medium flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                    {PROGRAMMING_LANGUAGES.find(l => l.value === editCodeLanguage)?.label || 'Code'}
                    {isCodeExpanded && (
                      <span className="hidden sm:inline text-xs opacity-60">
                        - Full Screen Mode
                      </span>
                    )}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-gray-300 hover:text-white px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 transition-all duration-200 hover:scale-105"
                    >
                      📁 Replace
                    </button>
                  </div>
                </div>
                
                <div className="border-0 rounded-b-lg overflow-hidden h-[calc(100%-40px)]">
                  <CodeMirror
                    value={editCode}
                    onChange={handleCodeChange}
                    extensions={getLanguageExtension(editCodeLanguage)}
                    theme={isDarkMode ? oneDark : 'light'}
                    placeholder="// Start coding here..."
                    height={isCodeExpanded ? "100%" : "300px"}
                    width="100%"
                    basicSetup={{
                      lineNumbers: true,
                      foldGutter: true,
                      dropCursor: false,
                      allowMultipleSelections: false,
                      indentOnInput: true,
                      bracketMatching: true,
                      closeBrackets: true,
                      autocompletion: true,
                      highlightSelectionMatches: false,
                      searchKeymap: true,
                    }}
                    style={{
                      fontSize: isCodeExpanded ? '16px' : '14px', // Larger font in expanded mode
                      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                      height: '100%',
                    }}
                  />
                </div>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              accept=".js,.ts,.tsx,.py,.java,.cpp,.c,.cs,.php,.rb,.go,.rs,.swift,.kt,.html,.css,.sql,.json,.xml,.yml,.yaml,.md,.sh,.txt"
              className="hidden"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className={`flex gap-3 ${isCodeExpanded ? 'mt-6 lg:col-span-2' : 'mt-6'} flex-wrap sm:flex-nowrap`}>
          <button
            onClick={onSave}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-lg font-medium duration-200"
          >
            Save Changes
          </button>
          <button
            onClick={onCancel}
            className={`flex-1 py-3 px-4 rounded-lg transition-all transform hover:scale-105 shadow-lg font-medium duration-200 ${isDarkMode
              ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-gray-100 hover:from-gray-700 hover:to-gray-800'
              : 'bg-gradient-to-r from-gray-200 to-gray-300 text-gray-800 hover:from-gray-300 hover:to-gray-400'
              }`}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onDelete(editingBox.id);
              onCancel();
            }}
            className="bg-gradient-to-r from-red-600 to-pink-600 text-white py-3 px-4 rounded-lg hover:from-red-700 hover:to-pink-700 transition-all transform hover:scale-105 shadow-lg font-medium duration-200"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
});

EditModal.displayName = 'EditModal';

export default EditModal;