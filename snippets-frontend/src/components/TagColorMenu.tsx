import React from "react";
import { colors, colorNames } from "./types";

interface TagColorMenuProps {
  tag: string;
  x: number;
  y: number;
  onColorSelect: (tag: string, color: string) => void;
  onClose: () => void;
  isDarkMode?: boolean; // Add dark mode prop
}

const TagColorMenu: React.FC<TagColorMenuProps> = ({ 
  tag, 
  x, 
  y, 
  onColorSelect,
  onClose,
  isDarkMode = false
}) => {
  return (
    <div
      className={`fixed z-[9999] rounded-lg shadow-xl border p-3 transition-colors duration-300 ${
        isDarkMode 
          ? 'bg-gray-800 border-gray-600' 
          : 'bg-white border-gray-200'
      }`}
      style={{
        left: x,
        top: y,
        transform: 'translate(-50%, -10px)',
        backdropFilter: 'blur(10px)'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={`text-sm font-medium mb-2 transition-colors duration-300 ${
        isDarkMode ? 'text-gray-200' : 'text-gray-700'
      }`}>
        Change color for tag: <span className="font-semibold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">"{tag}"</span>
      </div>
      
      <div className="grid grid-cols-5 gap-2">
        {colors.map(color => (
          <button
            key={color}
            onClick={() => onColorSelect(tag, color)}
            className={`w-8 h-8 rounded ${color} border-2 transition-all hover:scale-110 shadow-md hover:shadow-lg ${
              isDarkMode 
                ? 'border-gray-600 hover:border-gray-400' 
                : 'border-gray-300 hover:border-gray-500'
            }`}
            title={colorNames[color as keyof typeof colorNames]}
          />
        ))}
      </div>
      
      <div className={`text-xs mt-2 transition-colors duration-300 ${
        isDarkMode ? 'text-gray-400' : 'text-gray-500'
      }`}>
        This will change the color of all boxes with this tag
      </div>
      
      <button
        onClick={onClose}
        className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all duration-200 hover:scale-110 ${
          isDarkMode 
            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        ×
      </button>
    </div>
  );
};

export default TagColorMenu;