import { WebSocket } from "ws";
import { RoomManager } from "./RoomManager";
import { OutgoingMessage, CollaboratorRole, SpaceAccess } from "./types";
import client from "@repo/db"
import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_PASSWORD } from "./config";

function getRandomString(length: number): string {  //just to help, idk if I needed this
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

export class User {
    public id: string;
    public userId?: string;
    private spaceId?: string;
    private ws: WebSocket;
    private userRole?: CollaboratorRole;
    private routeSpaceId?: string;
    constructor(ws: WebSocket, routeSpaceId?: string) {
        this.id = getRandomString(10); //we dont need an actual id, this is just for the ws connection
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
                    }
                }
            });

            if (!space) return null;

            // Owner has full access
            if (space.ownerId === userId) {
                // Convert null description to undefined to match type
                const fixedSpace = {
                    ...space,
                    description: space.description === null ? undefined : space.description,
                    collaborators: space.collaborators.map(c => ({
                        role: c.role,
                        userId: userId // Since only the owner is present, use the current userId
                    }))
                };
                return { space: fixedSpace, role: 'OWNER' as const };
            }

            // Check if public space (viewers can access)
            if (space.isPublic && requiredRole === 'VIEWER') {
                // Convert null description to undefined to match type
                const fixedSpace = {
                    ...space,
                    description: space.description === null ? undefined : space.description,
                    collaborators: space.collaborators.map(c => ({
                        role: c.role,
                        userId: userId // Since only the owner is present, use the current userId
                    }))
                };
                return { space: fixedSpace, role: 'VIEWER' as const };
            }

            // Check collaborator permissions
            const collaboration = space.collaborators[0];
            if (!collaboration) return null;

            const roleHierarchy = { 'VIEWER': 1, 'EDITOR': 2, 'ADMIN': 3 };
            const role = collaboration.role as keyof typeof roleHierarchy;
            const hasPermission = roleHierarchy[role] >= roleHierarchy[requiredRole];

            if (hasPermission) {
                const fixedSpace = {
                    ...space,
                    description: space.description === null ? undefined : space.description,
                    collaborators: space.collaborators.map(c => ({
                        role: c.role,
                        userId: userId // Use the current userId for collaborators
                    }))
                };
                return { space: fixedSpace, role: collaboration.role as CollaboratorRole };
            }
            return null;
        } catch (error) {
            console.error("Error checking space access:", error);
            return null;
        }
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
            // If spaceId was provided in payload and doesn't match route, reject
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
            // Verify JWT token - use the same approach as HTTP routes
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

            // Verify user still exists (like refresh-token endpoint does)
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

            // Check space access
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
            this.userRole = access.role;

            // Add user to room
            RoomManager.getInstance().addUser(spaceId, this);

            // Get current space data with snippets
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
                            updatedAt: true
                        }
                    },
                    owner: {
                        select: { id: true, username: true, name: true }
                    }
                }
            });

            // Get other users in the space
            const otherUsers = RoomManager.getInstance().getUsers(spaceId)
                ?.filter(u => u.id !== this.id)
                ?.map(u => ({
                    id: u.id,
                    userId: u.userId,
                    role: u.userRole
                })) ?? [];

            // Send space joined confirmation
            this.send({
                type: "space-joined",
                payload: {
                    space: spaceData,
                    userRole: this.userRole,
                    users: otherUsers
                }
            });

            // Broadcast user joined to others
            RoomManager.getInstance().broadcast({
                type: "user-joined",
                payload: {
                    id: this.id,
                    userId: this.userId,
                    role: this.userRole
                }
            }, this, this.spaceId!);

            console.log(`User ${userId} joined space ${spaceId} with role ${this.userRole}`);

        } catch (error) {
            console.error("Error handling join:", error);

            // Provide more specific error messages based on JWT error types
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

        // Check if user has editor permissions
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
            // Update snippet position in database
            const updatedSnippet = await client.snippet.update({
                where: {
                    id: payload.snippetId,
                    spaceId: this.spaceId
                },
                data: {
                    x: payload.x,
                    y: payload.y
                }
            });

            // Broadcast snippet movement to all users in the space
            RoomManager.getInstance().broadcast({
                type: "snippet-moved",
                payload: {
                    snippetId: payload.snippetId,
                    x: payload.x,
                    y: payload.y,
                    movedBy: this.userId
                }
            }, this, this.spaceId);

            // Confirm to the user who moved it
            this.send({
                type: "snippet-move-confirmed",
                payload: {
                    snippetId: payload.snippetId,
                    x: payload.x,
                    y: payload.y
                }
            });

        } catch (error) {
            console.error("Error moving snippet:", error);
            this.send({
                type: "snippet-move-rejected",
                payload: {
                    snippetId: payload.snippetId,
                    message: "Failed to move snippet"
                }
            });
        }
    }

    private async handleSnippetCreate(payload: {
        title: string;
        description?: string;
        code?: string;
        tags?: string[];
        color?: string;
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
            const snippet = await client.snippet.create({
                data: {
                    title: payload.title,
                    description: payload.description,
                    code: payload.code,
                    tags: payload.tags || [],
                    color: payload.color,
                    files: payload.files || [],
                    x: payload.x,
                    y: payload.y,
                    ownerId: this.userId,
                    spaceId: this.spaceId
                }
            });

            // Broadcast new snippet to all users
            RoomManager.getInstance().broadcast({
                type: "snippet-created",
                payload: {
                    snippet,
                    createdBy: this.userId
                }
            }, this, this.spaceId);

        } catch (error) {
            console.error("Error creating snippet:", error);
            this.send({
                type: "snippet-create-rejected",
                payload: { message: "Failed to create snippet" }
            });
        }
    }

    private async handleSnippetUpdate(payload: { snippetId: string;[key: string]: any }): Promise<void> {
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
            const { snippetId, ...updateData } = payload;
            const updatedSnippet = await client.snippet.update({
                where: {
                    id: snippetId,
                    spaceId: this.spaceId
                },
                data: updateData
            });

            // Broadcast snippet update to all users
            RoomManager.getInstance().broadcast({
                type: "snippet-updated",
                payload: {
                    snippet: updatedSnippet,
                    updatedBy: this.userId
                }
            }, this, this.spaceId);

        } catch (error) {
            console.error("Error updating snippet:", error);
            this.send({
                type: "snippet-update-rejected",
                payload: {
                    snippetId: payload.snippetId,
                    message: "Failed to update snippet"
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
            await client.snippet.delete({
                where: {
                    id: payload.snippetId,
                    spaceId: this.spaceId
                }
            });

            // Broadcast snippet deletion to all users
            RoomManager.getInstance().broadcast({
                type: "snippet-deleted",
                payload: {
                    snippetId: payload.snippetId,
                    deletedBy: this.userId
                }
            }, this, this.spaceId);

        } catch (error) {
            console.error("Error deleting snippet:", error);
            this.send({
                type: "snippet-delete-rejected",
                payload: {
                    snippetId: payload.snippetId,
                    message: "Failed to delete snippet"
                }
            });
        }
    }

    public isSocketOpen(): boolean {
        return this.ws && this.ws.readyState === WebSocket.OPEN;
    }

    public getUserRole(): CollaboratorRole | undefined {
        return this.userRole;
    }

    public destroy(): void {
        if (this.spaceId) {
            // Broadcast user left to others
            RoomManager.getInstance().broadcast({
                type: "user-left",
                payload: {
                    id: this.id,
                    userId: this.userId ?? ""
                }
            }, this, this.spaceId);

            // Remove user from room
            RoomManager.getInstance().removeUser(this, this.spaceId);
        }
    }

    public send(payload: OutgoingMessage): void {
        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(payload));
        }
    }
}