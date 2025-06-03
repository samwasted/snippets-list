import { Router } from "express";

export const userRouter = Router()

// User metadata
userRouter.post("/metadata", (req, res) => {
    res.json({ message: "Create User Metadata" })
})

userRouter.get("/metadata", (req, res) => {
    res.json({ message: "Get User Metadata" })
})

userRouter.put("/metadata", (req, res) => {
    res.json({ message: "Update User Metadata" })
})

userRouter.get("/metadata/bulk", (req, res) => {
    res.json({ message: "Get Bulk User Metadata" })
})

// User profile
userRouter.get("/profile", (req, res) => {
    res.json({ message: "Get User Profile" })
})

userRouter.put("/profile", (req, res) => {
    res.json({ message: "Update User Profile" })
})

// User spaces
userRouter.get("/spaces", (req, res) => {
    res.json({ message: "Get User Spaces" })
})

userRouter.get("/spaces/collaborating", (req, res) => {
    res.json({ message: "Get Collaborating Spaces" })
})

// User snippets
userRouter.get("/snippets", (req, res) => {
    res.json({ message: "Get User Snippets" })
})

// User analytics
userRouter.get("/analytics/views", (req, res) => {
    res.json({ message: "Get User View Analytics" })
})

userRouter.get("/analytics/activity", (req, res) => {
    res.json({ message: "Get User Activity" })
})

// Notifications
userRouter.get("/notifications", (req, res) => {
    res.json({ message: "Get User Notifications" })
})

userRouter.put("/notifications/:notificationId/read", (req, res) => {
    res.json({ message: "Mark Notification as Read" })
})
