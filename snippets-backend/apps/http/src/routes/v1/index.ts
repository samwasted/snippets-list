import { Router } from "express";
import { userRouter } from "./user";
import { adminRouter } from "./admin";
import { spaceRouter } from "./space";
import { SigninSchema, SignupSchema, PaginationSchema } from "../../types";
import { hash, compare } from "../../scrypt";
import jwt from "jsonwebtoken"
import client from "@repo/db"

export const router = Router()

// Authentication routes
router.post("/signup", async (req, res) => { //validated
    const parsedData = SignupSchema.safeParse(req.body)
    if (!parsedData.success) {
        res.status(400).json({ message: "Validation failed" })
        return
    }

    const hashedPassword = await hash(parsedData.data.password)
    try {
        const user = await client.user.create({
            data: {
                name: parsedData.data.name,
                username: parsedData.data.username,
                password: hashedPassword,
                role: parsedData.data.role === "admin" ? "ADMIN" : "USER"
            }
        })
        res.status(200).json({
            userId: user.id
        })

    } catch (e) {
        console.error("Error creating user:", e)
        res.status(401).json({
            message: "User already exists"
        })
    }
})

router.post("/signin", async (req, res) => { //validated
    const parsedData = SigninSchema.safeParse(req.body)
    if (!parsedData.success) {
        res.status(400).json({ message: "Validation failed" })
        return
    }
    try {
        const user = await client.user.findUnique({
            where: {
                username: parsedData.data.username
            }
        })
        if (!user) {
            res.status(401).json({ message: "User not found" })
            return
        }
        const isValid = await compare(parsedData.data.password, user?.password || "")
        if (!isValid) {
            res.status(401).json({ message: "password is incorrect" })
            return
        }
        const JWT_SECRET = process.env.JWT_SECRET;
        if (!JWT_SECRET) {
            throw new Error('JWT_SECRET environment variable is not set.');
        }
        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET || "ABC")

        res.status(200).json({
            token,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role
            }
        })
    } catch (e) {
        res.status(400).json({
            message: "Authentication failed"
        })
    }
})

router.post("/signout", async (req, res) => {
    // Since we're using stateless JWT, signout is handled client-side, we add delete token from local storage on frontend
    // We could implement token blacklisting here if needed
    res.json({
        message: "Signed out successfully",
        instruction: "Remove token from client storage"
    })
})

router.post("/refresh-token", async (req, res) => { //validated
    const header = req.headers["authorization"]
    const token = header?.split(" ")[1]

    if (!token) {
        res.status(401).json({ message: "No token provided" })
        return
    }

    try {
        const JWT_SECRET = process.env.JWT_SECRET;
        if (!JWT_SECRET) {
            throw new Error('JWT_SECRET environment variable is not set.');
        }
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string, role: string }

        // Verify user still exists and get updated info
        const user = await client.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                username: true,
                name: true,
                role: true
            }
        })

        if (!user) {
            res.status(401).json({ message: "User not found" })
            return
        }

       
        const payload = { userId: user.id, role: user.role };

        const newtoken = jwt.sign(
            payload,
            JWT_SECRET, 
            { expiresIn: '7d' }
        );

        res.json({
            token: newtoken,
            user
        })
    } catch (e) {
        res.status(401).json({ message: "Invalid or expired token" })
    }
})

router.get("/search/spaces", async (req, res) => { //validated
    const { q, page = 1, limit = 10 } = req.query
    const { page: validPage, limit: validLimit } = PaginationSchema.parse({ page, limit })
    const skip = (validPage - 1) * validLimit

    if (!q || typeof q !== 'string') {
        res.status(400).json({ message: "Search query 'q' is required" })
        return
    }

    try {
        const searchQuery = q.trim()

        // Search public spaces by name
        const [spaces, totalCount] = await Promise.all([
            client.space.findMany({
                where: {
                    AND: [
                        { isPublic: true },
                        {
                            OR: [
                                { name: { contains: searchQuery, mode: 'insensitive' } },
                                {
                                    snippets: {
                                        some: {
                                            OR: [
                                                { title: { contains: searchQuery, mode: 'insensitive' } },
                                                { description: { contains: searchQuery, mode: 'insensitive' } },
                                                { tags: { has: searchQuery } }
                                            ]
                                        }
                                    }
                                }
                            ]
                        }
                    ]
                },
                include: {
                    owner: {
                        select: {
                            id: true,
                            username: true,
                            name: true
                        }
                    },
                    _count: {
                        select: {
                            snippets: true,
                            collaborators: true,
                            views: true
                        }
                    },
                    snippets: {
                        where: {
                            OR: [
                                { title: { contains: searchQuery, mode: 'insensitive' } },
                                { description: { contains: searchQuery, mode: 'insensitive' } },
                                { tags: { has: searchQuery } }
                            ]
                        },
                        select: {
                            id: true,
                            title: true,
                            description: true,
                            tags: true,
                            totalViews: true
                        },
                        take: 3 // Show max 3 matching snippets per space
                    }
                },
                skip,
                take: validLimit,
                orderBy: [
                    { totalViews: 'desc' },
                    { updatedAt: 'desc' }
                ]
            }),
            client.space.count({
                where: {
                    AND: [
                        { isPublic: true },
                        {
                            OR: [
                                { name: { contains: searchQuery, mode: 'insensitive' } },
                                {
                                    snippets: {
                                        some: {
                                            OR: [
                                                { title: { contains: searchQuery, mode: 'insensitive' } },
                                                { description: { contains: searchQuery, mode: 'insensitive' } },
                                                { tags: { has: searchQuery } }
                                            ]
                                        }
                                    }
                                }
                            ]
                        }
                    ]
                }
            })
        ])

        // Also search for individual public snippets (from non-public spaces)
        const publicSnippets = await client.snippet.findMany({
            where: {
                AND: [
                    {
                        OR: [
                            { space: { isPublic: true } },
                            { space: null } // Snippets not in any space
                        ]
                    },
                    {
                        OR: [
                            { title: { contains: searchQuery, mode: 'insensitive' } },
                            { description: { contains: searchQuery, mode: 'insensitive' } },
                            { tags: { has: searchQuery } }
                        ]
                    }
                ]
            },
            include: {
                owner: {
                    select: {
                        id: true,
                        username: true,
                        name: true
                    }
                },
                space: {
                    select: {
                        id: true,
                        name: true,
                        isPublic: true
                    }
                }
            },
            take: validLimit,
            orderBy: [
                { totalViews: 'desc' },
                { updatedAt: 'desc' }
            ]
        })

        res.json({
            query: searchQuery,
            spaces: {
                results: spaces,
                total: totalCount,
                page: validPage,
                limit: validLimit,
                totalPages: Math.ceil(totalCount / validLimit)
            },
            snippets: {
                results: publicSnippets,
                total: publicSnippets.length
            }
        })
    } catch (e) {
        console.error("Search error:", e)
        res.status(500).json({ message: "Search failed" })
    }
})

// Health check route
router.get("/health", (req, res) => { //validated
    res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        service: "code-sharing-api"
    })
})

// Sub-routers
router.use("/user", userRouter)
router.use("/space", spaceRouter)
router.use("/admin", adminRouter)