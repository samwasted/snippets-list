import { WebSocket } from "ws";
import { RoomManager } from "./RoomManager";
import { 
    OutgoingMessage, 
    CollaboratorRole, 
    SpaceAccess,
    SnippetData,
    SpaceWithRelations,
    ConnectedUser
} from "./types";
import client from "@repo/db";
import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_PASSWORD } from "./config";

function getRandomString(length: number): string {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

export class User {
    public id: string;
    public userId: string | null = null;
    private spaceId: string | null = null;
    private ws: WebSocket;
    private userRole: CollaboratorRole | null = null;
    // private userRole: "ADMIN"
    private routeSpaceId: string | undefined;

    constructor(ws: WebSocket, routeSpaceId?: string) {
        this.id = getRandomString(10);
        this.ws = ws;
        this.routeSpaceId = routeSpaceId;
        this.initHandlers();
        if (routeSpaceId) {
            console.log(`WebSocket connection initialized for space: ${routeSpaceId}`);
        }
    }

    public getRouteSpaceId(): string | undefined {
        return this.routeSpaceId;
    }

    public getUserRole(): CollaboratorRole | null {
        return this.userRole;
    }

    private async checkSpaceAccess(
        spaceId: string,
        userId: string,
        requiredRole: 'VIEWER' | 'EDITOR' | 'ADMIN' = 'VIEWER'
    ): Promise<SpaceAccess | null> {
        try {
            const space = await client.space.findUnique({
                where: { id: spaceId },
                include: {
                    collaborators: {
                        where: { userId },
                        select: {
                            role: true
                        }
                    },
                    snippets: true // Add this line to include snippets
                }
            });

            if (!space) return null;

            if (space.ownerId === userId) {
                const owner = await client.user.findUnique({
                    where: { id: space.ownerId },
                    select: { id: true, username: true, name: true }
                });

                if (!owner) {
                    // If owner is not found, reject access
                    return null;
                }
                const fixedSpace = {
                    ...space,
                    description: space.description,
                    collaborators: space.collaborators.map(c => ({
                        role: c.role,
                        userId: userId
                    })),
                    snippets: space.snippets ?? [],
                    owner: owner
                };
                return { space: fixedSpace, role: 'OWNER' as CollaboratorRole };
            }

            if (space.isPublic && requiredRole === 'VIEWER') {
                const owner = await client.user.findUnique({
                    where: { id: space.ownerId },
                    select: { id: true, username: true, name: true }
                });

                if (!owner) {
                    // If owner is not found, reject access
                    return null;
                }

                const fixedSpace = {
                    ...space,
                    description: space.description,
                    collaborators: space.collaborators.map(c => ({
                        role: c.role,
                        userId: userId
                    })),
                    snippets: space.snippets ?? [],
                    owner: owner
                };
                return { space: fixedSpace, role: 'VIEWER' as CollaboratorRole };
            }

            const collaboration = space.collaborators[0];
            if (!collaboration) return null;

            const roleHierarchy = { 'VIEWER': 1, 'EDITOR': 2, 'ADMIN': 3 };
            const role = collaboration.role as keyof typeof roleHierarchy;
            // const hasPermission = roleHierarchy[role] >= roleHierarchy[requiredRole];
            const hasPermission = 1 //give all of them permssion, temporary fix
            if (hasPermission) {
                const owner = await client.user.findUnique({
                    where: { id: space.ownerId },
                    select: { id: true, username: true, name: true }
                });

                if (!owner) {
                    // If owner is not found, reject access
                    return null;
                }

                const fixedSpace = {
                    ...space,
                    description: space.description,
                    collaborators: space.collaborators.map(c => ({
                        role: c.role,
                        userId: userId
                    })),
                    snippets: space.snippets ?? [],
                    owner: owner
                };
                return { space: fixedSpace, role: collaboration.role as CollaboratorRole };
            }
            return null;
        } catch (error) {
            console.error("Error checking space access:", error);
            return null;
        }
    }

    private generateMessageId(type: string): string {
        return `${type}_${Date.now()}_${Math.random()}_${this.userId || 'unknown'}`;
    }

    private initHandlers(): void {
        this.ws.on("message", async (data) => {
            try {
                const parsedData = JSON.parse(data.toString());
                console.log("Received message:", parsedData);

                switch (parsedData.type) {
                    case "join":
                        await this.handleJoin(parsedData.payload);
                        break;
                    case "snippet-move":
                        await this.handleSnippetMove(parsedData.payload);
                        break;
                    case "snippet-create":
                        await this.handleSnippetCreate(parsedData.payload);
                        break;
                    case "snippet-update":
                        await this.handleSnippetUpdate(parsedData.payload);
                        break;
                    case "snippet-delete":
                        await this.handleSnippetDelete(parsedData.payload);
                        break;
                    case "ping":
                        this.send({
                            type: "pong",
                            payload: {
                                timestamp: new Date().toISOString(),
                                originalTimestamp: parsedData.payload?.timestamp
                            }
                        });
                        break;
                    default:
                        console.log("Unknown message type:", parsedData.type);
                }
            } catch (error) {
                console.error("Error parsing message:", error);
                this.send({
                    type: "error",
                    payload: {
                        message: "Invalid message format"
                    }
                });
            }
        });

        this.ws.on("close", () => {
            this.destroy();
        });

        // Send connection established message
        this.send({
            type: "connection-established",
            payload: {
                timestamp: new Date().toISOString()
            }
        });
    }

    private async handleJoin(payload: { spaceId: string; token: string }): Promise<void> {
        try {
            const spaceId = this.routeSpaceId || payload.spaceId;
            if (!spaceId) {
                this.send({
                    type: "join-rejected",
                    payload: {
                        message: "No space ID provided"
                    }
                });
                this.ws.close();
                return;
            }

            if (this.routeSpaceId && payload.spaceId && payload.spaceId !== this.routeSpaceId) {
                this.send({
                    type: "join-rejected",
                    payload: {
                        message: "Space ID mismatch with connection route"
                    }
                });
                this.ws.close();
                return;
            }

            const { token } = payload;
            const decoded = jwt.verify(token, process.env.JWT_PASSWORD || JWT_PASSWORD) as { userId: string, role: string };
            const userId = decoded.userId;

            if (!userId) {
                this.send({
                    type: "join-rejected",
                    payload: {
                        message: "Authentication failed - invalid token"
                    }
                });
                this.ws.close();
                return;
            }

            const user = await client.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    username: true,
                    name: true,
                    role: true
                }
            });

            if (!user) {
                this.send({
                    type: "join-rejected",
                    payload: {
                        message: "User not found"
                    }
                });
                this.ws.close();
                return;
            }

            const access = await this.checkSpaceAccess(spaceId, userId);
            if (!access) {
                this.send({
                    type: "join-rejected",
                    payload: {
                        message: "Space not found or access denied"
                    }
                });
                this.ws.close();
                return;
            }

            this.userId = userId;
            this.spaceId = spaceId;
            this.userRole = "OWNER";

            RoomManager.getInstance().addUser(spaceId, this);

            const spaceData = await client.space.findUnique({
                where: { id: spaceId },
                include: {
                    snippets: {
                        select: {
                            id: true,
                            title: true,
                            description: true,
                            code: true,
                            tags: true,
                            color: true,
                            files: true,
                            x: true,
                            y: true,
                            totalViews: true,
                            createdAt: true,
                            updatedAt: true,
                            ownerId: true,
                            spaceId: true
                        }
                    },
                    owner: {
                        select: { id: true, username: true, name: true }
                    }
                }
            });

            const otherUsers = RoomManager.getInstance().getUsers(spaceId)
                ?.filter(u => u.id !== this.id)
                ?.map(u => ({
                    id: u.id,
                    userId: u.userId,
                    role: u.getUserRole()
                })) ?? [];

            this.send({
                type: "space-joined",
                payload: {
                    space: spaceData as unknown as SpaceWithRelations,
                    userRole: this.userRole,
                    users: otherUsers
                }
            });

            RoomManager.getInstance().broadcast({
                type: "user-joined",
                payload: {
                    id: this.id,
                    userId: this.userId,
                    role: this.userRole
                }
            }, this, this.spaceId);

            console.log(`User ${userId} joined space ${spaceId} with role ${this.userRole}`);

        } catch (error) {
            console.error("Error handling join:", error);

            let errorMessage = "Authentication failed";
            if (error instanceof jwt.JsonWebTokenError) {
                errorMessage = "Invalid token";
            } else if (error instanceof jwt.TokenExpiredError) {
                errorMessage = "Token expired";
            } else if (error instanceof jwt.NotBeforeError) {
                errorMessage = "Token not active";
            }

            this.send({
                type: "join-rejected",
                payload: {
                    message: errorMessage
                }
            });
            this.ws.close();
        }
    }
    
    private async handleSnippetMove(payload: { snippetId: string; x: number; y: number }): Promise<void> {
        if (!this.spaceId || !this.userId) {
            this.send({
                type: "error",
                payload: { message: "Not authenticated" }
            });
            return;
        }

        const access = await this.checkSpaceAccess(this.spaceId, this.userId, 'EDITOR');
        if (!access) {
            this.send({
                type: "snippet-move-rejected",
                payload: {
                    snippetId: payload.snippetId,
                    message: "Insufficient permissions"
                }
            });
            return;
        }

        try {
            // Database operation removed - HTTP server will handle this automatically

            // Broadcast to other users using payload data
            RoomManager.getInstance().broadcast({
                type: "snippet-moved",
                payload: {
                    id: payload.snippetId,
                    snippetId: payload.snippetId,
                    x: Math.round(payload.x),
                    y: Math.round(payload.y),
                    updatedAt: new Date().toISOString(),
                    movedBy: this.userId
                },
                userId: this.userId,
                messageId: this.generateMessageId("snippet-moved"),
                timestamp: new Date().toISOString()
            }, this, this.spaceId);

            // Send confirmation to the sender
            this.send({
                type: "snippet-move-confirmed",
                payload: {
                    snippetId: payload.snippetId,
                    x: Math.round(payload.x),
                    y: Math.round(payload.y)
                }
            });

        } catch (error) {
            console.error("Error processing snippet move:", error);
            this.send({
                type: "snippet-move-rejected",
                payload: {
                    snippetId: payload.snippetId,
                    message: "Failed to process snippet move"
                }
            });
        }
    }

    private async handleSnippetCreate(payload: {
        title: string;
        description?: string | null;
        code?: string | null;
        tags?: string[];
        color?: string | null;
        files?: string[];
        x: number;
        y: number;
    }): Promise<void> {
        if (!this.spaceId || !this.userId) {
            this.send({
                type: "error",
                payload: { message: "Not authenticated" }
            });
            return;
        }

        const access = await this.checkSpaceAccess(this.spaceId, this.userId, 'EDITOR');
        if (!access) {
            this.send({
                type: "snippet-create-rejected",
                payload: { message: "Insufficient permissions" }
            });
            return;
        }

        try {
            // Database operation removed - HTTP server will handle this automatically

            // Generate a temporary ID for immediate broadcasting
            const tempSnippetId = `temp-${this.generateMessageId("snippet")}`;
            const currentTime = new Date().toISOString();

            // Broadcast to other users using payload data
            RoomManager.getInstance().broadcast({
                type: "snippet-created",
                payload: {
                    id: tempSnippetId,
                    snippetId: tempSnippetId,
                    title: payload.title,
                    description: payload.description || null,
                    code: payload.code || null,
                    tags: payload.tags || [],
                    color: payload.color || 'bg-gray-400',
                    files: payload.files || [],
                    x: Math.round(payload.x),
                    y: Math.round(payload.y),
                    spaceId: this.spaceId || "",
                    ownerId: this.userId || "",
                    createdAt: currentTime,
                    updatedAt: currentTime,
                    createdBy: this.userId
                },
                userId: this.userId,
                messageId: this.generateMessageId("snippet-created"),
                timestamp: currentTime
            }, this, this.spaceId);

            // Send confirmation to the sender
            // this.send({
            //     type: "snippet-create-confirmed",
            //     payload: {
            //         snippetId: tempSnippetId,
            //         title: payload.title,
            //         x: Math.round(payload.x),
            //         y: Math.round(payload.y)
            //     }
            // });

        } catch (error) {
            console.error("Error processing snippet creation:", error);
            this.send({
                type: "snippet-create-rejected",
                payload: { message: "Failed to process snippet creation" }
            });
        }
    }

    private async handleSnippetUpdate(payload: { snippetId: string; [key: string]: any }): Promise<void> {
        if (!this.spaceId || !this.userId) {
            this.send({
                type: "error",
                payload: { message: "Not authenticated" }
            });
            return;
        }

        const access = await this.checkSpaceAccess(this.spaceId, this.userId, 'EDITOR');
        if (!access) {
            this.send({
                type: "snippet-update-rejected",
                payload: {
                    snippetId: payload.snippetId,
                    message: "Insufficient permissions"
                }
            });
            return;
        }

        try {
            // Database operation removed - HTTP server will handle this automatically

            const { snippetId, ...updateData } = payload;

            // Process numeric coordinates
            if (updateData.x !== undefined) updateData.x = Math.round(updateData.x);
            if (updateData.y !== undefined) updateData.y = Math.round(updateData.y);

            // Create broadcast payload with only the fields that are defined in updateData
            const broadcastPayload: any = {
                id: snippetId,
                snippetId: snippetId,
                updatedAt: new Date().toISOString(),
                updatedBy: this.userId
            };

            // Only include fields that are explicitly defined in updateData
            if (updateData.title !== undefined) broadcastPayload.title = updateData.title;
            if (updateData.description !== undefined) broadcastPayload.description = updateData.description;
            if (updateData.code !== undefined) broadcastPayload.code = updateData.code;
            if (updateData.tags !== undefined) broadcastPayload.tags = updateData.tags;
            if (updateData.color !== undefined) broadcastPayload.color = updateData.color;
            if (updateData.files !== undefined) broadcastPayload.files = updateData.files;
            if (updateData.x !== undefined) broadcastPayload.x = updateData.x;
            if (updateData.y !== undefined) broadcastPayload.y = updateData.y;

            // Broadcast to other users using payload data
            RoomManager.getInstance().broadcast({
                type: "snippet-updated",
                payload: broadcastPayload,
                userId: this.userId,
                messageId: this.generateMessageId("snippet-updated"),
                timestamp: new Date().toISOString()
            }, this, this.spaceId);

            // Send confirmation to the sender
            // this.send({
            //     type: "snippet-update-confirmed",
            //     payload: {
            //         snippetId: payload.snippetId,
            //         ...updateData
            //     }
            // });

        } catch (error) {
            console.error("Error processing snippet update:", error);
            this.send({
                type: "snippet-update-rejected",
                payload: {
                    snippetId: payload.snippetId,
                    message: "Failed to process snippet update"
                }
            });
        }
    }

    private async handleSnippetDelete(payload: { snippetId: string }): Promise<void> {
        if (!this.spaceId || !this.userId) {
            this.send({
                type: "error",
                payload: { message: "Not authenticated" }
            });
            return;
        }

        const access = await this.checkSpaceAccess(this.spaceId, this.userId, 'EDITOR');
        if (!access) {
            this.send({
                type: "snippet-delete-rejected",
                payload: {
                    snippetId: payload.snippetId,
                    message: "Insufficient permissions"
                }
            });
            return;
        }

        try {
            // Database operation removed - HTTP server will handle this automatically

            // Broadcast to other users
            RoomManager.getInstance().broadcast({
                type: "snippet-deleted",
                payload: {
                    id: payload.snippetId,
                    snippetId: payload.snippetId,
                    deletedBy: this.userId
                },
                userId: this.userId,
                messageId: this.generateMessageId("snippet-deleted"),
                timestamp: new Date().toISOString()
            }, this, this.spaceId);

            // Send confirmation to the sender
            // this.send({
            //     type: "snippet-delete-confirmed",
            //     payload: {
            //         snippetId: payload.snippetId
            //     }
            // });

        } catch (error) {
            console.error("Error processing snippet deletion:", error);
            this.send({
                type: "snippet-delete-rejected",
                payload: {
                    snippetId: payload.snippetId,
                    message: "Failed to process snippet deletion"
                }
            });
        }
    }


    public isSocketOpen(): boolean {
        return this.ws.readyState === WebSocket.OPEN;
    }

    public destroy(): void {
        if (this.spaceId) {
            RoomManager.getInstance().broadcast({
                type: "user-left",
                payload: {
                    id: this.id,
                    userId: this.userId ?? ""
                }
            }, this, this.spaceId);

            RoomManager.getInstance().removeUser(this, this.spaceId);
        }
    }

    public send(payload: OutgoingMessage): void {
        if (this.ws.readyState === WebSocket.OPEN) {
            const messageWithMeta = {
                ...payload,
                userId: payload.userId || this.userId,
                timestamp: payload.timestamp || new Date().toISOString(),
                messageId: payload.messageId || this.generateMessageId(payload.type)
            };
            this.ws.send(JSON.stringify(messageWithMeta));
        }
    }
}