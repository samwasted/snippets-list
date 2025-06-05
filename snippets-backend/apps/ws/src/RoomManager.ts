import type { User } from "./User";
import { OutgoingMessage, ConnectedUser } from "./types";

export class RoomManager {
    private rooms: Map<string, User[]> = new Map();
    private static instance: RoomManager;

    private constructor() {
        this.rooms = new Map();
    }

    static getInstance(): RoomManager {
        if (!this.instance) {
            this.instance = new RoomManager();
        }
        return this.instance;
    }

    public addUser(spaceId: string, user: User): void {
        if (!this.rooms.has(spaceId)) {
            this.rooms.set(spaceId, [user]);
        } else {
            const existingUsers = this.rooms.get(spaceId)!;
            // Check if user is already in the room (prevent duplicates)
            if (!existingUsers.find(u => u.id === user.id)) {
                existingUsers.push(user);
            }
        }
        
        console.log(`User ${user.id} added to space ${spaceId}. Total users: ${this.rooms.get(spaceId)?.length}`);
    }

    public removeUser(user: User, spaceId: string): void {
        if (!this.rooms.has(spaceId)) {
            return;
        }

        const users = this.rooms.get(spaceId)!;
        const filteredUsers = users.filter(u => u.id !== user.id);
        
        if (filteredUsers.length === 0) {
            // Remove the room if no users left
            this.rooms.delete(spaceId);
            console.log(`Space ${spaceId} removed - no users remaining`);
        } else {
            this.rooms.set(spaceId, filteredUsers);
        }
        
        console.log(`User ${user.id} removed from space ${spaceId}. Remaining users: ${filteredUsers.length}`);
    }

    public getUsers(spaceId: string): User[] | undefined {
        return this.rooms.get(spaceId);
    }

    public getUserCount(spaceId: string): number {
        return this.rooms.get(spaceId)?.length ?? 0;
    }

    public broadcast(message: OutgoingMessage, sender: User, spaceId: string): void {
        if (!this.rooms.has(spaceId)) {
            console.log(`Attempted to broadcast to non-existent space: ${spaceId}`);
            return;
        }

        const users = this.rooms.get(spaceId)!;
        const recipients = users.filter(u => u.id !== sender.id);
        
        console.log(`Broadcasting message of type ${message.type} to ${recipients.length} users in space ${spaceId}`);
        
        recipients.forEach(user => {
            try {
                if (user.isSocketOpen()) {
                    user.send(message);
                }
            } catch (error) {
                console.error(`Failed to send message to user ${user.id}:`, error);
                // Remove the user if send fails
                this.removeUser(user, spaceId);
            }
        });
    }

    public broadcastToAll(message: OutgoingMessage, spaceId: string): void {
        if (!this.rooms.has(spaceId)) {
            console.log(`Attempted to broadcast to non-existent space: ${spaceId}`);
            return;
        }

        const users = this.rooms.get(spaceId)!;
        
        console.log(`Broadcasting message of type ${message.type} to all ${users.length} users in space ${spaceId}`);
        
        users.forEach(user => {
            try {
                if (user.isSocketOpen()) {
                    user.send(message);
                }
            } catch (error) {
                console.error(`Failed to send message to user ${user.id}:`, error);
                this.removeUser(user, spaceId);
            }
        });
    }

    public getSpaceStats(): { [spaceId: string]: number } {
        const stats: { [spaceId: string]: number } = {};
        this.rooms.forEach((users, spaceId) => {
            stats[spaceId] = users.length;
        });
        return stats;
    }

    public getTotalConnections(): number {
        let total = 0;
        this.rooms.forEach(users => {
            total += users.length;
        });
        return total;
    }

    public getActiveSpaces(): string[] {
        return Array.from(this.rooms.keys());
    }

    public isSpaceActive(spaceId: string): boolean {
        return this.rooms.has(spaceId) && this.rooms.get(spaceId)!.length > 0;
    }

    public getUsersInSpace(spaceId: string): ConnectedUser[] {
        const users = this.rooms.get(spaceId);
        if (!users) return [];
        
        return users.map(user => ({
            id: user.id,
            userId: user.userId,
            role: user.getUserRole() // Add this method to User class
        }));
    }

    // Method to handle cleanup of disconnected users
    public cleanup(): void {
        this.rooms.forEach((users, spaceId) => {
            const activeUsers = users.filter(user => {
                // Check if WebSocket is still open
                return user.isSocketOpen();
            });
            
            if (activeUsers.length === 0) {
                this.rooms.delete(spaceId);
                console.log(`Cleaned up empty space: ${spaceId}`);
            } else if (activeUsers.length !== users.length) {
                this.rooms.set(spaceId, activeUsers);
                console.log(`Cleaned up ${users.length - activeUsers.length} disconnected users from space ${spaceId}`);
            }
        });
    }

    // Method to send a message to a specific user
    public sendToUser(userId: string, message: OutgoingMessage, spaceId: string): boolean {
        const users = this.rooms.get(spaceId);
        if (!users) return false;

        const targetUser = users.find(u => u.userId === userId);
        if (!targetUser) return false;

        try {
            if (targetUser.isSocketOpen()) {
                targetUser.send(message);
                return true;
            } else {
                // Remove disconnected user
                this.removeUser(targetUser, spaceId);
                return false;
            }
        } catch (error) {
            console.error(`Failed to send message to user ${userId}:`, error);
            this.removeUser(targetUser, spaceId);
            return false;
        }
    }

    // Method to get debug information
    public getDebugInfo(): {
        totalSpaces: number;
        totalUsers: number;
        spaces: { [spaceId: string]: { userCount: number; users: ConnectedUser[] } };
    } {
        const info = {
            totalSpaces: this.rooms.size,
            totalUsers: this.getTotalConnections(),
            spaces: {} as { [spaceId: string]: { userCount: number; users: ConnectedUser[] } }
        };

        this.rooms.forEach((users, spaceId) => {
            info.spaces[spaceId] = {
                userCount: users.length,
                users: users.map(u => ({
                    id: u.id,
                    userId: u.userId,
                    role: u.getUserRole()
                }))
            };
        });

        return info;
    }

    // Method to force disconnect a user from all spaces
    public disconnectUser(userId: string): void {
        this.rooms.forEach((users, spaceId) => {
            const userToRemove = users.find(u => u.userId === userId);
            if (userToRemove) {
                this.removeUser(userToRemove, spaceId);
            }
        });
    }

    // Method to get all spaces a user is connected to
    public getUserSpaces(userId: string): string[] {
        const spaces: string[] = [];
        this.rooms.forEach((users, spaceId) => {
            if (users.some(u => u.userId === userId)) {
                spaces.push(spaceId);
            }
        });
        return spaces;
    }
}