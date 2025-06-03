import React from "react";
import { colors, colorNames } from "./types";


// get all colors from the constant colors and add them to the option
//would look beautiful 

interface TagColorMenuProps {
  tag: string;
  x: number;
  y: number;
  onColorSelect: (tag: string, color: string) => void;
  onClose: () => void;
}

const TagColorMenu: React.FC<TagColorMenuProps> = ({ 
  tag, 
  x, 
  y, 
  onColorSelect, 
}) => {
  return (
    <div
      className="fixed z-[9999] bg-white rounded-lg shadow-xl border border-gray-200 p-3"
      style={{
        left: x,
        top: y,
        transform: 'translate(-50%, -10px)'
      }}
      onClick={(e) => e.stopPropagation()} //prevention of bugs
    >
      <div className="text-sm font-medium text-gray-700 mb-2">
        Change color for tag: <span className="font-semibold text-blue-600">"{tag}"</span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {colors.map(color => (
          <button
            key={color}
            onClick={() => onColorSelect(tag, color)}
            className={`w-8 h-8 rounded ${color} border-2 border-gray-300 hover:border-gray-500 transition-all hover:scale-110`}
            title={colorNames[color as keyof typeof colorNames]}
            // typeof fixes the bugs, ig ts specific it is
          />
        ))}
      </div>
      <div className="text-xs text-gray-500 mt-2">
        This will change the color of all boxes with this tag
      </div>
    </div>
  );
};

export default TagColorMenu;