// Core Entity Types
export type Snippet = {
  id: string;
  title: string;
  description?: string;
  code?: string;
  tags: string[];
  color: string;
  files: string[]; // File paths/names, not File objects
  x: number;
  y: number;
  totalViews: number;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
  spaceId: string | null;
};

export type Space = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
  isPublic: boolean;
  totalViews: number;
  description: string | null;
  order: string[]; // Snippet IDs for sidebar order
};

export type User = {
  id: string;
  username: string;
  name: string | null;
  role: 'USER' | 'ADMIN';
  createdAt: Date;
};

export type SpaceCollaborator = {
  id: string;
  spaceId: string;
  userId: string;
  role: 'VIEWER' | 'EDITOR' | 'ADMIN';
  user: User;
};

// UI State Types
export type TagColorMenuState = {
  show: boolean;
  tag: string;
  x: number;
  y: number;
};

// Color Constants
export const colors = [
  "bg-red-400", "bg-green-400", "bg-blue-400", "bg-yellow-400", 
  "bg-purple-400", "bg-pink-400", "bg-indigo-400", "bg-teal-400",
  "bg-orange-400", "bg-cyan-400"
];

export const colorNames = {
  "bg-red-400": "Red",
  "bg-green-400": "Green", 
  "bg-blue-400": "Blue",
  "bg-yellow-400": "Yellow",
  "bg-purple-400": "Purple",
  "bg-pink-400": "Pink",
  "bg-indigo-400": "Indigo",
  "bg-teal-400": "Teal",
  "bg-orange-400": "Orange",
  "bg-cyan-400": "Cyan"
};

// WebSocket Message Types - Incoming (Backend to Frontend)
export interface IncomingSnippetMovedMessage {
  type: 'snippet-moved';
  payload: {
    snippetId: string;
    x: number;
    y: number;
    updatedAt?: string;
    movedBy?: string;
  };
}

export interface IncomingSnippetCreatedMessage {
  type: 'snippet-created';
  payload: {
    id: string;
    title: string;
    description?: string;
    code?: string;
    tags: string[];
    color: string;
    files: string[];
    x: number;
    y: number;
    totalViews: number;
    createdAt?: string;
    updatedAt?: string;
    ownerId?: string;
    spaceId?: string;
  };
}

export interface IncomingSnippetDeletedMessage {
  type: 'snippet-deleted';
  payload: {
    snippetId: string;
  };
}

export interface IncomingSnippetUpdatedMessage {
  type: 'snippet-updated';
  payload: {
    id: string;
    title?: string;
    description?: string;
    code?: string;
    tags?: string[];
    color?: string;
    files?: string[];
    x?: number;
    y?: number;
    updatedAt?: string;
  };
}

export interface UserJoinedMessage {
  type: 'user-joined';
  payload: {
    userId: string;
  };
}

export interface UserLeftMessage {
  type: 'user-left';
  payload: {
    userId: string;
  };
}

export interface SpaceJoinedMessage {
  type: 'space-joined';
  payload: any;
}

export interface JoinRejectedMessage {
  type: 'join-rejected';
  payload: any;
}

export interface ErrorMessage {
  type: 'error';
  payload: any;
}
export interface ConnectionEstablishedMessage {
  type: 'connection-established';
  payload: {
    connectionId?: string;
  };
}
export type IncomingMessage = 
  | IncomingSnippetMovedMessage
  | IncomingSnippetCreatedMessage
  | IncomingSnippetDeletedMessage
  | IncomingSnippetUpdatedMessage
  | UserJoinedMessage
  | UserLeftMessage
  | SpaceJoinedMessage
  | JoinRejectedMessage
  | ErrorMessage
  | ConnectionEstablishedMessage
  | { type: "ping"; payload: any }
  | { type: "pong"; payload: any };

// export type WebSocketMessage = 
//   | IncomingSnippetMovedMessage
//   | IncomingSnippetCreatedMessage
//   | IncomingSnippetDeletedMessage
//   | IncomingSnippetUpdatedMessage
//   | UserJoinedMessage
//   | UserLeftMessage
//   | SpaceJoinedMessage
//   | JoinRejectedMessage
//   | ErrorMessage;
// WebSocket Hook Types - Based on your Space component usage
export interface UseSpaceWebSocketOptions {
  spaceId?: string;
  userId?: string;
  token?: string;
  enabled?: boolean;
}

export interface UseSpaceWebSocketReturn {
  isConnected: boolean;
  isJoined: boolean;
  lastMessage: IncomingMessage | null;
  
  // Method signatures matching your Space component usage
  sendSnippetMove: (payload: {
    snippetId: string;
    x: number;
    y: number;
  }) => void;
  
  sendSnippetCreate: (snippet: {
    id?: string;
    title: string;
    description?: string;
    code?: string;
    tags?: string[];
    color?: string;
    files?: string[];
    x: number;
    y: number;
    createdAt?: string;
    updatedAt?: string;
  }) => void;
  
  sendSnippetDelete: (payload: {
    snippetId: string;
  }) => void;
  
  sendSnippetUpdate: (snippet: {
    id?: string;
    title?: string;
    description?: string;
    code?: string;
    tags?: string[];
    color?: string;
    files?: string[];
    x?: number;
    y?: number;
    updatedAt?: string;
  }) => void;
  
  reconnect: () => void;
  joinSpace: (token: string) => void;
}

// Space API Response Types
export interface SpaceWithSnippets extends Space {
  snippets: Snippet[];
  owner?: {
    id: string;
    username: string;
    name: string | null;
  };
}

// Component Props Types
export interface SpaceProps {
  spaceData?: Space;
  initialSnippets?: Snippet[];
  currentUser?: User;
  collaborators?: SpaceCollaborator[];
  authToken?: string;
}

// Utility Types
export type CollaboratorRole = 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';

// Legacy Types (kept for backward compatibility)
export type Box = {
  id: string;
  x: number;
  y: number;
  code: string;
  codeLanguage: string;
  color: string;
  label: string;
  description: string;
  tags: string[];
  files?: string[];
  totalViews: number;
  createdAt: string;
  updatedAt: string;
  text: string
};

export type Collaborator = {
  id: string;
  user: User;
  role: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
  createdAt: string;
};

// Connection State Types
export interface WebSocketState {
  isConnected: boolean;
  isJoined: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  lastError?: string;
}

export interface ConnectionStatus {
  connected: boolean;
  joined: boolean;
  authenticating: boolean;
  error?: string;
  lastMessageAt?: Date;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
}

// Event Handler Types
export type MessageHandler<T = any> = (message: T) => void;
export type ErrorHandler = (error: string) => void;
export type ConnectionHandler = (connected: boolean) => void;

// Message Filter Types
export type MessageType = IncomingMessage['type'];
export type MessageFilter = MessageType | MessageType[];

// Utility Types for Message Payloads
export type PayloadFor<T extends MessageType> = Extract<IncomingMessage, { type: T }>['payload'];

// Outgoing WebSocket Message Types (Frontend to Backend)
export interface OutgoingJoinMessage {
  type: 'join';
  payload: {
    spaceId?: string;
    userId?: string;
    token: string;
  };
}

export interface OutgoingSnippetMoveMessage {
  type: 'snippet-move';
  payload: {
    snippetId: string;
    x: number;
    y: number;
  };
}

export interface OutgoingSnippetCreateMessage {
  type: 'snippet-create';
  payload: {
    id?: string;
    title: string;
    description?: string;
    code?: string;
    tags?: string[];
    color?: string;
    files?: string[];
    x: number;
    y: number;
    createdAt?: string;
    updatedAt?: string;
  };
}

export interface OutgoingSnippetDeleteMessage {
  type: 'snippet-delete';
  payload: {
    snippetId: string;
  };
}

export interface OutgoingSnippetUpdateMessage {
  type: 'snippet-update';
  payload: {
    id?: string;
    title?: string;
    description?: string;
    code?: string;
    tags?: string[];
    color?: string;
    files?: string[];
    x?: number;
    y?: number;
    updatedAt?: string;
  };
}

export type OutgoingMessage = 
  | OutgoingJoinMessage
  | OutgoingSnippetMoveMessage
  | OutgoingSnippetCreateMessage
  | OutgoingSnippetDeleteMessage
  | OutgoingSnippetUpdateMessage;

// Combined WebSocket Message Type (for use in hooks/components)
export type WebSocketMessage = IncomingMessage | OutgoingMessage;

// Type guards for message types
export function isIncomingMessage(message: WebSocketMessage): message is IncomingMessage {
  return ['snippet-moved', 'snippet-created', 'snippet-deleted', 'snippet-updated', 
          'user-joined', 'user-left', 'space-joined', 'join-rejected', 'error'].includes(message.type);
}

export function isOutgoingMessage(message: WebSocketMessage): message is OutgoingMessage {
  return ['join', 'snippet-move', 'snippet-create', 'snippet-delete', 'snippet-update'].includes(message.type);
}