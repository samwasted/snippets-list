import { Router } from "express";
import { userRouter } from "./user";
import { adminRouter } from "./admin";
import { spaceRouter } from "./space";
import { SigninSchema, SignupSchema } from "../../types";
import { hash, compare } from "../../scrypt";
import jwt from "jsonwebtoken"
import client from "@repo/db"
import { JWT_PASSWORD } from "../../config";
export const router = Router()

// Authentication routes
router.post("/signup", async (req, res) => {
    //check the user
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
                role: parsedData.data.type === "admin" ? "ADMIN" : "USER" //database requires "ADMIN" or "USER" 
            }

        })
        res.status(200).json({
            userId: user.id //abhi ke liye yehi
        })

    } catch (e) {
        console.error("Error creating user:", e)
        res.status(401).json({
            message: "User already exists"
        })
    }
})

router.post("/signin", async (req, res) => {
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
        const token = jwt.sign(
            { userId: user.id, role: user.role }, //payload
            process.env.JWT_PASSWORD || JWT_PASSWORD)

        res.status(200).json({
            token
        })
    } catch (e) {
    res.status(400).json({
        message: "User already exists"
    })
}
})

router.post("/signout", async (req, res) => {
    res.json({ message: "User Signout" })
})

router.post("/refresh-token", async (req, res) => {
    res.json({ message: "Refresh Authentication Token" })
})

router.get("/search/spaces", async (req, res) => {
    res.json({ message: "Search Spaces" })
})

// Health check
router.get("/health", async (req, res) => {
    res.json({ message: "API Health Check", status: "OK" })
})

// Sub-routers
router.use("/user", userRouter)
router.use("/space", spaceRouter)
router.use("/admin", adminRouter)