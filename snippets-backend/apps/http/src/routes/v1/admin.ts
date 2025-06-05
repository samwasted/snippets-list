import { Router } from "express";
import { adminMiddleware } from "../../middleware/admin";
import { 
    UpdateUserProfileSchema, 
    PaginationSchema,
    AnalyticsQuerySchema 
} from "../../types/index";
import client from "@repo/db";

export const adminRouter = Router();

// Snippet management
adminRouter.put("/snippet/:snippetId", adminMiddleware, async (req, res) => {
    const { snippetId } = req.params;
    
    const snippet = await client.snippet.update({
        where: { id: snippetId },
        data: req.body,
        include: {
            owner: {
                select: { id: true, username: true, name: true }
            },
            space: {
                select: { id: true, name: true }
            }
        }
    });
    
    res.json({ message: "Snippet updated successfully", snippet });
});

adminRouter.delete("/snippet/:snippetId", adminMiddleware, async (req, res) => {
    const { snippetId } = req.params;
    
    // Delete related views first
    await client.snippetView.deleteMany({
        where: { snippetId }
    });
    
    // Delete the snippet
    await client.snippet.delete({
        where: { id: snippetId }
    });
    
    res.json({ message: "Snippet deleted successfully" });
});

adminRouter.get("/snippet/:snippetId", adminMiddleware, async (req, res) => {
    const { snippetId } = req.params;
    
    const snippet = await client.snippet.findUnique({
        where: { id: snippetId },
        include: {
            owner: {
                select: { id: true, username: true, name: true }
            },
            space: {
                select: { id: true, name: true }
            },
            _count: {
                select: { views: true }
            }
        }
    });
    
    if (!snippet) {
        res.status(404).json({ message: "Snippet not found" });
        return;
    }
    
    res.json({ snippet });
});

// Map/Analytics
adminRouter.get("/map", adminMiddleware, async (req, res) => { //validated
    const { page = 1, limit = 50 } = PaginationSchema.parse(req.query);
    const skip = (page - 1) * limit;
    
    const [totalUsers, totalSpaces, totalSnippets, recentActivity] = await Promise.all([
        client.user.count(),
        client.space.count(),
        client.snippet.count(),
        client.snippet.findMany({
            take: limit,
            skip,
            include: {
                owner: {
                    select: { id: true, username: true, name: true }
                },
                space: {
                    select: { id: true, name: true }
                },
                _count: {
                    select: { views: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        })
    ]);
    
    res.json({ 
        analytics: {
            totalUsers,
            totalSpaces,
            totalSnippets
        },
        recentActivity,
        pagination: { page, limit }
    });
});

// User management
adminRouter.get("/users", adminMiddleware, async (req, res) => { //validated
    const { page = 1, limit = 20 } = PaginationSchema.parse(req.query);
    const skip = (page - 1) * limit;
    
    const [users, totalUsers] = await Promise.all([
        client.user.findMany({
            skip,
            take: limit,
            select: {
                id: true,
                username: true,
                name: true,
                role: true,
                createdAt: true,
                _count: {
                    select: {
                        spaces: true,
                        snippets: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        }),
        client.user.count()
    ]);
    
    res.json({ 
        users,
        totalUsers,
        pagination: { page, limit, totalPages: Math.ceil(totalUsers / limit) }
    });
});

adminRouter.put("/user/:userId", adminMiddleware, async (req, res) => { //validated
    const { userId } = req.params;
    const validatedData = UpdateUserProfileSchema.parse(req.body);
    
    const user = await client.user.update({
        where: { id: userId },
        data: validatedData,
        select: {
            id: true,
            username: true,
            name: true,
            role: true,
            createdAt: true,
            _count: {
                select: {
                    spaces: true,
                    snippets: true
                }
            }
        }
    });
    
    res.json({ message: "User updated successfully", user });
});

adminRouter.delete("/user/:userId", adminMiddleware, async (req, res) => { //validated
    const { userId } = req.params;
    
    // Delete user's data in order (views -> snippets -> space collaborations -> spaces -> user)
    await client.snippetView.deleteMany({
        where: { 
            snippet: { ownerId: userId }
        }
    });
    
    await client.spaceView.deleteMany({
        where: { 
            space: { ownerId: userId }
        }
    });
    
    await client.snippet.deleteMany({
        where: { ownerId: userId }
    });
    
    await client.spaceCollaborator.deleteMany({
        where: { userId }
    });
    
    await client.space.deleteMany({
        where: { ownerId: userId }
    });
    
    await client.user.delete({
        where: { id: userId }
    });
    
    res.json({ message: "User deleted successfully" });
});

// Space management
adminRouter.get("/spaces", adminMiddleware, async (req, res) => { //validated
    const { page = 1, limit = 20 } = PaginationSchema.parse(req.query);
    const skip = (page - 1) * limit;
    
    const [spaces, totalSpaces] = await Promise.all([
        client.space.findMany({
            skip,
            take: limit,
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
            },
            orderBy: { updatedAt: 'desc' }
        }),
        client.space.count()
    ]);
    
    res.json({ 
        spaces,
        totalSpaces,
        pagination: { page, limit, totalPages: Math.ceil(totalSpaces / limit) }
    });
});

adminRouter.put("/space/:spaceId", adminMiddleware, async (req, res) => {
    const { spaceId } = req.params;
    
    const space = await client.space.update({
        where: { id: spaceId },
        data: req.body,
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
    });
    
    res.json({ message: "Space updated successfully", space });
});

adminRouter.delete("/space/:spaceId", adminMiddleware, async (req, res) => {
    const { spaceId } = req.params;
    
    // Delete related data in order
    await client.snippetView.deleteMany({
        where: { 
            snippet: { spaceId }
        }
    });
    
    await client.spaceView.deleteMany({
        where: { spaceId }
    });
    
    await client.snippet.deleteMany({
        where: { spaceId }
    });
    
    await client.spaceCollaborator.deleteMany({
        where: { spaceId }
    });
    
    await client.space.delete({
        where: { id: spaceId }
    });
    
    res.json({ message: "Space deleted successfully" });
});

// Analytics
adminRouter.get("/analytics/views", adminMiddleware, async (req, res) => { //validated
    const { startDate, endDate, groupBy } = AnalyticsQuerySchema.parse(req.query);
    
    const whereClause = {
        ...(startDate && { viewedAt: { gte: new Date(startDate) } }),
        ...(endDate && { viewedAt: { lte: new Date(endDate) } })
    };
    
    const [snippetViews, spaceViews] = await Promise.all([
        client.snippetView.findMany({
            where: whereClause,
            include: {
                snippet: {
                    select: { 
                        id: true, 
                        title: true,
                        owner: {
                            select: { id: true, username: true }
                        }
                    }
                }
            },
            orderBy: { viewedAt: 'desc' },
            take: 100
        }),
        client.spaceView.findMany({
            where: whereClause,
            include: {
                space: {
                    select: { 
                        id: true, 
                        name: true,
                        owner: {
                            select: { id: true, username: true }
                        }
                    }
                }
            },
            orderBy: { viewedAt: 'desc' },
            take: 100
        })
    ]);
    
    const totalViews = await Promise.all([
        client.snippetView.count({ where: whereClause }),
        client.spaceView.count({ where: whereClause })
    ]);
    
    res.json({ 
        snippetViews,
        spaceViews,
        totalSnippetViews: totalViews[0],
        totalSpaceViews: totalViews[1],
        totalViews: totalViews[0] + totalViews[1],
        groupBy
    });
});

adminRouter.get("/analytics/popular", adminMiddleware, async (req, res) => { //validated
    const { page = 1, limit = 10 } = PaginationSchema.parse(req.query);
    const skip = (page - 1) * limit;
    
    const [popularSnippets, popularSpaces, topUsers] = await Promise.all([
        client.snippet.findMany({
            skip,
            take: limit,
            include: {
                owner: {
                    select: { id: true, username: true, name: true }
                },
                space: {
                    select: { id: true, name: true }
                },
                _count: {
                    select: { views: true }
                }
            },
            orderBy: { totalViews: 'desc' }
        }),
        client.space.findMany({
            skip,
            take: limit,
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
            },
            orderBy: { totalViews: 'desc' }
        }),
        client.user.findMany({
            take: limit,
            select: {
                id: true,
                username: true,
                name: true,
                role: true,
                _count: {
                    select: {
                        spaces: true,
                        snippets: true
                    }
                }
            },
            orderBy: [
                { spaces: { _count: 'desc' }},
                { snippets: { _count: 'desc' }}
            ]
        })
    ]);
    
    res.json({ 
        popularSnippets,
        popularSpaces,
        topUsers,
        pagination: { page, limit }
    });
});