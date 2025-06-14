import { Router } from "express";
import { userMiddleware } from "../../middleware/user";
import { 
    UpdateUserProfileSchema, 
    ChangePasswordSchema,
    PaginationSchema,
    AnalyticsQuerySchema 
} from "../../types/index"; 
import { hash, compare } from "../../scrypt";
import client from "@repo/db"; 

export const userRouter = Router();

// Helper function to check if user is global admin
const isGlobalAdmin = async (userId: string): Promise<boolean> => {
    const user = await client.user.findUnique({
        where: { id: userId },
        select: { role: true }
    });
    return user?.role === 'ADMIN';
};

// User metadata (updated with global admin access)
userRouter.post("/metadata", userMiddleware, async (req, res) => {
    const userId = req.userId!;
    const { username, name, targetUserId } = req.body;
    
    // Determine which user to update
    let userToUpdate = userId;
    const isAdmin = await isGlobalAdmin(userId);
    
    if (targetUserId && targetUserId !== userId) {
        if (!isAdmin) {
            res.status(403).json({ message: "Only global admins can update other users' metadata" });
            return;
        }
        userToUpdate = targetUserId;
    }

    const updateData: { username?: string; name?: string } = {};
    if (username !== undefined) updateData.username = username;
    if (name !== undefined) updateData.name = name;

    if (Object.keys(updateData).length === 0) {
        res.status(400).json({ message: "No valid fields provided for update" });
        return;
    }

    try {
        const user = await client.user.update({
            where: { id: userToUpdate },
            data: updateData,
            select: {
                id: true,
                username: true,
                name: true,
                role: true,
                createdAt: true
            }
        });

        res.status(200).json({ message: "User metadata updated successfully", user });
    } catch (error) {
        res.status(500).json({ message: "Failed to update user metadata" });
    }
});

userRouter.get("/metadata", userMiddleware, async (req, res) => {
    const userId = req.userId!;
    const { targetUserId } = req.query;
    
    let userToQuery = userId;
    const isAdmin = await isGlobalAdmin(userId);
    
    if (targetUserId && targetUserId !== userId) {
        if (!isAdmin) {
            res.status(403).json({ message: "Only global admins can access other users' metadata" });
            return;
        }
        userToQuery = targetUserId as string;
    }
    
    const user = await client.user.findUnique({
        where: { id: userToQuery },
        select: {
            id: true,
            username: true,
            name: true,
            role: true,
            createdAt: true
        }
    });
    
    res.json({ metadata: user });
});

// Updated bulk metadata endpoint with admin access
userRouter.get("/metadata/bulk", userMiddleware, async (req, res) => {
    const userId = req.userId!;
    const isAdmin = await isGlobalAdmin(userId);
    
    if (!isAdmin) {
        res.status(403).json({ message: "Only global admins can access bulk user metadata" });
        return;
    }
    
    const { page, limit } = PaginationSchema.parse(req.query);
    const skip = (page - 1) * limit;
    
    const users = await client.user.findMany({
        skip,
        take: limit,
        select: {
            id: true,
            username: true,
            name: true,
            role: true,
            createdAt: true
        }
    });
    
    res.json({ 
        metadata: users,
        pagination: { page, limit }
    });
});

// User profile (with admin override capability)
userRouter.get("/profile", userMiddleware, async (req, res) => {
    const userId = req.userId!;
    const { targetUserId } = req.query;
    
    let userToQuery = userId;
    const isAdmin = await isGlobalAdmin(userId);
    
    if (targetUserId && targetUserId !== userId) {
        if (!isAdmin) {
            res.status(403).json({ message: "Only global admins can access other users' profiles" });
            return;
        }
        userToQuery = targetUserId as string;
    }
    
    const user = await client.user.findUnique({
        where: { id: userToQuery },
        select: {
            id: true,
            username: true,
            name: true,
            role: true,
            createdAt: true
        }
    });
    
    res.json({ user });
});

// Updated profile update with admin override
userRouter.put("/profile", userMiddleware, async (req, res) => {
    const userId = req.userId!;
    const { targetUserId, ...rest } = req.body;
    const updateData = UpdateUserProfileSchema.parse(rest);
    
    let userToUpdate = userId;
    const isAdmin = await isGlobalAdmin(userId);
    
    if (targetUserId && targetUserId !== userId) {
        if (!isAdmin) {
            res.status(403).json({ message: "Only global admins can update other users' profiles" });
            return;
        }
        userToUpdate = targetUserId;
    }
    
    const user = await client.user.update({
        where: { id: userToUpdate },
        data: updateData,
        select: {
            id: true,
            username: true,
            name: true,
            role: true,
            createdAt: true
        }
    });
    
    res.json({ message: "Profile updated successfully", user });
});

// Change password (with admin override)
userRouter.put("/password", userMiddleware, async (req, res) => {
    const userId = req.userId!;
    const { targetUserId, ...rest } = req.body;
    const { currentPassword, newPassword } = ChangePasswordSchema.parse(rest);
    
    let userToUpdate = userId;
    const isAdmin = await isGlobalAdmin(userId);
    
    if (targetUserId && targetUserId !== userId) {
        if (!isAdmin) {
            res.status(403).json({ message: "Only global admins can change other users' passwords" });
            return;
        }
        userToUpdate = targetUserId;
    }
    
    const user = await client.user.findUnique({
        where: { id: userToUpdate },
        select: { password: true }
    });
    
    // For admin changing other user's password, current password check is optional
    if (userToUpdate === userId) {
        if (!user?.password || !(await compare(currentPassword, user.password))) {
            res.status(400).json({ message: "Current password is incorrect" });
            return;
        }
    }
    
    const hashedPassword = await hash(newPassword);
    
    await client.user.update({
        where: { id: userToUpdate },
        data: { password: hashedPassword }
    });
    
    res.json({ message: "Password changed successfully" });
});

// Updated user spaces endpoint with admin access
userRouter.get("/spaces", userMiddleware, async (req, res) => {
    const userId = req.userId!;
    const { targetUserId } = req.query;
    const { page, limit } = PaginationSchema.parse(req.query);
    const skip = (page - 1) * limit;
    
    let userToQuery = userId;
    const isAdmin = await isGlobalAdmin(userId);
    
    if (targetUserId && targetUserId !== userId) {
        if (!isAdmin) {
            res.status(403).json({ message: "Only global admins can access other users' spaces" });
            return;
        }
        userToQuery = targetUserId as string;
    }
    
    const spaces = await client.space.findMany({
        where: { ownerId: userToQuery },
        skip,
        take: limit,
        include: {
            _count: {
                select: { 
                    snippets: true, 
                    collaborators: true,
                    views: true
                }
            }
        },
        orderBy: { updatedAt: 'desc' }
    });
    
    res.json({ 
        spaces,
        pagination: { page, limit }
    });
});

// Updated collaborating spaces with admin access
userRouter.get("/spaces/collaborating", userMiddleware, async (req, res) => {
    const userId = req.userId!;
    const { targetUserId } = req.query;
    const { page, limit } = PaginationSchema.parse(req.query);
    const skip = (page - 1) * limit;
    
    let userToQuery = userId;
    const isAdmin = await isGlobalAdmin(userId);
    
    if (targetUserId && targetUserId !== userId) {
        if (!isAdmin) {
            res.status(403).json({ message: "Only global admins can access other users' collaborating spaces" });
            return;
        }
        userToQuery = targetUserId as string;
    }
    
    const collaboratingSpaces = await client.spaceCollaborator.findMany({
        where: { userId: userToQuery },
        skip,
        take: limit,
        include: {
            space: {
                include: {
                    owner: {
                        select: { id: true, username: true, name: true }
                    },
                    _count: {
                        select: { 
                            snippets: true, 
                            collaborators: true,
                            views: true
                        }
                    }
                }
            }
        },
        orderBy: { id: 'desc' }
    });
    
    res.json({ 
        collaboratingSpaces: collaboratingSpaces.map(c => ({
            ...c.space,
            collaboratorRole: c.role
        })),
        pagination: { page, limit }
    });
});

// Updated user snippets with admin access
userRouter.get("/snippets", userMiddleware, async (req, res) => {
    const userId = req.userId!;
    const { targetUserId } = req.query;
    const { page, limit } = PaginationSchema.parse(req.query);
    const skip = (page - 1) * limit;
    
    let userToQuery = userId;
    const isAdmin = await isGlobalAdmin(userId);
    
    if (targetUserId && targetUserId !== userId) {
        if (!isAdmin) {
            res.status(403).json({ message: "Only global admins can access other users' snippets" });
            return;
        }
        userToQuery = targetUserId as string;
    }
    
    const snippets = await client.snippet.findMany({
        where: { ownerId: userToQuery },
        skip,
        take: limit,
        include: {
            space: {
                select: { id: true, name: true }
            },
            _count: {
                select: { views: true }
            }
        },
        orderBy: { updatedAt: 'desc' }
    });
    
    res.json({ 
        snippets,
        pagination: { page, limit }
    });
});

