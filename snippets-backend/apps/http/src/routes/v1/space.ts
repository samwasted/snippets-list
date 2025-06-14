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
import client from "@repo/db";

export const spaceRouter = Router();

// Helper function to check if user is global admin
const isGlobalAdmin = async (userId: string): Promise<boolean> => {
    const user = await client.user.findUnique({
        where: { id: userId },
        select: { role: true }
    });
    return user?.role === 'ADMIN';
};

// Updated helper function to check space access with global admin override
const checkSpaceAccess = async (
    spaceId: string, 
    userId: string, 
    requiredRole: 'VIEWER' | 'EDITOR' | 'ADMIN' = 'VIEWER'
) => {
    // Check if user is global admin first
    const isAdmin = await isGlobalAdmin(userId);
    if (isAdmin) {
        const space = await client.space.findUnique({
            where: { id: spaceId },
            include: {
                owner: { select: { id: true, username: true, name: true } }
            }
        });
        return space ? { space, role: 'GLOBAL_ADMIN' as const } : null;
    }

    // Original access check logic
    const [space, userCollaboration] = await Promise.all([
        client.space.findUnique({
            where: { id: spaceId },
            include: {
                owner: { select: { id: true, username: true, name: true } }
            }
        }),
        client.spaceCollaborator.findUnique({
            where: {
                spaceId_userId: {
                    spaceId: spaceId,
                    userId: userId
                }
            }
        })
    ]);

    if (!space) return null;
    
    type Role = 'VIEWER' | 'EDITOR' | 'ADMIN' | 'OWNER';
    let userRole: Role;
    if (space.ownerId === userId) {
        userRole = 'OWNER';
    } else if (space.isPublic && !userCollaboration && requiredRole === 'VIEWER') {
        userRole = 'VIEWER';
    } else if (userCollaboration) {
        userRole = userCollaboration.role as Role;
    } else {
        return null;
    }
    
    const roleHierarchy: Record<Role, number> = { 'VIEWER': 1, 'EDITOR': 2, 'ADMIN': 3, 'OWNER': 4 };
    const hasPermission = roleHierarchy[userRole] >= roleHierarchy[requiredRole as Role];
    
    return hasPermission ? { space, role: userRole } : null;
};

// Updated space creation with admin override
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

