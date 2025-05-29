import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { registrationSchema, loginSchema, insertCharacterSchema, insertMessageSchema, chatRooms } from "@shared/schema";
import { db } from "./db";
import { z } from "zod";
import session from "express-session";
import connectPg from "connect-pg-simple";

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Debug middleware for chat endpoints
  app.use('/api/chat/*', (req, res, next) => {
    console.log(`${req.method} ${req.path} - Query:`, req.query);
    next();
  });
  // Session configuration
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  app.use(session({
    secret: process.env.SESSION_SECRET || "rpg-realm-secret-key",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      maxAge: sessionTtl,
    },
  }));

  // Middleware to check authentication
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  const requireAdmin = async (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    req.user = user;
    next();
  };

  // Auth routes
  app.get("/api/auth/user", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const characters = await storage.getCharactersByUserId(user.id);
      
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        characters,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      const user = await storage.validateUser(username, password);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.userId = user.id;
      
      const characters = await storage.getCharactersByUserId(user.id);
      
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        characters,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Could not log out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = registrationSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(data.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(data.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Validate invite code
      const inviteCode = await storage.getInviteCode(data.inviteCode);
      if (!inviteCode || inviteCode.isUsed) {
        return res.status(400).json({ message: "Invalid or already used invite code" });
      }

      // Hash password
      const hashedPassword = await storage.hashPassword(data.password);

      // Create user
      const user = await storage.createUser({
        username: data.username,
        email: data.email,
        password: hashedPassword,
        role: "user",
      });

      // Use invite code
      await storage.useInviteCode(data.inviteCode, user.id);

      // Create character
      const character = await storage.createCharacter({
        userId: user.id,
        firstName: data.firstName,
        middleName: data.middleName,
        lastName: data.lastName,
        birthDate: data.birthDate,
      });

      // Log user in
      req.session.userId = user.id;

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        characters: [character],
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // User routes
  app.get("/api/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const usersWithCharacters = await Promise.all(
        users.map(async (user) => {
          const characters = await storage.getCharactersByUserId(user.id);
          return {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
            characters,
          };
        })
      );
      res.json(usersWithCharacters);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch("/api/users/:id/role", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      
      if (!["user", "admin"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const user = await storage.updateUserRole(parseInt(id), role);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "Role updated successfully", user });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Character routes
  app.patch("/api/characters/:id", requireAuth, async (req, res) => {
    try {
      const characterId = parseInt(req.params.id);
      const userId = req.session.userId!;
      
      // Check if the character belongs to the authenticated user
      const character = await storage.getCharacter(characterId);
      if (!character || character.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { firstName, middleName, lastName, birthDate } = req.body;
      
      const updatedCharacter = await storage.updateCharacter(characterId, {
        firstName,
        middleName,
        lastName,
        birthDate,
      });
      
      if (!updatedCharacter) {
        return res.status(404).json({ message: "Character not found" });
      }
      
      res.json(updatedCharacter);
    } catch (error) {
      console.error("Error updating character:", error);
      res.status(500).json({ message: "Failed to update character" });
    }
  });

  app.get("/api/characters/online", requireAuth, async (req, res) => {
    try {
      // Return all active characters from all users (representing online players)
      const users = await storage.getAllUsers();
      const onlineCharacters = [];
      
      for (const user of users) {
        const characters = await storage.getCharactersByUserId(user.id);
        for (const character of characters) {
          if (character.isActive) {
            onlineCharacters.push({
              id: character.id,
              fullName: `${character.firstName}${character.middleName ? ` ${character.middleName}` : ''} ${character.lastName}`,
              firstName: character.firstName,
              lastName: character.lastName,
              location: "Hlavní chat",
            });
          }
        }
      }
      
      console.log("Returning all online characters:", onlineCharacters);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.json(onlineCharacters);
    } catch (error) {
      console.error("Error fetching online characters:", error);
      res.status(500).json({ message: "Failed to fetch online characters" });
    }
  });

  // Admin routes
  app.post("/api/admin/invite-codes", requireAdmin, async (req, res) => {
    try {
      const { code } = req.body;
      
      if (!code || code.length < 6) {
        return res.status(400).json({ message: "Invite code must be at least 6 characters long" });
      }

      const existingCode = await storage.getInviteCode(code);
      if (existingCode) {
        return res.status(400).json({ message: "Invite code already exists" });
      }

      const inviteCode = await storage.createInviteCode({ code });
      res.json(inviteCode);
    } catch (error) {
      console.error("Error creating invite code:", error);
      res.status(500).json({ message: "Failed to create invite code" });
    }
  });

  // Initialize test data
  app.post("/api/admin/init-test-data", async (req, res) => {
    try {
      // Create test invite codes
      const testCodes = ["WELCOME2024", "ADMIN_INVITE", "USER_INVITE"];
      for (const code of testCodes) {
        const existing = await storage.getInviteCode(code);
        if (!existing) {
          await storage.createInviteCode({ code });
        }
      }

      // Create test admin user
      const adminExists = await storage.getUserByUsername("TesterAdmin");
      if (!adminExists) {
        const hashedPassword = await storage.hashPassword("admin123");
        const adminUser = await storage.createUser({
          username: "TesterAdmin",
          email: "admin@rpg-realm.cz",
          password: hashedPassword,
          role: "admin",
        });

        await storage.createCharacter({
          userId: adminUser.id,
          firstName: "Správce",
          lastName: "Systému",
          birthDate: "1990-01-01",
        });
      }

      // Create test regular user
      const userExists = await storage.getUserByUsername("TesterUživatel");
      if (!userExists) {
        const hashedPassword = await storage.hashPassword("user123");
        const regularUser = await storage.createUser({
          username: "TesterUživatel",
          email: "user@rpg-realm.cz",
          password: hashedPassword,
          role: "user",
        });

        await storage.createCharacter({
          userId: regularUser.id,
          firstName: "Jan",
          lastName: "Novák",
          birthDate: "1995-05-15",
        });
      }

      res.json({ message: "Test data initialized successfully" });
    } catch (error) {
      console.error("Error initializing test data:", error);
      res.status(500).json({ message: "Failed to initialize test data" });
    }
  });

  // Chat API endpoints
  app.get("/api/chat/rooms", (req, res) => {
    const rooms = [
      {
        id: 1,
        name: "Hlavní chat",
        description: "Hlavní herní místnost pro všechny hráče",
        isPublic: true,
        createdAt: "2025-05-28T15:00:00Z"
      },
      {
        id: 2,
        name: "Testovací chat", 
        description: "Místnost pro testování a experimenty",
        isPublic: true,
        createdAt: "2025-05-28T15:00:00Z"
      }
    ];
    
    res.setHeader('Content-Type', 'application/json');
    res.json(rooms);
  });

  app.get("/api/chat/rooms/:roomId/messages", requireAuth, async (req, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      console.log("GET /api/chat/rooms/:roomId/messages - roomId:", roomId);
      
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const messages = await storage.getMessagesByRoom(roomId, limit, offset);
      console.log("Fetched messages:", messages.length, "messages");
      if (messages.length > 0) {
        console.log("First message (should be newest):", messages[0].id, messages[0].content);
        console.log("Last message (should be oldest):", messages[messages.length-1].id, messages[messages.length-1].content);
      }
      
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.get("/api/chat/messages", requireAuth, async (req, res) => {
    try {
      const roomId = parseInt(req.query.roomId as string);
      console.log("GET /api/chat/messages - roomId:", roomId);
      
      if (!roomId) {
        console.log("Missing roomId parameter");
        return res.status(400).json({ message: "roomId is required" });
      }
      
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const messages = await storage.getMessagesByRoom(roomId, limit, offset);
      console.log("Fetched messages:", messages.length, "messages");
      console.log("Sample message:", messages[0]);
      
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/chat/messages", requireAuth, async (req, res) => {
    try {
      console.log("POST /api/chat/messages - Request body:", req.body);
      const { roomId, characterId, content, messageType } = req.body;
      
      if (!roomId || !characterId || !content) {
        console.log("Missing required fields:", { roomId, characterId, content });
        return res.status(400).json({ message: "roomId, characterId, and content are required" });
      }
      
      if (content.length < 1 || content.length > 5000) {
        console.log("Invalid content length:", content.length);
        return res.status(400).json({ message: "Message content must be 1-5000 characters" });
      }
      
      const messageData = {
        roomId: parseInt(roomId),
        characterId: parseInt(characterId),
        content: content.trim(),
        messageType: messageType || "text"
      };
      
      console.log("Creating message with data:", messageData);
      const message = await storage.createMessage(messageData);
      console.log("Message created successfully:", message);
      
      res.json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  app.post("/api/chat/rooms/:roomId/archive", requireAuth, async (req, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      const beforeDate = req.body.beforeDate ? new Date(req.body.beforeDate) : undefined;
      
      const archivedCount = await storage.archiveMessages(roomId, beforeDate);
      res.json({ message: `Archived ${archivedCount} messages`, count: archivedCount });
    } catch (error) {
      console.error("Error archiving messages:", error);
      res.status(500).json({ message: "Failed to archive messages" });
    }
  });

  app.get("/api/chat/rooms/:roomId/export", requireAuth, async (req, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      const messages = await storage.getMessagesByRoom(roomId, 1000, 0);
      
      const exportData = messages.map(msg => ({
        timestamp: msg.createdAt,
        character: `${msg.character.firstName}${msg.character.middleName ? ` ${msg.character.middleName}` : ''} ${msg.character.lastName}`,
        message: msg.content,
        type: msg.messageType,
      }));

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="chat-export-${roomId}-${new Date().toISOString().split('T')[0]}.json"`);
      res.json(exportData);
    } catch (error) {
      console.error("Error exporting chat:", error);
      res.status(500).json({ message: "Failed to export chat" });
    }
  });

  const httpServer = createServer(app);
  
  // WebSocket server for real-time chat
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store active WebSocket connections with user info
  const activeConnections = new Map<WebSocket, { userId: number; characterId?: number }>();

  wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection');
    
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'authenticate':
            // In a real implementation, you'd verify the session here
            activeConnections.set(ws, { 
              userId: message.userId, 
              characterId: message.characterId 
            });
            ws.send(JSON.stringify({ type: 'authenticated', success: true }));
            break;
            
          case 'chat_message':
            const connectionInfo = activeConnections.get(ws);
            if (!connectionInfo?.characterId) {
              ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }));
              return;
            }

            // Validate message content
            const validatedMessage = insertMessageSchema.parse({
              roomId: message.roomId,
              characterId: connectionInfo.characterId,
              content: message.content,
              messageType: message.messageType || 'message',
            });

            // Save message to database
            console.log("WebSocket saving message:", validatedMessage);
            const savedMessage = await storage.createMessage(validatedMessage);
            console.log("WebSocket message saved:", savedMessage);
            
            // Get character info for broadcast
            const character = await storage.getCharacter(connectionInfo.characterId);
            if (!character) return;

            // Broadcast to all connected clients
            const broadcastMessage = {
              type: 'new_message',
              message: {
                ...savedMessage,
                character: {
                  firstName: character.firstName,
                  middleName: character.middleName,
                  lastName: character.lastName,
                }
              }
            };

            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(broadcastMessage));
              }
            });
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      activeConnections.delete(ws);
      console.log('WebSocket connection closed');
    });
  });

  // Initialize default chat rooms if they don't exist
  (async () => {
    try {
      const mainRoom = await storage.getChatRoomByName("Hlavní chat");
      if (!mainRoom) {
        await storage.createChatRoom({
          name: "Hlavní chat",
          description: "Hlavní herní místnost pro všechny hráče",
          isPublic: true,
        });
        console.log("Created default chat room: Hlavní chat");
      }

      const testRoom = await storage.getChatRoomByName("Testovací chat");
      if (!testRoom) {
        await storage.createChatRoom({
          name: "Testovací chat",
          description: "Místnost pro testování a experimenty",
          isPublic: true,
        });
        console.log("Created test chat room: Testovací chat");
      }
    } catch (error) {
      console.error("Error initializing chat rooms:", error);
    }
  })();

  return httpServer;
}