// Updated analytics endpoints with admin access
userRouter.get("/analytics/views", userMiddleware, async (req, res) => {
    const userId = req.userId!;
    const { targetUserId, startDate, endDate, groupBy } = req.query;
    
    let userToQuery = userId;
    const isAdmin = await isGlobalAdmin(userId);
    
    if (targetUserId && targetUserId !== userId) {
        if (!isAdmin) {
            res.status(403).json({ message: "Only global admins can access other users' analytics" });
            return;
        }
        userToQuery = targetUserId as string;
    }
    
    const whereClause = {
        ...(startDate && { viewedAt: { gte: new Date(startDate as string) } }),
        ...(endDate && { viewedAt: { lte: new Date(endDate as string) } })
    };
    
    const snippetViews = await client.snippetView.findMany({
        where: {
            snippet: {
                ownerId: userToQuery
            },
            ...whereClause
        },
        include: {
            snippet: {
                select: { id: true, title: true }
            }
        },
        orderBy: { viewedAt: 'desc' }
    });
    
    const spaceViews = await client.spaceView.findMany({
        where: {
            space: {
                ownerId: userToQuery
            },
            ...whereClause
        },
        include: {
            space: {
                select: { id: true, name: true }
            }
        },
        orderBy: { viewedAt: 'desc' }
    });
    
    res.json({ 
        snippetViews,
        spaceViews,
        totalViews: snippetViews.length + spaceViews.length,
        groupBy
    });
});

userRouter.get("/analytics/activity", userMiddleware, async (req, res) => {
    const userId = req.userId!;
    const { targetUserId, startDate, endDate } = req.query;
    
    let userToQuery = userId;
    const isAdmin = await isGlobalAdmin(userId);
    
    if (targetUserId && targetUserId !== userId) {
        if (!isAdmin) {
            res.status(403).json({ message: "Only global admins can access other users' activity analytics" });
            return;
        }
        userToQuery = targetUserId as string;
    }
    
    const whereClause = {
        ownerId: userToQuery,
        ...(startDate && { createdAt: { gte: new Date(startDate as string) } }),
        ...(endDate && { createdAt: { lte: new Date(endDate as string) } })
    };
    
    const recentSnippets = await client.snippet.findMany({
        where: whereClause,
        select: {
            id: true,
            title: true,
            createdAt: true,
            totalViews: true,
            space: {
                select: { id: true, name: true }
            }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
    });
    
    const recentSpaces = await client.space.findMany({
        where: whereClause,
        select: {
            id: true,
            name: true,
            createdAt: true,
            totalViews: true,
            _count: {
                select: { snippets: true }
            }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
    });
    
    res.json({ 
        recentSnippets,
        recentSpaces,
        summary: {
            snippetsCreated: recentSnippets.length,
            spacesCreated: recentSpaces.length,
            totalSnippetViews: recentSnippets.reduce((sum, s) => sum + s.totalViews, 0),
            totalSpaceViews: recentSpaces.reduce((sum, s) => sum + s.totalViews, 0)
        }
    });
});

// Get user profile by username (public route - no auth required)
userRouter.get("/profile/:username", async (req, res) => {
    const { username } = req.params;
    
    try {
        const user = await client.user.findUnique({
            where: { username },
            select: {
                id: true,
                username: true,
                name: true,
                role: true,
                createdAt: true
            }
        });
        
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        
        res.json({ user });
    } catch (error) {
        console.error("Error fetching user profile:", error);
        res.status(500).json({ message: "Failed to fetch user profile" });
    }
});

// Get public spaces for a specific user (public route)
userRouter.get("/:userId/spaces/public", async (req, res) => {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    try {
        const spaces = await client.space.findMany({
            where: { 
                ownerId: userId,
                isPublic: true 
            },
            skip,
            take: parseInt(limit as string),
            include: {
                _count: {
                    select: { 
                        snippets: true, 
                        collaborators: true,
                        views: true
                    }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });
        
        res.json({ 
            spaces,
            pagination: { 
                page: parseInt(page as string), 
                limit: parseInt(limit as string) 
            }
        });
    } catch (error) {
        console.error("Error fetching public spaces:", error);
        res.status(500).json({ message: "Failed to fetch public spaces" });
    }
});
