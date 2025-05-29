import {
  users,
  characters,
  inviteCodes,
  chatRooms,
  messages,
  archivedMessages,
  type User,
  type InsertUser,
  type Character,
  type InsertCharacter,
  type InviteCode,
  type InsertInviteCode,
  type ChatRoom,
  type InsertChatRoom,
  type Message,
  type InsertMessage,
  type ArchivedMessage,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, lt } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserRole(id: number, role: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
  // Character operations
  getCharacter(id: number): Promise<Character | undefined>;
  getCharactersByUserId(userId: number): Promise<Character[]>;
  createCharacter(character: InsertCharacter): Promise<Character>;
  updateCharacter(id: number, updates: Partial<InsertCharacter>): Promise<Character | undefined>;
  
  // Invite code operations
  getInviteCode(code: string): Promise<InviteCode | undefined>;
  createInviteCode(code: InsertInviteCode): Promise<InviteCode>;
  useInviteCode(code: string, userId: number): Promise<boolean>;
  
  // Authentication
  validateUser(username: string, password: string): Promise<User | null>;
  hashPassword(password: string): Promise<string>;
  
  // Chat operations
  getChatRoom(id: number): Promise<ChatRoom | undefined>;
  getChatRoomByName(name: string): Promise<ChatRoom | undefined>;
  createChatRoom(room: InsertChatRoom): Promise<ChatRoom>;
  getAllChatRooms(): Promise<ChatRoom[]>;
  
  // Message operations
  getMessage(id: number): Promise<Message | undefined>;
  getMessagesByRoom(roomId: number, limit?: number, offset?: number): Promise<(Message & { character: { firstName: string; middleName?: string | null; lastName: string } })[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  deleteMessage(id: number): Promise<boolean>;
  
  // Archive operations
  archiveMessages(roomId: number, beforeDate?: Date): Promise<number>;
  getArchivedMessages(roomId: number, limit?: number, offset?: number): Promise<ArchivedMessage[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        updatedAt: new Date(),
      })
      .returning();
    return user;
  }

  async updateUserRole(id: number, role: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Character operations
  async getCharacter(id: number): Promise<Character | undefined> {
    const [character] = await db.select().from(characters).where(eq(characters.id, id));
    return character;
  }

  async getCharactersByUserId(userId: number): Promise<Character[]> {
    return await db.select().from(characters).where(eq(characters.userId, userId));
  }

  async createCharacter(insertCharacter: InsertCharacter): Promise<Character> {
    const [character] = await db
      .insert(characters)
      .values({
        ...insertCharacter,
        updatedAt: new Date(),
      })
      .returning();
    return character;
  }

  async updateCharacter(id: number, updates: Partial<InsertCharacter>): Promise<Character | undefined> {
    const [character] = await db
      .update(characters)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(characters.id, id))
      .returning();
    return character;
  }

  // Invite code operations
  async getInviteCode(code: string): Promise<InviteCode | undefined> {
    const [inviteCode] = await db.select().from(inviteCodes).where(eq(inviteCodes.code, code));
    return inviteCode;
  }

  async createInviteCode(insertInviteCode: InsertInviteCode): Promise<InviteCode> {
    const [inviteCode] = await db
      .insert(inviteCodes)
      .values(insertInviteCode)
      .returning();
    return inviteCode;
  }

  async useInviteCode(code: string, userId: number): Promise<boolean> {
    const [result] = await db
      .update(inviteCodes)
      .set({ 
        isUsed: true, 
        usedBy: userId, 
        usedAt: new Date() 
      })
      .where(and(
        eq(inviteCodes.code, code),
        eq(inviteCodes.isUsed, false)
      ))
      .returning();
    
    return !!result;
  }

  // Authentication
  async validateUser(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (!user) return null;
    
    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }

  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 12);
  }

  // Chat operations
  async getChatRoom(id: number): Promise<ChatRoom | undefined> {
    const result = await db.select().from(chatRooms).where(eq(chatRooms.id, id));
    return result[0];
  }

  async getChatRoomByName(name: string): Promise<ChatRoom | undefined> {
    const result = await db.select().from(chatRooms).where(eq(chatRooms.name, name));
    return result[0];
  }

  async createChatRoom(insertChatRoom: InsertChatRoom): Promise<ChatRoom> {
    const result = await db.insert(chatRooms).values(insertChatRoom).returning();
    return result[0];
  }

  async getAllChatRooms(): Promise<ChatRoom[]> {
    console.log("Getting all chat rooms from database...");
    const result = await db.select().from(chatRooms);
    console.log("Database returned:", result);
    return result;
  }

  // Message operations
  async getMessage(id: number): Promise<Message | undefined> {
    const result = await db.select().from(messages).where(eq(messages.id, id));
    return result[0];
  }

  async getMessagesByRoom(roomId: number, limit: number = 50, offset: number = 0): Promise<(Message & { character: { firstName: string; middleName?: string | null; lastName: string } })[]> {
    const result = await db
      .select({
        id: messages.id,
        roomId: messages.roomId,
        characterId: messages.characterId,
        content: messages.content,
        messageType: messages.messageType,
        createdAt: messages.createdAt,
        character: {
          firstName: characters.firstName,
          middleName: characters.middleName,
          lastName: characters.lastName,
        },
      })
      .from(messages)
      .innerJoin(characters, eq(messages.characterId, characters.id))
      .where(eq(messages.roomId, roomId))
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .offset(offset);
    
    return result; // Return in descending order (newest first) for chat display
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const result = await db.insert(messages).values(insertMessage).returning();
    return result[0];
  }

  async deleteMessage(id: number): Promise<boolean> {
    const result = await db.delete(messages).where(eq(messages.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Archive operations
  async archiveMessages(roomId: number, beforeDate?: Date): Promise<number> {
    const whereCondition = beforeDate 
      ? and(eq(messages.roomId, roomId), lt(messages.createdAt, beforeDate))
      : eq(messages.roomId, roomId);

    // First, get messages to archive with character names
    const messagesToArchive = await db
      .select({
        id: messages.id,
        roomId: messages.roomId,
        characterId: messages.characterId,
        content: messages.content,
        messageType: messages.messageType,
        createdAt: messages.createdAt,
        characterName: {
          firstName: characters.firstName,
          middleName: characters.middleName,
          lastName: characters.lastName,
        },
      })
      .from(messages)
      .innerJoin(characters, eq(messages.characterId, characters.id))
      .where(whereCondition);

    if (messagesToArchive.length === 0) {
      return 0;
    }

    // Insert into archive table
    const archiveData = messagesToArchive.map(msg => ({
      originalMessageId: msg.id,
      roomId: msg.roomId,
      characterId: msg.characterId,
      characterName: `${msg.characterName.firstName}${msg.characterName.middleName ? ` ${msg.characterName.middleName}` : ''} ${msg.characterName.lastName}`,
      content: msg.content,
      messageType: msg.messageType,
      originalCreatedAt: msg.createdAt,
    }));

    await db.insert(archivedMessages).values(archiveData);

    // Delete original messages
    const deleteResult = await db.delete(messages).where(whereCondition);
    
    return deleteResult.rowCount || 0;
  }

  async getArchivedMessages(roomId: number, limit: number = 50, offset: number = 0): Promise<ArchivedMessage[]> {
    return db
      .select()
      .from(archivedMessages)
      .where(eq(archivedMessages.roomId, roomId))
      .orderBy(desc(archivedMessages.originalCreatedAt))
      .limit(limit)
      .offset(offset);
  }
}

export const storage = new DatabaseStorage();
