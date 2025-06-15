import React, { useEffect, useRef, useState } from "react";
import { colors, colorNames } from "./types";

interface TagColorMenuProps {
  tag: string;
  x: number;
  y: number;
  onColorSelect: (tag: string, color: string) => void;
  onClose: () => void;
  isDarkMode?: boolean;
}

const TagColorMenu: React.FC<TagColorMenuProps> = ({ 
  tag, 
  x, 
  y, 
  onColorSelect,
  onClose,
  isDarkMode = false
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: x, top: y, transform: 'translate(-50%, -10px)' });

  useEffect(() => {
    if (!menuRef.current) return;

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let newLeft = x;
    let newTop = y;
    let transform = 'translate(-50%, -10px)';

    // Check horizontal boundaries
    const menuWidth = rect.width || 200; // fallback width
    const leftEdge = x - menuWidth / 2;
    const rightEdge = x + menuWidth / 2;

    if (leftEdge < 10) {
      // Too close to left edge
      newLeft = 10 + menuWidth / 2;
      transform = 'translate(-50%, -10px)';
    } else if (rightEdge > viewportWidth - 10) {
      // Too close to right edge
      newLeft = viewportWidth - 10 - menuWidth / 2;
      transform = 'translate(-50%, -10px)';
    }

    // Check vertical boundaries
    const menuHeight = rect.height || 150; // fallback height
    const topEdge = y - 10;
    const bottomEdge = y + menuHeight;

    if (topEdge < 10) {
      // Too close to top edge
      newTop = y + 20;
      transform = transform.replace('-10px', '10px');
    } else if (bottomEdge > viewportHeight - 10) {
      // Too close to bottom edge
      newTop = y - menuHeight - 10;
      transform = transform.replace('-10px', `${menuHeight + 10}px`);
    }

    setPosition({ left: newLeft, top: newTop, transform });
  }, [x, y]);

  return (
    <div
      ref={menuRef}
      className={`fixed z-[9999] rounded-lg shadow-xl border p-3 transition-all duration-300 ${
        isDarkMode 
          ? 'bg-gray-800 border-gray-600' 
          : 'bg-white border-gray-200'
      }`}
      style={{
        left: position.left,
        top: position.top,
        transform: position.transform,
        backdropFilter: 'blur(10px)',
        maxWidth: '90vw', // Ensure it doesn't exceed viewport width
        maxHeight: '90vh', // Ensure it doesn't exceed viewport height
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
