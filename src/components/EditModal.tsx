import React from "react";
import type { Box as BoxType } from "./types";
import { colors, colorNames} from "./types";
interface EditModalProps {
  editingBox: BoxType;
  editText: string;
  editDescription: string;
  editColor: string;
  editTags: string[];
  newTag: string;
  onTextChange: (text: string) => void;
  onDescriptionChange: (description: string) => void;
  onColorChange: (color: string) => void;
  onTagsChange: (tags: string[]) => void;
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
  newTag,
  onTextChange,
  onDescriptionChange,
  onColorChange,
//   onTagsChange,
  onNewTagChange,
  onAddTag,
  onRemoveTag,
  onTagKeyPress,
  onSave,
  onCancel,
  onDelete
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[500px] max-h-[90vh] overflow-y-auto shadow-xl">
        <h3 className="text-lg font-semibold mb-4">Edit Box</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Box Title
          </label>
          <input
            type="text"
            value={editText}
            onChange={(e) => onTextChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
            placeholder="Enter description..."
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
              onKeyPress={onTagKeyPress} //deprecated, try to change later
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Add a tag..."
            />
            <button
              onClick={onAddTag}
              className="bg-blue-500 text-white px-3 py-2 rounded-md hover:bg-blue-600 text-sm"
            >
              Add
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {editTags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
              >
                {tag}
                <button
                  onClick={() => onRemoveTag(tag)}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  × 
                  {/* copied it, try to add an svg */}
                </button>
              </span>
            ))}
            {editTags.length === 0 && (
              <span className="text-gray-500 text-sm italic">No tags added</span>
            )}
          </div>
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Box Color
          </label>
          <div className="grid grid-cols-5 gap-2">
            {colors.map(color => (
              <button
                key={color}
                onClick={() => onColorChange(color)}
                className={`w-12 h-12 rounded-lg ${color} border-2 transition-all ${
                  editColor === color 
                    ? 'border-gray-800 ring-2 ring-blue-500' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                title={colorNames[color as keyof typeof colorNames]}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Selected: {colorNames[editColor as keyof typeof colorNames]}
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onSave}
            className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
          >
            Save Changes
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onDelete(editingBox.id);
              onCancel();
            }}
            className="bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditModal;