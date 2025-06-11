// import { useState, useEffect } from "react";
// import Sidebar from "./Sidebar";
// import { useSpaceWebSocket } from "./useSpaceWebSocket"; // Import the hook

// // Mock types for testing
// interface Snippet {
//   id: string;
//   title: string;
//   description?: string;
//   code?: string;
//   tags: string[];
//   color: string;
//   x: number;
//   y: number;
//   spaceId: string;
//   ownerId: string;
//   createdAt: Date;
//   updatedAt: Date;
// }

// interface Space {
//   id: string;
//   name: string;
//   order: string[];
//   isPublic: boolean;
//   ownerId: string;
// }

// // Mock API utility
// const API_BASE_URL = 'http://localhost:3000/api/v1';

// const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
//   const token = localStorage.getItem('token') || 'mock-token';
//   const url = `${API_BASE_URL}${endpoint}`;
//   const config: RequestInit = {
//     ...options,
//     headers: {
//       'Content-Type': 'application/json',
//       'Authorization': `Bearer ${token}`,
//       ...options.headers,
//     },
//   };

//   const response = await fetch(url, config);
  
//   if (!response.ok) {
//     throw new Error(`API request failed: ${response.status} ${response.statusText}`);
//   }
  
//   return response.json();
// };

// export default function Space() {
//   const spaceId = "cmbkbvr8x0001lh1cupeix18l";
//   const currentUser = { id: "cmbhjmeye0003lhaclqqke8sr", name: null }; //only to test
  
//   // Get token from localStorage
//   const [authToken, setAuthToken] = useState<string | undefined>(() => {
//     return localStorage.getItem('token') || undefined;
//   });
  
//   // State
//   const [snippets, setSnippets] = useState<Snippet[]>([]);
//   const [snippetOrder, setSnippetOrder] = useState<string[]>([]);
//   const [spaceData, setSpaceData] = useState<Space | null>(null);
//   const [sidebarOpen, setSidebarOpen] = useState(true);
//   const [isLoading, setIsLoading] = useState(false);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [tagFilters, setTagFilters] = useState<Set<string>>(new Set());

//   // WebSocket using imported hook
//   const { 
//     sendSnippetMove, 
//     sendSnippetCreate, 
//     sendSnippetDelete, 
//     sendSnippetUpdate,
//     lastMessage,
//     isConnected,
//     isJoined,
//     joinSpace,
//     connectionState,
//     lastError,
//     userPermissions
//   } = useSpaceWebSocket({
//     spaceId,
//     userId: currentUser.id,
//     token: authToken,
//     enabled: true
//   });

//   // Listen for token changes in localStorage
//   useEffect(() => {
//     const handleStorageChange = (e: StorageEvent) => {
//       if (e.key === 'token') {
//         setAuthToken(e.newValue || undefined);
//       }
//     };

//     window.addEventListener('storage', handleStorageChange);
//     return () => window.removeEventListener('storage', handleStorageChange);
//   }, []);

//   // Initialize
//   useEffect(() => {
//     fetchSpaceData();
//   }, []);

//   // Handle WebSocket messages - FIXED VERSION - even more fixed version
//   useEffect(() => {
//   if (!lastMessage) return;

//   console.log('Processing WebSocket message:', lastMessage);

//   switch (lastMessage.type) {
//     case 'snippet-moved':
//       // Apply movement from WebSocket regardless of who sent it
//       setSnippets(prev => prev.map(snippet =>
//         snippet.id === lastMessage.payload.id ? {
//           ...snippet,
//           x: Math.round(lastMessage.payload.x ?? snippet.x),
//           y: Math.round(lastMessage.payload.y ?? snippet.y),
//           updatedAt: new Date(lastMessage.payload.updatedAt || Date.now())
//         } : snippet
//       ));
//       console.log(`Snippet ${lastMessage.payload.id} moved to (${lastMessage.payload.x}, ${lastMessage.payload.y})`);
//       break;

//     case 'snippet-created':
//       // Check if snippet already exists to prevent duplicates
//       setSnippets(prev => {
//         const exists = prev.some(s => s.id === lastMessage.payload.id);
//         if (exists) {
//           console.log('Snippet already exists, skipping creation');
//           return prev;
//         }
        
//         // Create new snippet with comprehensive default values
//         const newSnippet: Snippet = {
//           id: lastMessage.payload.id || `ws_${Date.now()}`,
//           title: lastMessage.payload.title || 'Untitled Snippet',
//           description: lastMessage.payload.description || '',
//           code: lastMessage.payload.code || '',
//           tags: Array.isArray(lastMessage.payload.tags) ? lastMessage.payload.tags : [],
//           color: lastMessage.payload.color || 'bg-gray-400',
//           x: Math.round(lastMessage.payload.x ?? 100),
//           y: Math.round(lastMessage.payload.y ?? 100),
//           spaceId: lastMessage.payload.spaceId || spaceId,
//           ownerId: lastMessage.payload.ownerId || currentUser.id,
//           createdAt: new Date(lastMessage.payload.createdAt || Date.now()),
//           updatedAt: new Date(lastMessage.payload.updatedAt || Date.now())
//         };
        
//         console.log('Adding new snippet from WebSocket:', newSnippet);
//         return [...prev, newSnippet];
//       });
      
//       // Update order if not already present
//       setSnippetOrder(prev => {
//         const snippetId = lastMessage.payload.id;
//         if (!snippetId) return prev;
        
//         const exists = prev.includes(snippetId);
//         if (exists) return prev;
//         return [...prev, snippetId];
//       });
//       break;

//     case 'snippet-deleted':
//       const deletedId = lastMessage.payload.snippetId || lastMessage.payload.id;
//       if (deletedId) {
//         console.log('Deleting snippet from WebSocket:', deletedId);
//         setSnippets(prev => prev.filter(snippet => snippet.id !== deletedId));
//         setSnippetOrder(prev => prev.filter(id => id !== deletedId));
//       }
//       break;

//     case 'snippet-updated':
//       // Apply updates from WebSocket with proper defaults
//       setSnippets(prev => prev.map(snippet => {
//         if (snippet.id === lastMessage.payload.id || snippet.id === lastMessage.payload.snippetId) {
//           const updatedSnippet = {
//             ...snippet,
//             // Only update fields that are provided, keep existing values for others
//             ...(lastMessage.payload.title !== undefined && { title: lastMessage.payload.title }),
//             ...(lastMessage.payload.description !== undefined && { description: lastMessage.payload.description }),
//             ...(lastMessage.payload.code !== undefined && { code: lastMessage.payload.code }),
//             ...(Array.isArray(lastMessage.payload.tags) && { tags: lastMessage.payload.tags }),
//             ...(lastMessage.payload.color !== undefined && { color: lastMessage.payload.color }),
//             ...(lastMessage.payload.x !== undefined && { x: Math.round(lastMessage.payload.x) }),
//             ...(lastMessage.payload.y !== undefined && { y: Math.round(lastMessage.payload.y) }),
//             updatedAt: new Date(lastMessage.payload.updatedAt || Date.now())
//           };
          
//           console.log('Snippet updated from WebSocket:', updatedSnippet.id, updatedSnippet);
//           return updatedSnippet;
//         }
//         return snippet;
//       }));
//       break;

//     case 'space-view':
//       if (lastMessage.payload.order && Array.isArray(lastMessage.payload.order)) {
//         console.log('Updating snippet order from WebSocket:', lastMessage.payload.order);
//         setSnippetOrder(lastMessage.payload.order);
//       }
//       break;

//     // Handle any other potential message types
//     default:
//       console.log('Unknown WebSocket message type:', lastMessage.type);
//       break;
//   }
// }, [lastMessage, currentUser.id, spaceId]);

//   // API Functions
//   const fetchSpaceData = async () => {
//     try {
//       setIsLoading(true);
//       console.log('Fetching space data via HTTP...');
      
//       const spaceResponse = await apiRequest(`/space/${spaceId}`);
//       console.log('Space data received:', spaceResponse);
      
//       if (spaceResponse.space) {
//         const space = spaceResponse.space;
//         setSpaceData(space);
        
//         // Set snippets from the response
//         if (space.snippets) {
//           setSnippets(space.snippets);
//         }
        
//         // Handle order - use space.order if available, otherwise create from snippets
//         if (space.order && Array.isArray(space.order) && space.order.length > 0) {
//           setSnippetOrder(space.order);
//         } else if (space.snippets) {
//           // Create order based on snippet creation time if no order exists
//           const defaultOrder = space.snippets
//             .sort((a: Snippet, b: Snippet) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
//             .map((snippet: Snippet) => snippet.id);
//           setSnippetOrder(defaultOrder);
//         }
//       }
      
//     } catch (error) {
//       console.error("HTTP: Failed to fetch space data:", error);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const addSnippet = async () => {
//     const newSnippetData = {
//       title: `Test Snippet ${Date.now()}`,
//       description: "Test description",
//       code: "console.log('Hello World');",
//       tags: ["test", "demo"],
//       color: "bg-blue-400",
//       x: Math.round(Math.random() * 400 + 200),
//       y: Math.round(Math.random() * 400 + 200),
//       spaceId: spaceId
//     };

//     try {
//       console.log('Creating snippet via HTTP...', newSnippetData);
//       const response = await apiRequest(`/space/${spaceId}/snippet`, {
//         method: "POST",
//         body: JSON.stringify(newSnippetData)
//       });
//       console.log('Snippet created via HTTP:', response);

//       // Create a properly structured snippet object with all required fields
//       const createdSnippet: Snippet = {
//         id: response.snippet.id || `temp_${Date.now()}`,
//         title: response.snippet.title || newSnippetData.title,
//         description: response.snippet.description || newSnippetData.description,
//         code: response.snippet.code || newSnippetData.code,
//         tags: Array.isArray(response.snippet.tags) ? response.snippet.tags : (Array.isArray(newSnippetData.tags) ? newSnippetData.tags : []),
//         color: response.snippet.color || newSnippetData.color,
//         x: Math.round(response.snippet.x || newSnippetData.x),
//         y: Math.round(response.snippet.y || newSnippetData.y),
//         spaceId: response.snippet.spaceId || spaceId,
//         ownerId: response.snippet.ownerId || currentUser.id,
//         createdAt: response.snippet.createdAt ? new Date(response.snippet.createdAt) : new Date(),
//         updatedAt: response.snippet.updatedAt ? new Date(response.snippet.updatedAt) : new Date()
//       };

//       // Update local state immediately
//       setSnippets(prev => {
//         const exists = prev.some(s => s.id === createdSnippet.id);
//         if (exists) return prev; // Prevent duplicates
//         return [...prev, createdSnippet];
//       });
      
//       // Add to the end of the order and update backend
//       const newOrder = [...snippetOrder, createdSnippet.id];
//       setSnippetOrder(newOrder);
//       await updateSnippetOrder(newOrder);

//       // Also broadcast via WebSocket
//       if (sendSnippetCreate && isJoined) {
//         console.log('Broadcasting snippet creation via WebSocket...');
//         await sendSnippetCreate({
//           title: createdSnippet.title,
//           description: createdSnippet.description,
//           code: createdSnippet.code,
//           tags: createdSnippet.tags,
//           color: createdSnippet.color,
//           x: Math.round(createdSnippet.x),
//           y: Math.round(createdSnippet.y)
//         });
//       }
//     } catch (error) {
//       console.error("HTTP: Failed to create snippet:", error);
//     }
//   };

//   const updateSnippet = async (id: string, updates: Partial<Snippet>) => {
//     const currentSnippet = snippets.find(s => s.id === id);
//     if (!currentSnippet) return;

//     // Ensure x and y are integers if they exist in updates
//     const processedUpdates = {
//       ...updates,
//       ...(updates.x !== undefined && { x: Math.round(updates.x) }),
//       ...(updates.y !== undefined && { y: Math.round(updates.y) })
//     };

//     const updatedSnippet = { ...currentSnippet, ...processedUpdates, updatedAt: new Date() };

//     // Update local state immediately
//     setSnippets(prev => prev.map(s => s.id === id ? updatedSnippet : s));

//     try {
//       console.log('Updating snippet via HTTP...', { id, updates: processedUpdates });
//       const response = await apiRequest(`/space/${spaceId}/snippet/${id}`, {
//         method: "PUT",
//         body: JSON.stringify(processedUpdates)
//       });
//       console.log('Snippet updated via HTTP:', response);

//       // Broadcast via WebSocket
//       if (sendSnippetUpdate && isJoined) {
//         console.log('Broadcasting snippet update via WebSocket...');
//         await sendSnippetUpdate({
//           snippetId: id,
//           title: processedUpdates.title,
//           description: processedUpdates.description,
//           code: processedUpdates.code,
//           tags: processedUpdates.tags,
//           color: processedUpdates.color
//         });
//       }
//     } catch (error) {
//       console.error("HTTP: Failed to update snippet:", error);
//     }
//   };

//   const moveSnippet = async (id: string, x: number, y: number) => {
//     const currentSnippet = snippets.find(s => s.id === id);
//     if (!currentSnippet) return;

//     // Ensure coordinates are integers
//     const intX = Math.round(x);
//     const intY = Math.round(y);

//     // Update position immediately for responsive UI
//     setSnippets(prev => prev.map(s =>
//       s.id === id ? { ...s, x: intX, y: intY, updatedAt: new Date() } : s
//     ));

//     // Broadcast movement via WebSocket immediately
//     if (sendSnippetMove && isJoined) {
//       console.log('Broadcasting snippet movement via WebSocket...', { id, x: intX, y: intY });
//       try {
//         await sendSnippetMove({
//           snippetId: id,
//           x: intX,
//           y: intY
//         });
//       } catch (error) {
//         console.error('WebSocket: Failed to broadcast snippet movement:', error);
//       }
//     }

//     // Also update via HTTP (debounced in real app)
//     try {
//       console.log('Updating snippet position via HTTP...', { id, x: intX, y: intY });
//       await apiRequest(`/space/${spaceId}/snippet/${id}`, {
//         method: "PUT",
//         body: JSON.stringify({ x: intX, y: intY })
//       });
//       console.log('Snippet position updated via HTTP');
//     } catch (error) {
//       console.error("HTTP: Failed to update snippet position:", error);
//     }
//   };

//   const deleteSnippet = async (id: string) => {
//     // Remove from local state immediately
//     setSnippets(prev => prev.filter(s => s.id !== id));
//     const newOrder = snippetOrder.filter(snippetId => snippetId !== id);
//     setSnippetOrder(newOrder);

//     try {
//       console.log('Deleting snippet via HTTP...', id);
//       await apiRequest(`/space/${spaceId}/snippet/${id}`, { method: "DELETE" });
//       console.log('Snippet deleted via HTTP');
      
//       // Update order in backend
//       await updateSnippetOrder(newOrder);
      
//       // Broadcast via WebSocket
//       if (sendSnippetDelete && isJoined) {
//         console.log('Broadcasting snippet deletion via WebSocket...');
//         await sendSnippetDelete({ snippetId: id });
//       }
//     } catch (error) {
//       console.error("HTTP: Failed to delete snippet:, this might also happen if ws delete was successfull through ws", error);
//     }
//   };

//   const reorderSnippets = async (startIndex: number, endIndex: number) => {
//     const newOrder = [...snippetOrder];
//     const [removed] = newOrder.splice(startIndex, 1);
//     newOrder.splice(endIndex, 0, removed);
    
//     // Update local state immediately for better UX
//     setSnippetOrder(newOrder);
    
//     // Update backend
//     await updateSnippetOrder(newOrder);
//   };

//   const updateSnippetOrder = async (newOrder: string[]) => {
//     try {
//       console.log('Updating snippet order via HTTP...', newOrder);
//       await apiRequest(`/space/${spaceId}/order`, {
//         method: "PUT",
//         body: JSON.stringify({ order: newOrder })
//       });
//       console.log('Snippet order updated via HTTP');
//     } catch (error) {
//       console.error("HTTP: Failed to update order:", error);
//       // Revert order on failure
//       fetchSpaceData();
//     }
//   };

//   // Utility functions to get ordered snippets
//   const getOrderedSnippets = () => {
//     if (!snippetOrder.length) return snippets;
    
//     // Create a map for quick lookup
//     const snippetMap = new Map(snippets.map(snippet => [snippet.id, snippet]));
    
//     // Get ordered snippets, filtering out any IDs that don't have corresponding snippets
//     const orderedSnippets = snippetOrder
//       .map(id => snippetMap.get(id))
//       .filter((snippet): snippet is Snippet => snippet !== undefined);
    
//     // Add any snippets that aren't in the order array (shouldn't happen, but just in case)
//     const orderedIds = new Set(snippetOrder);
//     const unorderedSnippets = snippets.filter(snippet => !orderedIds.has(snippet.id));
    
//     return [...orderedSnippets, ...unorderedSnippets];
//   };

//   const getAllTags = () => {
//     const tagSet = new Set<string>();
//     snippets.forEach(snippet => {
//       snippet.tags?.forEach(tag => tagSet.add(tag));
//     });
//     return Array.from(tagSet).sort();
//   };

//   const toggleTagFilter = (tag: string) => {
//     setTagFilters(prev => {
//       const newFilters = new Set(prev);
//       if (newFilters.has(tag)) {
//         newFilters.delete(tag);
//       } else {
//         newFilters.add(tag);
//       }
//       return newFilters;
//     });
//   };

//   const clearAllFilters = () => {
//     setTagFilters(new Set());
//     setSearchQuery("");
//   };

//   // Filter snippets while preserving order
//   const filteredSnippets = getOrderedSnippets().filter(snippet => {
//     const matchesSearch = !searchQuery.trim() || 
//       snippet.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
//       snippet.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
//       snippet.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
//     const matchesFilters = tagFilters.size === 0 || 
//       snippet.tags.some(tag => tagFilters.has(tag));
    
//     return matchesSearch && matchesFilters;
//   });

//   // Get connection status display
//   const getConnectionStatus = () => {
//     if (isJoined) return { status: 'Connected', color: 'bg-green-100 text-green-800' };
//     if (isConnected) return { status: 'Connecting...', color: 'bg-yellow-100 text-yellow-800' };
//     if (lastError) return { status: `Error: ${lastError}`, color: 'bg-red-100 text-red-800' };
//     return { status: 'Disconnected', color: 'bg-red-100 text-red-800' };
//   };

//   const connectionStatus = getConnectionStatus();

//   return (
//     <div className="flex h-screen bg-gray-100">
//       {/* Sidebar */}
//       {sidebarOpen && (
//         <div className="w-80 bg-white border-r border-gray-200">
//           <Sidebar 
//             snippets={getOrderedSnippets()}
//             filteredSnippets={filteredSnippets}
//             snippetOrder={snippetOrder}
//             searchQuery={searchQuery}
//             tagFilters={tagFilters}
//             getAllTags={getAllTags}
//             onSearchChange={setSearchQuery}
//             onToggleTagFilter={toggleTagFilter}
//             onClearAllFilters={clearAllFilters}
//             onReorderSnippets={reorderSnippets}
//             onUpdateSnippet={updateSnippet}
//             onDeleteSnippet={deleteSnippet}
//           />
//         </div>
//       )}

