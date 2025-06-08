import React, { useState, useRef } from "react";
import type { Snippet } from "./types";
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

// Function to get file extension for a language
const getFileExtension = (language: string): string => {
  const lang = PROGRAMMING_LANGUAGES.find(l => l.value === language);
  return lang ? lang.extensions[0] : '.txt';
};

interface EditModalProps {
  editingSnippet: Snippet;
  editTitle: string;
  editDescription: string;
  editColor: string;
  editTags: string[];
  editCode: string;
  editCodeLanguage: string;
  newTag: string;
  onTitleChange: (title: string) => void;
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
  canDelete?: boolean;
}

const EditModal: React.FC<EditModalProps> = ({
  editingSnippet,
  editTitle,
  editDescription,
  editColor,
  editTags,
  editCode,
  editCodeLanguage,
  newTag,
  onTitleChange,
  onDescriptionChange,
  onColorChange,
  onCodeChange,
  onCodeLanguageChange,
  onNewTagChange,
  onAddTag,
  onRemoveTag,
  onTagKeyPress,
  onSave,
  onCancel,
  onDelete,
  canDelete = true
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

  const handleDownloadCode = () => {
    if (!editCode.trim()) return;

    const extension = getFileExtension(editCodeLanguage);
    const filename = editTitle ? `${editTitle}${extension}` : `code${extension}`;
    
    const blob = new Blob([editCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearCode = () => {
    onCodeChange('');
    onCodeLanguageChange('text');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[600px] max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">
          Edit Snippet
        </h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Title
          </label>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter snippet title..."
            autoFocus
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={editDescription}
            onChange={(e) => onDescriptionChange(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
            placeholder="Enter description..."
          />
        </div>

        {/* Code Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Code
            </label>
            <div className="flex items-center gap-2">
              <select
                value={editCodeLanguage}
                onChange={(e) => onCodeLanguageChange(e.target.value)}
                className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Download
                  </button>
                  <button
                    onClick={clearCode}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Clear
                  </button>
                </>
              )}
            </div>
          </div>
          
          {/* File Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-md transition-colors ${
              isDragOver 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300'
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
              <div className="p-6 text-center">
                <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-gray-600 mb-2">Drop your code file here</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  or browse files
                </button>
              </div>
            ) : (
              <div>
                <div className="bg-gray-100 px-3 py-2 rounded-t-md flex items-center justify-between border-b">
                  <span className="text-sm text-gray-600">
                    {PROGRAMMING_LANGUAGES.find(l => l.value === editCodeLanguage)?.label || 'Code'}
                  </span>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Replace
                  </button>
                </div>
                <textarea
                  value={editCode}
                  onChange={(e) => onCodeChange(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 font-mono text-sm bg-gray-50 border-0 rounded-b-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
                  placeholder="Paste your code here..."
                />
              </div>
            )}
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tags
          </label>
          
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => onNewTagChange(e.target.value)}
              onKeyDown={onTagKeyPress}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="Add a tag..."
            />
            <button
              onClick={onAddTag}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
            >
              Add
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {editTags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center bg-gray-100 text-gray-800 text-sm px-2 py-1 rounded-md"
              >
                {tag}
                <button
                  onClick={() => onRemoveTag(tag)}
                  className="ml-1 text-gray-500 hover:text-red-600"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Color
          </label>
          <div className="grid grid-cols-6 gap-2">
            {colors.map(color => (
              <button
                key={color}
                onClick={() => onColorChange(color)}
                className={`w-8 h-8 rounded-md ${color} border-2 ${
                  editColor === color 
                    ? 'border-gray-800' 
                    : 'border-gray-300'
                }`}
                title={colorNames[color as keyof typeof colorNames]}
              />
            ))}
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onSave}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
          >
            Save Changes
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
          {canDelete && (
            <button
              onClick={() => {
                onDelete(editingSnippet.id);
                onCancel();
              }}
              className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditModal;