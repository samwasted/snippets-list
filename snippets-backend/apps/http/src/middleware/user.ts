import jwt from "jsonwebtoken"
import { JWT_PASSWORD } from "../config"
import { NextFunction, Request, Response } from "express"

declare global {
    namespace Express {
        interface Request {
            userId?: string;
            role?: "ADMIN" | "USER"; //check caps
        }
    }
}

export const userMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers["authorization"]
    const token = header?.split(" ")[1]

    if (!token) {
        res.status(403).json({ message: "Unauthorized" })
        return
    }

    try {
        const decoded = jwt.verify(token, JWT_PASSWORD) as { role: string, userId: string }
        req.userId = decoded.userId
        next()
    } catch (e) {
        res.status(401).json({ message: "Unauthorized" })
        return
    }
}