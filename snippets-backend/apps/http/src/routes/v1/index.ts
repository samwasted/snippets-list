import { Router } from "express";
import { userRouter } from "./user";
import { adminRouter } from "./admin";
import { spaceRouter } from "./space";

export const router = Router()

// Authentication routes
router.post("/signup", async (req, res) => {
    res.json({ message: "User Signup" })
})

router.post("/signin", async (req, res) => {
    res.json({ message: "User Signin" })
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