// All spaces of authenticated user (with admin override to see all spaces)
spaceRouter.get("/all", userMiddleware, async (req, res) => {
    const userId = req.userId!;
    const { page, limit } = PaginationSchema.parse(req.query);
    const skip = (page - 1) * limit;
    const isAdmin = await isGlobalAdmin(userId);
    
    let whereClause;
    if (isAdmin) {
        // Global admin can see all spaces
        whereClause = {};
    } else {
        // Regular users see only their own spaces or ones they collaborate on
        whereClause = {
            OR: [
                { ownerId: userId },
                { collaborators: { some: { userId } } }
            ]
        };
    }
    
    const spaces = await client.space.findMany({
        where: whereClause,
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

// Public spaces (unchanged)
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

// Get single space (with admin access)
spaceRouter.get("/:id", userMiddleware, async (req, res) => {
    const userId = req.userId!;
    const { id: spaceId } = IdParamSchema.parse(req.params);
    
    const access = await checkSpaceAccess(spaceId, userId);
    if (!access) {
        res.status(404).json({ message: "Space not found or access denied" });
        return;
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
    
    // Record view if not owner and not global admin
    if (access.role !== 'OWNER' && access.role !== 'GLOBAL_ADMIN') {
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

// Update space (with admin override)
spaceRouter.put("/:id", userMiddleware, async (req, res) => {
    const userId = req.userId!;
    const { id: spaceId } = IdParamSchema.parse(req.params);
    const validatedData = UpdateSpaceSchema.parse(req.body);
    
    const access = await checkSpaceAccess(spaceId, userId, 'ADMIN');
    if (!access) {
        res.status(403).json({ message: "Insufficient permissions" });
        return;
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

// Updated space deletion with admin override
spaceRouter.delete("/:id", userMiddleware, async (req, res) => {
    const userId = req.userId!;
    const { id: spaceId } = IdParamSchema.parse(req.params);
    
    const space = await client.space.findUnique({
        where: { id: spaceId }
    });
    
    if (!space) {
        res.status(404).json({ message: "Space not found" });
        return;
    }
    
    const isAdmin = await isGlobalAdmin(userId);
    
    if (space.ownerId !== userId && !isAdmin) {
        res.status(403).json({ message: "Only space owner or global admin can delete the space" });
        return;
    }
    
    await client.space.delete({
        where: { id: spaceId }
    });
    
    res.json({ message: "Space deleted successfully" });
});

// Snippet management within space (with admin access)
spaceRouter.post("/:id/snippet", userMiddleware, async (req, res) => {
    const userId = req.userId!;
    const { id: spaceId } = IdParamSchema.parse(req.params);
    const validatedData = CreateSnippetSchema.parse(req.body);
    
    const access = await checkSpaceAccess(spaceId, userId, 'EDITOR');
    if (!access) {
        res.status(403).json({ message: "Insufficient permissions" });
        return;
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

spaceRouter.get("/:id/snippets", userMiddleware, async (req, res) => {
    const userId = req.userId!;
    const { id: spaceId } = IdParamSchema.parse(req.params);
    
    const access = await checkSpaceAccess(spaceId, userId);
    if (!access) {
        res.status(404).json({ message: "Space not found or access denied" });
        return;
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

spaceRouter.put("/:id/snippet/:snippetId", userMiddleware, async (req, res) => {
    const userId = req.userId!;
    const { id: spaceId, snippetId } = req.params;
    const validatedData = UpdateSnippetSchema.parse(req.body);
    
    const access = await checkSpaceAccess(spaceId, userId, 'EDITOR');
    if (!access) {
        res.status(403).json({ message: "Insufficient permissions" });
        return;
    }
    
    const snippet = await client.snippet.findFirst({
        where: { id: snippetId, spaceId }
    });
    
    if (!snippet) {
        res.status(404).json({ message: "Snippet not found in this space" });
        return;
    }
    
    const updatedSnippet = await client.snippet.update({
        where: { id: snippetId },
        data: validatedData
    });
    
    res.json({ message: "Snippet updated successfully", snippet: updatedSnippet });
});

spaceRouter.delete("/:id/snippet/:snippetId", userMiddleware, async (req, res) => {
    const userId = req.userId!;
    const { id: spaceId, snippetId } = req.params;
    
    const access = await checkSpaceAccess(spaceId, userId, 'EDITOR');
    if (!access) {
        res.status(403).json({ message: "Insufficient permissions" });
        return;
    }
    
    const snippet = await client.snippet.findFirst({
        where: { id: snippetId, spaceId }
    });
    
    if (!snippet) {
        res.status(404).json({ message: "Snippet not found in this space" });
        return;
    }
    
    await client.snippet.delete({
        where: { id: snippetId }
    });
    
    res.json({ message: "Snippet deleted successfully" });
});

// Updated collaborator management with admin override
spaceRouter.post("/:id/collaborators", userMiddleware, async (req, res) => {
    const userId = req.userId!;
    const { id: spaceId } = IdParamSchema.parse(req.params);
    const { username, role } = AddCollaboratorSchema.parse(req.body);
    
    const space = await client.space.findUnique({
        where: { id: spaceId }
    });
    
    if (!space) {
        res.status(404).json({ message: "Space not found" });
        return;
    }
    
    const isAdmin = await isGlobalAdmin(userId);
    
    if (space.ownerId !== userId && !isAdmin) {
        res.status(403).json({ message: "Only space owner or global admin can add collaborators" });
        return;
    }
    
    const collaboratorUser = await client.user.findUnique({
        where: { username: username } 
    });
    
    if (!collaboratorUser) {
        res.status(404).json({ message: "User not found" });
        return;
    }
    
    if (collaboratorUser.id === space.ownerId) {
        res.status(400).json({ message: "Cannot add space owner as a collaborator" });
        return;
    }
    
    const existingCollaborator = await client.spaceCollaborator.findUnique({
        where: {
            spaceId_userId: {
                spaceId: spaceId,
                userId: collaboratorUser.id
            }
        }
    });
    
    if (existingCollaborator) {
        res.status(400).json({ message: "User is already a collaborator" });
        return;
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

spaceRouter.get("/:id/collaborators", userMiddleware, async (req, res) => {
    const userId = req.userId!;
    const { id: spaceId } = IdParamSchema.parse(req.params);
    
    const access = await checkSpaceAccess(spaceId, userId);
    if (!access) {
        res.status(404).json({ message: "Space not found or access denied" });
        return;
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

// Updated collaborator role update with admin override
spaceRouter.put("/:id/collaborators/:userId", userMiddleware, async (req, res) => {
    const currentUserId = req.userId!;
    const { id: spaceId, userId: collaboratorUserId } = req.params;
    const { role } = UpdateCollaboratorRoleSchema.parse(req.body);
    
    const space = await client.space.findUnique({
        where: { id: spaceId }
    });
    
    if (!space) {
        res.status(404).json({ message: "Space not found" });
        return;
    }
    
    const isAdmin = await isGlobalAdmin(currentUserId);
    
    if (space.ownerId !== currentUserId && !isAdmin) {
        res.status(403).json({ message: "Only space owner or global admin can update collaborator roles" });
        return;
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

// Updated collaborator removal with admin override
spaceRouter.delete("/:id/collaborators/:userId", userMiddleware, async (req, res) => {
    const currentUserId = req.userId!;
    const { id: spaceId, userId: collaboratorUserId } = req.params;
    
    const space = await client.space.findUnique({
        where: { id: spaceId }
    });
    
    if (!space) {
        res.status(404).json({ message: "Space not found" });
        return;
    }
    
    const isAdmin = await isGlobalAdmin(currentUserId);
    
    if (space.ownerId !== currentUserId && !isAdmin) {
        res.status(403).json({ message: "Only space owner or global admin can remove collaborators" });
        return;
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

// Updated space visibility with admin override
spaceRouter.put("/:id/visibility", userMiddleware, async (req, res) => {
    const userId = req.userId!;
    const { id: spaceId } = IdParamSchema.parse(req.params);
    const { isPublic } = UpdateSpaceVisibilitySchema.parse(req.body);
    
    const space = await client.space.findUnique({
        where: { id: spaceId }
    });
    
    if (!space) {
        res.status(404).json({ message: "Space not found" });
        return;
    }
    
    const isAdmin = await isGlobalAdmin(userId);
    
    if (space.ownerId !== userId && !isAdmin) {
        res.status(403).json({ message: "Only space owner or global admin can change visibility" });
        return;
    }
    
    const updatedSpace = await client.space.update({
        where: { id: spaceId },
        data: { isPublic }
    });
    
    res.json({ message: "Space visibility updated successfully", space: updatedSpace });
});

// Space analytics (with admin access)
spaceRouter.get("/:id/analytics", userMiddleware, async (req, res) => {
    const userId = req.userId!;
    const { id: spaceId } = IdParamSchema.parse(req.params);
    const { startDate, endDate, groupBy } = AnalyticsQuerySchema.parse(req.query);
    
    const access = await checkSpaceAccess(spaceId, userId, 'ADMIN');
    if (!access) {
        res.status(403).json({ message: "Insufficient permissions" });
        return;
    }
    
    const dateFilter: any = {};
    if (startDate && endDate) {
        dateFilter.viewedAt = {
            gte: new Date(startDate as string),
            lte: new Date(endDate as string)
        };
    } else if (startDate) {
        dateFilter.viewedAt = {
            gte: new Date(startDate as string)
        };
    } else if (endDate) {
        dateFilter.viewedAt = {
            lte: new Date(endDate as string)
        };
    }
    
    const whereClause = {
        spaceId,
        ...dateFilter
    };
    
    const views = await client.spaceView.findMany({
        where: whereClause,
        include: {
            user: {
                select: { id: true, username: true, name: true }
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
            views: views
        },
        groupBy
    });
});

// Space views (with admin access)
spaceRouter.get("/:id/views", userMiddleware, async (req, res) => {
    const userId = req.userId!;
    const { id: spaceId } = IdParamSchema.parse(req.params);
    const { page, limit } = PaginationSchema.parse(req.query);
    const skip = (page - 1) * limit;
    
    const access = await checkSpaceAccess(spaceId, userId, 'ADMIN');
    if (!access) {
       res.status(403).json({ message: "Insufficient permissions" });
       return;
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

// Space ordering (with admin access)
spaceRouter.put("/:id/order", userMiddleware, async (req, res) => {
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

// Collaborators metadata (with admin access)
spaceRouter.get("/:id/collaborators/metadata", userMiddleware, async (req, res) => {
    const userId = req.userId!;
    const { id: spaceId } = IdParamSchema.parse(req.params);
    
    const access = await checkSpaceAccess(spaceId, userId);
    if (!access) {
        res.status(404).json({ message: "Space not found or access denied" });
        return;
    }
    
    const collaborators = await client.spaceCollaborator.findMany({
        where: { spaceId },
        include: {
            user: {
                select: { 
                    id: true, 
                    username: true, 
                    name: true,
                    role: true,
                    createdAt: true
                }
            }
        },
        orderBy: { user: { username: 'asc' } }
    });
    
    const space = await client.space.findUnique({
        where: { id: spaceId },
        select: {
            id: true,
            name: true,
            owner: {
                select: {
                    id: true,
                    username: true,
                    name: true
                }
            }
        }
    });
    
    const collaboratorsMetadata = collaborators.map(collaborator => ({
        collaborationId: collaborator.id,
        spaceRole: collaborator.role,
        user: {
            ...collaborator.user,
            accountAge: Math.floor((Date.now() - collaborator.user.createdAt.getTime()) / (1000 * 60 * 60 * 24))
        }
    }));
    
    res.json({
        space: space,
        collaborators: collaboratorsMetadata,
        summary: {
            totalCollaborators: collaborators.length,
            roleDistribution: {
                ADMIN: collaborators.filter(c => c.role === 'ADMIN').length,
                EDITOR: collaborators.filter(c => c.role === 'EDITOR').length,
                VIEWER: collaborators.filter(c => c.role === 'VIEWER').length
            }
        }
    });
});
