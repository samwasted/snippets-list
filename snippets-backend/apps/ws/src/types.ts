// Incoming messages
export type IncomingMessage = 
  | { type: "join"; payload: { spaceId: string; token: string } }
  | { type: "snippet-move"; payload: { snippetId: string; x: number; y: number } }
  | { type: "snippet-create"; payload: { 
      title: string; 
      description?: string; 
      code?: string; 
      tags?: string[]; 
      color?: string; 
      files?: string[]; 
      x: number; 
      y: number; 
    } }
  | { type: "snippet-update"; payload: { snippetId: string; [key: string]: any } }
  | { type: "snippet-delete"; payload: { snippetId: string } }

// Outgoing messages
export type OutgoingMessage = 
  | { type: "space-joined"; payload: { space: any; userRole: string; users: any[] } }
  | { type: "join-rejected"; payload: { message: string } }
  | { type: "snippet-moved"; payload: { snippetId: string; x: number; y: number; movedBy: string } }
  | { type: "snippet-move-confirmed"; payload: { snippetId: string; x: number; y: number } }
  | { type: "snippet-move-rejected"; payload: { snippetId: string; message: string } }
  | { type: "snippet-created"; payload: { snippet: any; createdBy: string } }
  | { type: "snippet-create-rejected"; payload: { message: string } }
  | { type: "snippet-updated"; payload: { snippet: any; updatedBy: string } }
  | { type: "snippet-update-rejected"; payload: { snippetId: string; message: string } }
  | { type: "snippet-deleted"; payload: { snippetId: string; deletedBy: string } }
  | { type: "snippet-delete-rejected"; payload: { snippetId: string; message: string } }
  | { type: "user-joined"; payload: { id: string; userId: string; role: string } }
  | { type: "user-left"; payload: { id: string; userId: string } }
  | { type: "error"; payload: { message: string } }
  | {type: "connection-established"; payload: any} //for da fix
  | {type: "ping"; payload: any} //for da fix
  | { type: "snippet-create-confirmed"; payload: any} //for da fix

// Additional types for better type safety
// Using the Role enum from Prisma schema, plus OWNER for space owners
export type CollaboratorRole = 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';

export interface SpaceAccess {
  space: {
    id: string;
    name: string;
    ownerId: string;
    isPublic: boolean;
    totalViews: number;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
    snippets?: Array<{
      id: string;
      title: string;
      description?: string;
      code?: string;
      tags: string[];
      color?: string;
      files: string[];
      x: number;
      y: number;
      totalViews: number;
      createdAt: Date;
      updatedAt: Date;
    }>;
    owner?: {
      id: string;
      username: string;
      name?: string;
    };
    collaborators: Array<{
      role: 'VIEWER' | 'EDITOR' | 'ADMIN';
      userId: string;
    }>;
  };
  role: CollaboratorRole;
}

export interface ConnectedUser {
  id: string;
  userId?: string;
  role?: CollaboratorRole;
}

export interface SnippetData {
  id: string;
  title: string;
  description?: string;
  code?: string;
  tags: string[];
  color?: string;
  files: string[];
  x: number;
  y: number;
  totalViews: number;
  createdAt: Date;
  updatedAt: Date;
}