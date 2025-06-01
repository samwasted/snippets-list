import React from "react";
import { motion } from "framer-motion";
import type { Box as BoxType } from "./types";

interface BoxProps {
  box: BoxType;
  scale: number;
  onUpdatePosition: (id: string, deltaX: number, deltaY: number) => void;
  onStartEditing: (box: BoxType) => void;
  onTagRightClick: (e: React.MouseEvent, tag: string) => void;
}

const Box: React.FC<BoxProps> = ({ 
  box, 
  onUpdatePosition, 
  onStartEditing,
  onTagRightClick
}) => {
  return (
    <motion.div
      drag
      dragMomentum={false}
      whileDrag={{ scale: 1.05 }}
      whileHover={{ scale: 1.02 }}
      onDrag={(_, info) => onUpdatePosition(box.id, info.delta.x, info.delta.y)}
      onDoubleClick={() => onStartEditing(box)}
      className={`absolute w-48 h-40 rounded-lg shadow-lg flex flex-col cursor-pointer select-none ${box.color} hover:shadow-xl transition-shadow`}
      style={{ left: box.x, top: box.y }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className="p-3 flex-1 flex flex-col">
        <div className="font-semibold text-white text-center mb-2">{box.label}</div>
        
        {box.description && (
          <div className="text-xs text-white/90 flex-1 overflow-hidden">
            <div className="line-clamp-3">{box.description}</div>
          </div>
        )}
        
        {box.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {box.tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                onContextMenu={(e) => onTagRightClick(e, tag)}
                className="inline-block bg-white/20 text-white text-xs px-1.5 py-0.5 rounded cursor-context-menu"
              >
                {tag}
              </span>
            ))}
            {box.tags.length > 3 && (
              <span className="inline-block bg-white/20 text-white text-xs px-1.5 py-0.5 rounded">
                +{box.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
      
    </motion.div>
  );
};

export default Box;