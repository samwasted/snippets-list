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


// User metadata (using User table fields directly since no UserMetadata table exists)
userRouter.post("/metadata", userMiddleware, async (req, res) => { //validated
    const userId = req.userId!;

    const { username, name } = req.body; //only allow username and name to be changed

    const updateData: { username?: string; name?: string } = {};
    if (username !== undefined) updateData.username = username;
    if (name !== undefined) updateData.name = name;

    if (Object.keys(updateData).length === 0) {
        res.status(400).json({ message: "No valid fields provided for update" });
        return
    }

    try {
        const user = await client.user.update({
            where: { id: userId },
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


userRouter.get("/metadata", userMiddleware, async (req, res) => { //validated
    const userId = req.userId!;
    
    const user = await client.user.findUnique({
        where: { id: userId },
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


userRouter.get("/metadata/bulk", userMiddleware, async (req, res) => { //validated
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

// User profile
userRouter.get("/profile", userMiddleware, async (req, res) => { //validated
    const userId = req.userId!;
    
    const user = await client.user.findUnique({
        where: { id: userId },
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


// Change password
userRouter.put("/password", userMiddleware, async (req, res) => { //validated
    const userId = req.userId!;
    const { currentPassword, newPassword } = ChangePasswordSchema.parse(req.body);
    
    const user = await client.user.findUnique({
        where: { id: userId },
        select: { password: true }
    });
    
    if (!user?.password || !(await compare(currentPassword, user.password))) {
        res.status(400).json({ message: "Current password is incorrect" });
        return;
    }
    
    const hashedPassword = await hash(newPassword);
    
    await client.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
    });
    
    res.json({ message: "Password changed successfully" });
});

// User spaces
userRouter.get("/spaces", userMiddleware, async (req, res) => { //validated
    const userId = req.userId!;
    const { page, limit } = PaginationSchema.parse(req.query);
    const skip = (page - 1) * limit;
    
    const spaces = await client.space.findMany({
        where: { ownerId: userId },
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

userRouter.get("/spaces/collaborating", userMiddleware, async (req, res) => { //validated
    const userId = req.userId!;
    const { page, limit } = PaginationSchema.parse(req.query);
    const skip = (page - 1) * limit;
    
    const collaboratingSpaces = await client.spaceCollaborator.findMany({
        where: { userId },
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

// User snippets
userRouter.get("/snippets", userMiddleware, async (req, res) => { //validated
    const userId = req.userId!;
    const { page, limit } = PaginationSchema.parse(req.query);
    const skip = (page - 1) * limit;
    
    const snippets = await client.snippet.findMany({
        where: { ownerId: userId },
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

// User analytics
userRouter.get("/analytics/views", userMiddleware, async (req, res) => { //validated
    const userId = req.userId!;
    const { startDate, endDate, groupBy } = AnalyticsQuerySchema.parse(req.query);
    
    const whereClause = {
        ...(startDate && { viewedAt: { gte: new Date(startDate) } }),
        ...(endDate && { viewedAt: { lte: new Date(endDate) } })
    };
    
    // Get views for user's snippets
    const snippetViews = await client.snippetView.findMany({
        where: {
            snippet: {
                ownerId: userId
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
    
    // Get views for user's spaces
    const spaceViews = await client.spaceView.findMany({
        where: {
            space: {
                ownerId: userId
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

userRouter.get("/analytics/activity", userMiddleware, async (req, res) => { //validated
    const userId = req.userId!;
    const { startDate, endDate } = AnalyticsQuerySchema.parse(req.query);
    
    const whereClause = {
        ownerId: userId,
        ...(startDate && { createdAt: { gte: new Date(startDate) } }),
        ...(endDate && { createdAt: { lte: new Date(endDate) } })
    };
    
    // Get recent snippets
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
    
    // Get recent spaces
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
