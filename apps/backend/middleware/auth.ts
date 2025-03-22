import { dbClient } from "db/client";
import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";

export const authMiddleware = async (req:Request,res:Response,next:NextFunction) => {
    const token = req.headers.authorization;
    if (!token) {
        console.log("No token found");
        return res.status(401).json({ message: "Unauthorized" });
    }

    const JWT_PUBLIC_KEY = process.env.CLERK_PUBLIC_KEY!;

    try {
        const result = jwt.verify(token, JWT_PUBLIC_KEY);
        const sub = result.sub as string | undefined;

        if(!result || !sub){
            console.log("Invalid token");
            return res.status(401).json({ message: "Unauthorized" });
        }
        
        console.log(result);
        req.userId = sub;

        await upsertUser(sub);

        next();
        return;
        
    } catch (error) {
        console.log("Error While Verifying the Token");
        console.log(error);
        res.status(401).json({ message: "Token Expired" });
        return;
    }
    
}

// TODO: FIX THE FLOW
const upsertUser = async (userId:string) => {
    await dbClient.user.upsert({
        where:{
            id:userId,
        },
        create:{
            id:userId,
        },
        update:{}
    })
}