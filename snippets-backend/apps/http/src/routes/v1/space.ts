import { Router } from "express";
import { userMiddleware } from "../../middleware/user";
import { 
    CreateSpaceSchema, 
    UpdateSpaceSchema,
    UpdateSpaceVisibilitySchema,
    UpdateSpaceOrderSchema,
    CreateSnippetSchema,
    UpdateSnippetSchema,
    AddCollaboratorSchema,
    UpdateCollaboratorRoleSchema,
    PaginationSchema,
    AnalyticsQuerySchema,
    IdParamSchema
} from "../../types/index";
import client from "@repo/db"

export const spaceRouter = Router()

// Helper function to check space access
const checkSpaceAccess = async (spaceId: string, userId: string, requiredRole: 'VIEWER' | 'EDITOR' | 'ADMIN' = 'VIEWER') => {
    const space = await client.space.findUnique({
        where: { id: spaceId },
        include: {
            collaborators: {
                where: { userId }
            }
        }
    });

    if (!space) return null;
    
    // Owner has full access
    if (space.ownerId === userId) return { space, role: 'OWNER' as const };
    
    // Check if public space (viewers can access)
    if (space.isPublic && requiredRole === 'VIEWER') return { space, role: 'VIEWER' as const };
    
    // Check collaborator permissions
    const collaboration = space.collaborators[0];
    if (!collaboration) return null;
    
    const roleHierarchy = { 'VIEWER': 1, 'EDITOR': 2, 'ADMIN': 3 };
    const role = collaboration.role as keyof typeof roleHierarchy;
    const hasPermission = roleHierarchy[role] >= roleHierarchy[requiredRole];
    
    return hasPermission ? { space, role: collaboration.role } : null;
};

// Space CRUD
spaceRouter.post("/", userMiddleware, async (req, res) => {
    const userId = req.userId!;
    const validatedData = CreateSpaceSchema.parse(req.body);
    
    const space = await client.space.create({
        data: {
            ...validatedData,
            ownerId: userId
        },
        include: {
            owner: {
                select: { id: true, username: true, name: true }
            },
            _count: {
                select: { snippets: true, collaborators: true }
            }
        }
    });
    
    res.status(201).json({ message: "Space created successfully", space });
});

spaceRouter.get("/all", userMiddleware, async (req, res) => {
    const userId = req.userId!;
    const { page, limit } = PaginationSchema.parse(req.query);
    const skip = (page - 1) * limit;
    
    // Get spaces user owns or collaborates on
    const spaces = await client.space.findMany({
        where: {
            OR: [
                { ownerId: userId },
                { collaborators: { some: { userId } } }
            ]
        },
        skip,
        take: limit,
        include: {
            owner: {
                select: { id: true, username: true, name: true }
            },
            _count: {
                select: { snippets: true, collaborators: true, views: true }
            }
        },
        orderBy: { updatedAt: 'desc' }
    });
    
    res.json({ spaces, pagination: { page, limit } });
});

spaceRouter.get("/public", async (req, res) => {
    const { page, limit } = PaginationSchema.parse(req.query);
    const skip = (page - 1) * limit;
    
    const publicSpaces = await client.space.findMany({
        where: { isPublic: true },
        skip,
        take: limit,
        include: {
            owner: {
                select: { id: true, username: true, name: true }
            },
            _count: {
                select: { snippets: true, views: true }
            }
        },
        orderBy: { totalViews: 'desc' }
    });
    
    res.json({ spaces: publicSpaces, pagination: { page, limit } });
});

spaceRouter.get("/:spaceId", userMiddleware, async (req, res) => {
    const userId = req.userId!;
    const { id: spaceId } = IdParamSchema.parse(req.params);
    
    const access = await checkSpaceAccess(spaceId, userId);
    if (!access) {
        res.status(404).json({ message: "Space not found or access denied" });
        return 
    }
    
    const spaceDetails = await client.space.findUnique({
        where: { id: spaceId },
        include: {
            owner: {
                select: { id: true, username: true, name: true }
            },
            snippets: {
                select: {
                    id: true,
                    title: true,
                    description: true,
                    tags: true,
                    color: true,
                    x: true,
                    y: true,
                    totalViews: true,
                    createdAt: true,
                    updatedAt: true
                },
                orderBy: { createdAt: 'desc' }
            },
            _count: {
                select: { collaborators: true, views: true }
            }
        }
    });
    
    // Record view if not owner
    if (access.role !== 'OWNER') {
        await client.spaceView.create({
            data: {
                spaceId,
                userId
            }
        });
        
        // Update total views counter
        await client.space.update({
            where: { id: spaceId },
            data: { totalViews: { increment: 1 } }
        });
    }
    
    res.json({ space: spaceDetails, userRole: access.role });
});

spaceRouter.put("/:spaceId", userMiddleware, async (req, res) => {
    const userId = req.userId!;
    const { id: spaceId } = IdParamSchema.parse(req.params);
    const validatedData = UpdateSpaceSchema.parse(req.body);
    
    const access = await checkSpaceAccess(spaceId, userId, 'ADMIN');
    if (!access) {
        res.status(403).json({ message: "Insufficient permissions" });
        return 
    }
    
    const space = await client.space.update({
        where: { id: spaceId },
        data: validatedData,
        include: {
            owner: {
                select: { id: true, username: true, name: true }
            }
        }
    });
    
    res.json({ message: "Space updated successfully", space });
});

spaceRouter.delete("/:spaceId", userMiddleware, async (req, res) => {
    const userId = req.userId!;
    const { id: spaceId } = IdParamSchema.parse(req.params);
    
    const space = await client.space.findUnique({
        where: { id: spaceId }
    });
    
    if (!space || space.ownerId !== userId) {
        res.status(403).json({ message: "Only space owner can delete the space" });
        return 
    }
    
    await client.space.delete({
        where: { id: spaceId }
    });
    
    res.json({ message: "Space deleted successfully" });
});

// Snippet management within space
spaceRouter.post("/:spaceId/snippet", userMiddleware, async (req, res) => {
    const userId = req.userId!;
    const { id: spaceId } = IdParamSchema.parse(req.params);
    const validatedData = CreateSnippetSchema.parse(req.body);
    
    const access = await checkSpaceAccess(spaceId, userId, 'EDITOR');
    if (!access) {
        res.status(403).json({ message: "Insufficient permissions" });
        return 
    }
    
    const snippet = await client.snippet.create({
        data: {
            ...validatedData,
            ownerId: userId,
            spaceId
        }
    });
    
    res.status(201).json({ message: "Snippet created successfully", snippet });
});

spaceRouter.get("/:spaceId/snippets", userMiddleware, async (req, res) => {
    const userId = req.userId!;
    const { id: spaceId } = IdParamSchema.parse(req.params);
    
    const access = await checkSpaceAccess(spaceId, userId);
    if (!access) {
        res.status(404).json({ message: "Space not found or access denied" });
        return 
    }
    
    const snippets = await client.snippet.findMany({
        where: { spaceId },
        include: {
            owner: {
                select: { id: true, username: true, name: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
    
    res.json({ snippets });
});

spaceRouter.put("/:spaceId/snippet/:snippetId", userMiddleware, async (req, res) => {
    const userId = req.userId!;
    const { spaceId, snippetId } = req.params;
    const validatedData = UpdateSnippetSchema.parse(req.body);
    
    const access = await checkSpaceAccess(spaceId, userId, 'EDITOR');
    if (!access) {
        res.status(403).json({ message: "Insufficient permissions" });
        return 
    }
    
    const snippet = await client.snippet.findFirst({
        where: { id: snippetId, spaceId }
    });
    
    if (!snippet) {
        res.status(404).json({ message: "Snippet not found in this space" });
        return 
    }
    
    const updatedSnippet = await client.snippet.update({
        where: { id: snippetId },
        data: validatedData
    });
    
    res.json({ message: "Snippet updated successfully", snippet: updatedSnippet });
});

spaceRouter.delete("/:spaceId/snippet/:snippetId", userMiddleware, async (req, res) => {
    const userId = req.userId!;
    const { spaceId, snippetId } = req.params;
    
    const access = await checkSpaceAccess(spaceId, userId, 'EDITOR');
    if (!access) {
        res.status(403).json({ message: "Insufficient permissions" });
        return 
    }
    
    const snippet = await client.snippet.findFirst({
        where: { id: snippetId, spaceId }
    });
    
    if (!snippet) {
        res.status(404).json({ message: "Snippet not found in this space" });
        return 
    }
    
    await client.snippet.delete({
        where: { id: snippetId }
    });
    
    res.json({ message: "Snippet deleted successfully" });
});

// Collaborator management
spaceRouter.post("/:spaceId/collaborators", userMiddleware, async (req, res) => {
    const userId = req.userId!;
    const { id: spaceId } = IdParamSchema.parse(req.params);
    const { email, role } = AddCollaboratorSchema.parse(req.body);
    
    const space = await client.space.findUnique({
        where: { id: spaceId }
    });
    
    if (!space || space.ownerId !== userId) {
        res.status(403).json({ message: "Only space owner can add collaborators" });
        return 
    }
    
    const collaboratorUser = await client.user.findUnique({
        where: { username: email } // Assuming email is actually username
    });
    
    if (!collaboratorUser) {
        res.status(404).json({ message: "User not found" });
        return 
    }
    
    const collaborator = await client.spaceCollaborator.create({
        data: {
            spaceId,
            userId: collaboratorUser.id,
            role
        },
        include: {
            user: {
                select: { id: true, username: true, name: true }
            }
        }
    });
    
    res.status(201).json({ message: "Collaborator added successfully", collaborator });
});

spaceRouter.get("/:spaceId/collaborators", userMiddleware, async (req, res) => {
    const userId = req.userId!;
    const { id: spaceId } = IdParamSchema.parse(req.params);
    
    const access = await checkSpaceAccess(spaceId, userId);
    if (!access) {
        res.status(404).json({ message: "Space not found or access denied" });
        return 
    }
    
    const collaborators = await client.spaceCollaborator.findMany({
        where: { spaceId },
        include: {
            user: {
                select: { id: true, username: true, name: true }
            }
        }
    });
    
    res.json({ collaborators });
});

spaceRouter.put("/:spaceId/collaborators/:userId", userMiddleware, async (req, res) => {
    const currentUserId = req.userId!;
    const { spaceId, userId: collaboratorUserId } = req.params;
    const { role } = UpdateCollaboratorRoleSchema.parse(req.body);
    
    const space = await client.space.findUnique({
        where: { id: spaceId }
    });
    
    if (!space || space.ownerId !== currentUserId) {
        res.status(403).json({ message: "Only space owner can update collaborator roles" });
        return 
    }

    
    const collaborator = await client.spaceCollaborator.update({
        where: {
            spaceId_userId: {
                spaceId,
                userId: collaboratorUserId
            }
        },
        data: { role },
        include: {
            user: {
                select: { id: true, username: true, name: true }
            }
        }
    });
    
    res.json({ message: "Collaborator role updated successfully", collaborator });
});

spaceRouter.delete("/:spaceId/collaborators/:userId", userMiddleware, async (req, res) => {
    const currentUserId = req.userId!;
    const { spaceId, userId: collaboratorUserId } = req.params;
    
    const space = await client.space.findUnique({
        where: { id: spaceId }
    });
    
    if (!space || space.ownerId !== currentUserId) {
        res.status(403).json({ message: "Only space owner can remove collaborators" });
        return
    }
    
    await client.spaceCollaborator.delete({
        where: {
            spaceId_userId: {
                spaceId,
                userId: collaboratorUserId
            }
        }
    });
    
    res.json({ message: "Collaborator removed successfully" });
});

// Space visibility
spaceRouter.put("/:spaceId/visibility", userMiddleware, async (req, res) => {
    const userId = req.userId!;
    const { id: spaceId } = IdParamSchema.parse(req.params);
    const { isPublic } = UpdateSpaceVisibilitySchema.parse(req.body);
    
    const space = await client.space.findUnique({
        where: { id: spaceId }
    });
    
    if (!space || space.ownerId !== userId) {
        res.status(403).json({ message: "Only space owner can change visibility" });
        return 
    }
    
    const updatedSpace = await client.space.update({
        where: { id: spaceId },
        data: { isPublic }
    });
    
    res.json({ message: "Space visibility updated successfully", space: updatedSpace });
});

// Space analytics
spaceRouter.get("/:spaceId/analytics", userMiddleware, async (req, res) => {
    const userId = req.userId!;
    const { id: spaceId } = IdParamSchema.parse(req.params);
    const { startDate, endDate, groupBy } = AnalyticsQuerySchema.parse(req.query);
    
    const access = await checkSpaceAccess(spaceId, userId, 'ADMIN');
    if (!access) {
        res.status(403).json({ message: "Insufficient permissions" });
        return 
    }
    
    const whereClause = {
        spaceId,
        ...(startDate && { viewedAt: { gte: new Date(startDate) } }),
        ...(endDate && { viewedAt: { lte: new Date(endDate) } })
    };
    
    const views = await client.spaceView.findMany({
        where: whereClause,
        include: {
            user: {
                select: { id: true, username: true }
            }
        },
        orderBy: { viewedAt: 'desc' }
    });
    
    const snippetCount = await client.snippet.count({
        where: { spaceId }
    });
    
    const collaboratorCount = await client.spaceCollaborator.count({
        where: { spaceId }
    });
    
    res.json({
        analytics: {
            totalViews: views.length,
            snippetCount,
            collaboratorCount,
            views: views.slice(0, 50) // Limit recent views
        },
        groupBy
    });
});

spaceRouter.get("/:spaceId/views", userMiddleware, async (req, res) => {
    const userId = req.userId!;
    const { id: spaceId } = IdParamSchema.parse(req.params);
    const { page, limit } = PaginationSchema.parse(req.query);
    const skip = (page - 1) * limit;
    
    const access = await checkSpaceAccess(spaceId, userId, 'ADMIN');
    if (!access) {
       res.status(403).json({ message: "Insufficient permissions" });
       return
    }
    
    const views = await client.spaceView.findMany({
        where: { spaceId },
        skip,
        take: limit,
        include: {
            user: {
                select: { id: true, username: true, name: true }
            }
        },
        orderBy: { viewedAt: 'desc' }
    });
    
    res.json({ views, pagination: { page, limit } });
});

// Space ordering (for snippets)
spaceRouter.put("/:spaceId/order", userMiddleware, async (req, res) => {
    const userId = req.userId!;
    const { id: spaceId } = IdParamSchema.parse(req.params);
    const { order } = UpdateSpaceOrderSchema.parse(req.body);
    
    const access = await checkSpaceAccess(spaceId, userId, 'EDITOR');
    if (!access) {
        res.status(403).json({ message: "Insufficient permissions" });
        return;
    }
    
    const space = await client.space.update({
        where: { id: spaceId },
        data: { order }
    });
    
    res.json({ message: "Snippet order updated successfully", space });
});