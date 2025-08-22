import jwt from "jsonwebtoken";
import type { Express, RequestHandler } from "express";
import { storage } from "./storage";

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export interface JWTPayload {
  userId: string;
  username: string;
  role: string;
  iat: number;
  exp: number;
}

export function generateToken(user: { id: string; username: string; role: string }): string {
  const payload = {
    userId: user.id,
    username: user.username,
    role: user.role,
  };
  
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: JWT_EXPIRES_IN,
    algorithm: 'HS256'
  } as jwt.SignOptions);
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

export function generateAssociateCode(): string {
  // Generate a simple 6-character alphanumeric code
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  
  if (!payload) {
    return res.status(401).json({ message: "Invalid token" });
  }

  try {
    const user = await storage.getUser(payload.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "User not found or inactive" });
    }

    // Add user info to request object
    (req as any).user = user;
    next();
  } catch (error) {
    res.status(500).json({ message: "Authentication check failed" });
  }
};

export const requireAdmin: RequestHandler = async (req, res, next) => {
  console.log(`🔐 requireAdmin middleware called for ${req.method} ${req.path}`);
  const user = (req as any).user;
  
  if (!user || user.role !== "admin") {
    console.log(`❌ Admin access denied for user:`, user?.role || "no user");
    return res.status(403).json({ message: "Admin access required" });
  }
  
  console.log(`✅ Admin access granted for user: ${user.role}`);
  next();
};

export async function setupAuth(app: Express) {
  // Login endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { associateCode } = req.body;
      
      if (!associateCode) {
        return res.status(400).json({ message: "Associate code required" });
      }

      const user = await storage.getUserByAssociateCode(associateCode);
      if (!user || !user.isActive) {
        return res.status(401).json({ message: "Invalid associate code" });
      }

      const token = generateToken({
        id: user.id,
        username: user.username,
        role: user.role || "associate"
      });

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          associateCode: user.associateCode,
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Create associate endpoint (admin only)
  app.post("/api/auth/create-associate", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { username, firstName, lastName, email, role = "associate" } = req.body;
      
      if (!username || !firstName || !lastName) {
        return res.status(400).json({ message: "Username, first name, and last name required" });
      }

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }

      const associateCode = generateAssociateCode();
      
      const user = await storage.createUser({
        username,
        associateCode,
        firstName,
        lastName,
        email: email || null,
        role,
        isActive: true,
      });

      res.status(201).json({
        user: {
          id: user.id,
          username: user.username,
          associateCode: user.associateCode,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
        }
      });
    } catch (error) {
      console.error("Create associate error:", error);
      res.status(500).json({ message: "Failed to create associate" });
    }
  });

  // Get current user endpoint
  app.get("/api/auth/user", isAuthenticated, async (req, res) => {
    const user = (req as any).user;
    res.json({
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    });
  });

  // Logout endpoint (client-side token removal)
  app.post("/api/auth/logout", (req, res) => {
    res.json({ message: "Logged out successfully" });
  });
}