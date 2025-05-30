import { useMotionValue } from "framer-motion";
import React, { useState, useRef } from "react";
import type { Box } from "./types";
import { colorNames, colors } from "./constants";
export default function side() {
    const containerRef = useRef<HTMLDivElement>(null)

    //Zoom & pan
    const [scale, setScale] = useState(1)
    const panX = useMotionValue(0)
    const panY = useMotionValue(0)

    //DEFAULT BOXES
    const [boxes, setBoxes] = useState<Box[]>([
        {
            id: "1",
            x: 100,
            y: 100,
            color: "bg-red-400",
            label: "Box 1",
            description: "first box, add description",
            tags: ['first', 'second']
        },
        {
            id: "2",
            x: 400,
            y: 200,
            color: "bg-green-400",
            label: "Box 2",
            description: "another box",
            tags: ['demo', 'second']
        }
    ])
    // Tag color menu state
    const [tagColorMenu, setTagColorMenu] = useState<{
        show: boolean;
        tag: string;
        x: number;
        y: number;
    }>({ show: false, tag: "", x: 0, y: 0 });
    const [nextBoxId, setNextBoxId] = useState(3)
    const [editingBox, setEditingBox] = useState<Box | null>(null)
    const [editText, setEditText] = useState("")
    const [editDescription, setEditDescription] = useState("")
    const [editColor, setEditColor] = useState("")
    const [editTags, setEditTags] = useState<string[]>([])
    const [newTag, setNewTag] = useState("")
    const [tagFilters, setTagFilters] = useState<Set<string>>(new Set()) // ye nhi
    const [searchQuery, setSearchQuery] = useState("") //ye nhi
    const [boxOrder, setBoxOrder] = useState<string[]>([]); //ye nhi

    // Get all unique tags from all boxes
    const getAllTags = () => {
        const tagSet = new Set<string>();
        boxes.forEach(box => {
            box.tags.forEach(tag => tagSet.add(tag));
        });
        return Array.from(tagSet).sort();
    }
    // Initialize box order when boxes change
    React.useEffect(() => {
        const currentIds = boxes.map(box => box.id);
        const newIds = currentIds.filter(id => !boxOrder.includes(id));
        const validIds = boxOrder.filter(id => currentIds.includes(id));
        setBoxOrder([...validIds, ...newIds]);
    }, [boxes.length]);
    // Close tag color menu when clicking outside
    React.useEffect(() => {
        const handleClickOutside = () => {
            setTagColorMenu({ show: false, tag: "", x: 0, y: 0 });
        };

        if (tagColorMenu.show) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [tagColorMenu.show]);

    // Zoom handlers
    const zoom = (delta: number) => {
        setScale(prev => Math.max(0.5, Math.min(3, prev + delta)));
    };

    const reset = () => {
        setScale(1);
        panX.set(0);
        panY.set(0);
    }
    const addBox = () => {
        const randomColor = colors[Math.floor(Math.random() * colors.length)]
        const newBox: Box = {
            id: String(nextBoxId),
            x: Math.random()*400 + 100,
            y: Math.random()*400 + 100,
            color: randomColor,
            label: `Box ${nextBoxId}`,
            description: "",
            tags: []
        }

        setBoxes(prev => [...prev, newBox]);
        setNextBoxId(prev => prev+1);
    }

    //Edit Box
    const startEditing = (box: Box) => {
        setEditingBox(box);
        setEditText(box.label)
        setEditDescription(box.description)
        setEditColor(box.color)
        setEditTags([...box.tags])
        setNewTag("")
    }
    const saveEdit = () => {
    if (editingBox) {
      setBoxes(prev => prev.map(box => 
        box.id === editingBox.id 
          ? { 
              ...box, 
              label: editText, 
              description: editDescription,
              color: editColor,
              tags: editTags
            }
          : box
      ));
    }
    setEditingBox(null);
  };

  const cancelEdit = () => {
    setEditingBox(null)
    setEditText('')
    setEditDescription("")
    setEditColor("")
    setEditTags([])
    setNewTag("")
  }

  //Tag management
  const addTag = () => {
    const trimmedTag = newTag.trim().toLowerCase();
    if(trimmedTag && !editTags.includes(trimmedTag)){
        setEditTags(prev => [...prev, trimmedTag]);
        setNewTag("")
    }
  };

  const removeTag = (tagToRemove: string) => {
    setEditTags(prev => prev.filter(tag => tag !== tagToRemove))
  };
  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter'){
        e.preventDefault();
        addTag();
    }
  };
}