//       {/* Main Content */}
//       <div className="flex-1 flex flex-col">
//         {/* Header */}
//         <div className="bg-white border-b border-gray-200 p-4">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center gap-4">
//               <button
//                 onClick={() => setSidebarOpen(!sidebarOpen)}
//                 className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200"
//               >
//                 {sidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
//               </button>
              
//               <div className="flex items-center gap-2">
//                 <h1 className="text-lg font-semibold">
//                   {spaceData?.name || 'Test Space'}
//                 </h1>
//                 {isLoading && <span className="text-sm text-gray-500">Loading...</span>}
//               </div>
//             </div>

//             <div className="flex items-center gap-2">
//               {/* WebSocket Status */}
//               <div className={`px-3 py-1 rounded text-sm ${connectionStatus.color}`}>
//                 WS: {connectionStatus.status}
//               </div>

//               {/* User Permissions */}
//               {userPermissions && (
//                 <div className="px-3 py-1 rounded text-sm bg-blue-100 text-blue-800">
//                   {userPermissions.isOwner ? 'Owner' : userPermissions.userRole || 'User'}
//                 </div>
//               )}

//               <button
//                 onClick={addSnippet}
//                 className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
//                 disabled={!userPermissions?.allowed}
//               >
//                 Add Snippet
//               </button>

//               <button
//                 onClick={fetchSpaceData}
//                 className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
//               >
//                 Refresh Data
//               </button>
//             </div>
//           </div>
//         </div>

//         {/* Canvas Area */}
//         <div className="flex-1 p-8 overflow-auto">
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//             {filteredSnippets.map(snippet => (
//               <div
//                 key={snippet.id}
//                 className={`p-4 rounded-lg shadow-md cursor-move ${snippet.color} transition-all duration-200`}
//                 onClick={() => {
//                   // Test movement
//                   const newX = Math.round(snippet.x + Math.random() * 100 - 50);
//                   const newY = Math.round(snippet.y + Math.random() * 100 - 50);
//                   moveSnippet(snippet.id, newX, newY);
//                 }}
//               >
//                 <div className="flex justify-between items-start mb-2">
//                   <h3 className="font-semibold text-white">{snippet.title}</h3>
//                   <button
//                     onClick={(e) => {
//                       e.stopPropagation();
//                       deleteSnippet(snippet.id);
//                     }}
//                     className="text-white hover:text-red-200 text-sm"
//                     disabled={!userPermissions?.allowed}
//                   >
//                     ×
//                   </button>
//                 </div>
                
//                 {snippet.description && (
//                   <p className="text-white text-sm mb-2 opacity-90">{snippet.description}</p>
//                 )}
                
//                 <div className="flex flex-wrap gap-1 mb-2">
//                   {snippet.tags?.map(tag => (
//                     <span
//                       key={tag}
//                       className="px-2 py-1 bg-white bg-opacity-20 rounded text-xs text-white"
//                     >
//                       {tag}
//                     </span>
//                   ))}
//                 </div>

//                 <div className="text-xs text-white opacity-75">
//                   Position: ({Math.round(snippet.x)}, {Math.round(snippet.y)})
//                 </div>

//                 <div className="mt-2 pt-2 border-t border-white border-opacity-20">
//                   <button
//                     onClick={(e) => {
//                       e.stopPropagation();
//                       updateSnippet(snippet.id, {
//                         title: `Updated ${Date.now()}`,
//                         description: "Updated via test button"
//                       });
//                     }}
//                     className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded text-white hover:bg-opacity-30"
//                     disabled={!userPermissions?.allowed}
//                   >
//                     Test Update
//                   </button>
//                 </div>
//               </div>
//             ))}
//           </div>

//           {filteredSnippets.length === 0 && (
//             <div className="text-center py-12">
//               <div className="text-gray-500 mb-4">No snippets found</div>
//               <button
//                 onClick={addSnippet}
//                 className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
//                 disabled={!userPermissions?.allowed}
//               >
//                 Create First Snippet
//               </button>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }