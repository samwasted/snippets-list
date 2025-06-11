// Base enums matching Prisma schema
export type UserRole = 'USER' | 'ADMIN';
export type Role = 'VIEWER' | 'EDITOR' | 'ADMIN';
export type CollaboratorRole = 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';

// Core data models matching Prisma schema exactly
export interface User {
    id: string;
    username: string;
    role: UserRole;
    name: string | null;
    password: string | null;
    createdAt: Date;
}

export interface Space {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    ownerId: string;
    isPublic: boolean;
    totalViews: number;
    description: string | null;
    order: string[];
}

export interface Snippet {
    id: string;
    title: string;
    description: string | null;
    code: string | null;
    tags: string[];
    color: string | null;
    files: string[];
    createdAt: Date;
    updatedAt: Date;
    ownerId: string;
    spaceId: string | null;
    x: number;
    y: number;
    totalViews: number;
}

export interface SpaceCollaborator {
    id: string;
    spaceId: string;
    userId: string;
    role: Role;
}

export interface SpaceView {
    id: string;
    spaceId: string;
    userId: string | null;
    viewedAt: Date;
    ipAddress: string | null;
    userAgent: string | null;
}

export interface SnippetView {
    id: string;
    snippetId: string;
    userId: string | null;
    viewedAt: Date;
    ipAddress: string | null;
    userAgent: string | null;
}

// SnippetData interface - FIXED to use null types
export interface SnippetData {
    id: string;
    title: string;
    description: string | null;  // Changed from description?: string
    code: string | null;         // Changed from code?: string
    tags: string[];
    color: string | null;        // Changed from color?: string
    files: string[];
    x: number;
    y: number;
    totalViews: number;
    createdAt: Date;
    updatedAt: Date;
    ownerId: string;
    spaceId: string | null;      // Added this field
}

// Extended interfaces for API responses
export interface SpaceWithRelations {
    id: string;
    name: string;
    ownerId: string;
    isPublic: boolean;
    totalViews: number;
    description: string | null;  // Changed from description?: string
    createdAt: Date;
    updatedAt: Date;
    order: string[];
    snippets: SnippetData[];     // Now uses updated SnippetData
    owner: {
        id: string;
        username: string;
        name: string | null;     // Changed from name?: string
    };
    collaborators: Array<{
        role: Role;
        userId: string;
        user?: {
            id: string;
            username: string;
            name: string | null; // Changed from name?: string
        };
    }>;
}

export interface SpaceAccess {
    space: SpaceWithRelations;
    role: CollaboratorRole;
}

// WebSocket connection types
export interface ConnectedUser {
    id: string;
    userId: string | null;
    role: CollaboratorRole | null;
}

// Input types for operations
export interface SnippetCreateInput {
    title: string;
    description: string | null;
    code: string | null;
    tags: string[];
    color: string | null;
    files: string[];
    x: number;
    y: number;
}

export interface SnippetUpdateInput {
    title?: string;
    description?: string | null;
    code?: string | null;
    tags?: string[];
    color?: string | null;
    files?: string[];
    x?: number;
    y?: number;
}

// WebSocket message types
export type IncomingMessage =
    | { type: "join"; payload: { spaceId: string; token: string } }
    | { type: "snippet-move"; payload: { snippetId: string; x: number; y: number } }
    | { type: "snippet-create"; payload: SnippetCreateInput }
    | { type: "snippet-update"; payload: { snippetId: string; [key: string]: any } }
    | { type: "snippet-delete"; payload: { snippetId: string } }
    | { type: "ping"; payload?: { timestamp?: string } };

export interface BaseMessage {
    userId?: string;
    messageId?: string;
    timestamp?: string;
}

export type OutgoingMessage = BaseMessage & (
    | { type: "space-joined"; payload: { space: SpaceWithRelations; userRole: CollaboratorRole; users: ConnectedUser[] } }
    | { type: "join-rejected"; payload: { message: string } }
    | { type: "snippet-moved"; payload: { id: string; snippetId: string; x: number; y: number; updatedAt: string; movedBy: string } }
    | { type: "snippet-move-confirmed"; payload: { snippetId: string; x: number; y: number } }
    | { type: "snippet-move-rejected"; payload: { snippetId: string; message: string } }
    | { type: "snippet-created"; payload: { 
        id: string; 
        snippetId: string; 
        title: string; 
        description: string | null; 
        code: string | null; 
        tags: string[]; 
        color: string | null; 
        files: string[]; 
        x: number; 
        y: number; 
        spaceId: string; 
        ownerId: string; 
        createdAt: string; 
        updatedAt: string; 
        createdBy: string 
    } }
    | { type: "snippet-create-rejected"; payload: { message: string } }
    | { type: "snippet-updated"; payload: { 
        id: string; 
        snippetId: string; 
        title: string; 
        description: string | null; 
        code: string | null; 
        tags: string[]; 
        color: string | null; 
        files: string[]; 
        x: number; 
        y: number; 
        updatedAt: string; 
        updatedBy: string 
    } }
    | { type: "snippet-update-rejected"; payload: { snippetId: string; message: string } }
    | { type: "snippet-deleted"; payload: { id: string; snippetId: string; deletedBy: string } }
    | { type: "snippet-delete-rejected"; payload: { snippetId: string; message: string } }
    | { type: "user-joined"; payload: { id: string; userId: string; role: CollaboratorRole } }
    | { type: "user-left"; payload: { id: string; userId: string } }
    | { type: "error"; payload: { message: string } }
    | { type: "pong"; payload: { timestamp: string; originalTimestamp?: string } }
    | { type: "connection-established"; payload: { timestamp: string } }
);

// Utility types for WebSocket handlers
export interface WebSocketHandlerContext {
    userId: string;
    spaceId: string;
    userRole: CollaboratorRole;
}

export interface WebSocketError {
    code: string;
    message: string;
    details?: any;
}

// Database query result types
export type PrismaSpaceWithRelations = {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    ownerId: string;
    isPublic: boolean;
    totalViews: number;
    description: string | null;
    order: string[];
    snippets: Array<{
        id: string;
        title: string;
        description: string | null;
        code: string | null;
        tags: string[];
        color: string | null;
        files: string[];
        x: number;
        y: number;
        totalViews: number;
        createdAt: Date;
        updatedAt: Date;
        ownerId: string;
        spaceId: string | null;
    }>;
    owner: {
        id: string;
        username: string;
        name: string | null;
    };
    collaborators: Array<{
        role: Role;
        userId: string;
        user: {
            id: string;
            username: string;
            name: string | null;
        };
    }>;
};

// Type guards for runtime type checking
export function isValidRole(role: string): role is Role {
    return ['VIEWER', 'EDITOR', 'ADMIN'].includes(role);
}

export function isValidUserRole(role: string): role is UserRole {
    return ['USER', 'ADMIN'].includes(role);
}

export function isValidCollaboratorRole(role: string): role is CollaboratorRole {
    return ['OWNER', 'ADMIN', 'EDITOR', 'VIEWER'].includes(role);
}
