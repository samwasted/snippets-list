import React from "react";

interface LineProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke?: string;
  strokeWidth?: number;
}

const Line: React.FC<LineProps> = ({
  x1,
  y1,
  x2,
  y2,
  stroke = "black",
  strokeWidth = 2,
}) => {
  return (
    <svg
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    >
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={strokeWidth} />
    </svg>
  );
};

export default Line;
