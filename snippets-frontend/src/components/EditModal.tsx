import React, { useState, useRef } from "react";
import type { Box as BoxType } from "./types";
import { colors, colorNames} from "./types";

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

interface EditModalProps {
  editingBox: BoxType;
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
}

const EditModal: React.FC<EditModalProps> = ({
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
  // onTagsChange,
  onCodeChange,
  onCodeLanguageChange,
  onNewTagChange,
  onAddTag,
  onRemoveTag,
  // onTagKeyPress,
  onSave,
  onCancel,
  onDelete
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileRead(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileRead(files[0]);
    }
  };

  const handleFileRead = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const detectedLanguage = detectLanguageFromExtension(file.name);
      
      onCodeChange(content);
      onCodeLanguageChange(detectedLanguage);
    };
    reader.readAsText(file);
  };

  const clearCode = () => {
    onCodeChange('');
    onCodeLanguageChange('text');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[600px] max-h-[90vh] overflow-y-auto shadow-xl">
        <h3 className="text-xl font-bold mb-6 text-gray-800 flex items-center gap-2">
          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
          Edit Box
        </h3>
        
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Box Title
          </label>
          <input
            type="text"
            value={editText}
            onChange={(e) => onTextChange(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
            placeholder="Enter box title..."
            autoFocus
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={editDescription}
            onChange={(e) => onDescriptionChange(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-vertical transition-all duration-200"
            placeholder="Enter description..."
          />
        </div>

        {/* Code Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-semibold text-gray-700">
              Code
            </label>
            <div className="flex items-center gap-2">
              <select
                value={editCodeLanguage}
                onChange={(e) => onCodeLanguageChange(e.target.value)}
                className="px-3 py-1 text-sm border-2 border-gray-200 rounded-md focus:outline-none focus:border-blue-500 bg-white"
              >
                {PROGRAMMING_LANGUAGES.map(lang => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
              {editCode && (
                <button
                  onClick={clearCode}
                  className="text-xs text-red-600 hover:text-red-800 font-medium"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          
          {/* File Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-lg transition-all duration-200 ${
              isDragOver 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              accept=".js,.ts,.tsx,.py,.java,.cpp,.c,.cs,.php,.rb,.go,.rs,.swift,.kt,.html,.css,.sql,.json,.xml,.yml,.yaml,.md,.sh,.txt"
              className="hidden"
            />
            
            {!editCode ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-gray-600 mb-2 font-medium">Drop your code file here</p>
                <p className="text-sm text-gray-500 mb-4">or</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-medium"
                >
                  Browse Files
                </button>
                <p className="text-xs text-gray-400 mt-3">
                  Supports .js, .ts, .py, .java, .cpp, .html, .css and more
                </p>
              </div>
            ) : (
              <div className="p-0">
                <div className="bg-gray-900 text-gray-100 rounded-t-lg px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <span className="text-sm font-mono">
                      {PROGRAMMING_LANGUAGES.find(l => l.value === editCodeLanguage)?.label || 'Code'}
                    </span>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    Replace file
                  </button>
                </div>
                <textarea
                  value={editCode}
                  onChange={(e) => onCodeChange(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-3 font-mono text-sm bg-gray-50 border-0 rounded-b-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
                  placeholder="Paste your code here or drop a file above..."
                  style={{ fontFamily: 'Fira Code, Consolas, Monaco, monospace' }}
                />
              </div>
            )}
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Tags
          </label>
          
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newTag}
              onChange={(e) => onNewTagChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onAddTag()}
              className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm transition-all duration-200"
              placeholder="Add a tag..."
            />
            <button
              onClick={onAddTag}
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-blue-700 text-sm font-medium transition-all duration-200"
            >
              Add
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {editTags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 text-xs px-3 py-1 rounded-full font-medium"
              >
                {tag}
                <button
                  onClick={() => onRemoveTag(tag)}
                  className="ml-2 text-blue-600 hover:text-red-600 transition-colors"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </span>
            ))}
            {editTags.length === 0 && (
              <span className="text-gray-500 text-sm italic">No tags added</span>
            )}
          </div>
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Box Color
          </label>
          <div className="grid grid-cols-6 gap-3">
            {colors.map(color => (
              <button
                key={color}
                onClick={() => onColorChange(color)}
                className={`w-12 h-12 rounded-xl ${color} border-3 transition-all duration-200 transform hover:scale-110 ${
                  editColor === color 
                    ? 'border-gray-800 ring-3 ring-blue-400 scale-110' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                title={colorNames[color as keyof typeof colorNames]}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2 font-medium">
            Selected: {colorNames[editColor as keyof typeof colorNames]}
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onSave}
            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            Save Changes
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-300 transition-all duration-200 font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onDelete(editingBox.id);
              onCancel();
            }}
            className="bg-gradient-to-r from-red-500 to-red-600 text-white py-3 px-6 rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditModal;