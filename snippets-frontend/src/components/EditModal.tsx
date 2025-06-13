import React, { useState, useRef } from "react";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { colors, colorNames } from "./types";

// Define types (assuming these exist in your types file)
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
  { value: 'javascript', label: 'JavaScript', extensions: ['.js', '.mjs'], prismLang: 'javascript' },
  { value: 'typescript', label: 'TypeScript', extensions: ['.ts', '.tsx'], prismLang: 'typescript' },
  { value: 'python', label: 'Python', extensions: ['.py', '.pyw'], prismLang: 'python' },
  { value: 'java', label: 'Java', extensions: ['.java'], prismLang: 'java' },
  { value: 'cpp', label: 'C++', extensions: ['.cpp', '.cxx', '.cc'], prismLang: 'cpp' },
  { value: 'c', label: 'C', extensions: ['.c', '.h'], prismLang: 'c' },
  { value: 'csharp', label: 'C#', extensions: ['.cs'], prismLang: 'csharp' },
  { value: 'php', label: 'PHP', extensions: ['.php'], prismLang: 'php' },
  { value: 'ruby', label: 'Ruby', extensions: ['.rb'], prismLang: 'ruby' },
  { value: 'go', label: 'Go', extensions: ['.go'], prismLang: 'go' },
  { value: 'rust', label: 'Rust', extensions: ['.rs'], prismLang: 'rust' },
  { value: 'swift', label: 'Swift', extensions: ['.swift'], prismLang: 'swift' },
  { value: 'kotlin', label: 'Kotlin', extensions: ['.kt', '.kts'], prismLang: 'kotlin' },
  { value: 'html', label: 'HTML', extensions: ['.html', '.htm'], prismLang: 'markup' },
  { value: 'css', label: 'CSS', extensions: ['.css', '.scss', '.sass'], prismLang: 'css' },
  { value: 'sql', label: 'SQL', extensions: ['.sql'], prismLang: 'sql' },
  { value: 'json', label: 'JSON', extensions: ['.json'], prismLang: 'json' },
  { value: 'xml', label: 'XML', extensions: ['.xml'], prismLang: 'xml' },
  { value: 'yaml', label: 'YAML', extensions: ['.yml', '.yaml'], prismLang: 'yaml' },
  { value: 'markdown', label: 'Markdown', extensions: ['.md', '.markdown'], prismLang: 'markdown' },
  { value: 'shell', label: 'Shell/Bash', extensions: ['.sh', '.bash'], prismLang: 'bash' },
  { value: 'text', label: 'Plain Text', extensions: ['.txt'], prismLang: 'text' }
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

// Function to get Prism language for syntax highlighting
const getPrismLanguage = (language: string): string => {
  const lang = PROGRAMMING_LANGUAGES.find(l => l.value === language);
  return lang?.prismLang || 'text';
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
  onCodeChange,
  onCodeLanguageChange,
  onNewTagChange,
  onAddTag,
  onRemoveTag,
  onSave,
  onCancel,
  onDelete
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  };

  const clearCode = () => {
    onCodeChange('');
    onCodeLanguageChange('text');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[700px] max-h-[90vh] overflow-y-auto shadow-2xl">
        <h3 className="text-xl font-bold mb-6 text-gray-800 flex items-center">
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Edit Box
          </span>
        </h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Title
          </label>
          <input
            type="text"
            value={editText}
            onChange={(e) => onTextChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="Enter box title..."
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical transition-all"
            placeholder="Enter description..."
          />
        </div>

        {/* Code Section - Updated based on user requirements */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
              Code
            </label>
            <div className="flex items-center gap-2">
              <select
                value={editCodeLanguage}
                onChange={(e) => onCodeLanguageChange(e.target.value)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
                    className="text-sm px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                  >
                    Download
                  </button>
                  <button
                    onClick={clearCode}
                    className="text-sm px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                  >
                    Clear
                  </button>
                </>
              )}
            </div>
          </div>
          
          {/* Updated Code Editor with live syntax highlighting */}
          <div className="min-h-[200px]">
            <div className="relative">
              <div className="bg-gray-800 px-4 py-2 rounded-t-lg flex items-center justify-between">
                <span className="text-white text-sm font-medium flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                  {PROGRAMMING_LANGUAGES.find(l => l.value === editCodeLanguage)?.label || 'Code'}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-gray-300 hover:text-white px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 transition-colors"
                  >
                    📁 Replace
                  </button>
                </div>
              </div>
              <div className="relative">
                <textarea
                  value={editCode}
                  onChange={(e) => onCodeChange(e.target.value)}
                  rows={12}
                  className="w-full px-4 py-3 font-mono text-sm bg-gray-900 text-green-400 border-0 rounded-b-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical absolute inset-0 z-10 opacity-100"
                  placeholder="// Start coding here..."
                  style={{ 
                    tabSize: 2,
                    background: 'transparent',
                    color: 'transparent',
                    caretColor: '#10b981'
                  }}
                />
                <div className="w-full">
                  <SyntaxHighlighter
                    language={getPrismLanguage(editCodeLanguage)}
                    style={vscDarkPlus}
                    customStyle={{
                      margin: 0,
                      borderTopLeftRadius: 0,
                      borderTopRightRadius: 0,
                      fontSize: '14px',
                      lineHeight: '1.5',
                      minHeight: '200px'
                    }}
                    showLineNumbers={true}
                  >
                    {editCode || ' '}
                  </SyntaxHighlighter>
                </div>
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
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tags
          </label>
          
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newTag}
              onChange={(e) => onNewTagChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onAddTag()}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
              placeholder="Add a tag..."
            />
            <button
              onClick={onAddTag}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-md hover:from-blue-600 hover:to-indigo-700 text-sm transition-all transform hover:scale-105"
            >
              ➕ Add
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {editTags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 text-sm px-3 py-1 rounded-full border border-purple-200"
              >
                {tag}
                <button
                  onClick={() => onRemoveTag(tag)}
                  className="ml-2 text-purple-600 hover:text-red-600 transition-colors"
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
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Color Theme
          </label>
          <div className="grid grid-cols-4 gap-3">
            {colors.map(color => (
              <button
                key={color}
                onClick={() => onColorChange(color)}
                className={`h-12 rounded-lg ${color} border-3 transition-all transform hover:scale-105 ${
                  editColor === color 
                    ? 'border-gray-800 shadow-lg ring-2 ring-blue-500' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                title={colorNames[color as keyof typeof colorNames]}
              >
                {editColor === color && (
                  <span className="text-gray-800 font-bold">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onSave}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-lg font-medium"
          >
            💾 Save Changes
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-gradient-to-r from-gray-200 to-gray-300 text-gray-800 py-3 px-4 rounded-lg hover:from-gray-300 hover:to-gray-400 transition-all transform hover:scale-105 shadow-lg font-medium"
          >
            ❌ Cancel
          </button>
          <button
            onClick={() => {
              onDelete(editingBox.id);
              onCancel();
            }}
            className="bg-gradient-to-r from-red-600 to-pink-600 text-white py-3 px-4 rounded-lg hover:from-red-700 hover:to-pink-700 transition-all transform hover:scale-105 shadow-lg font-medium"
          >
            🗑️ Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditModal;