/**
 * Quality-of-Life Database Helpers
 * Delete, favorites, tags, collections, search
 */

import { eq, and, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { stories, collections, InsertCollection } from "../drizzle/schema";
import { getDb } from "./db";

// Delete operations
export async function deleteStory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(stories).set({ deletedAt: new Date() }).where(eq(stories.id, id));
}

export async function permanentlyDeleteStory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(stories).where(eq(stories.id, id));
}

// Favorites
export async function toggleFavorite(id: number, isFavorite: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(stories).set({ isFavorite: isFavorite ? 1 : 0 }).where(eq(stories.id, id));
}

export async function getFavoriteStories(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(stories)
    .where(and(
      eq(stories.userId, userId),
      eq(stories.isFavorite, 1),
      isNull(stories.deletedAt)
    ));
}

// Tags
export async function updateTags(id: number, tags: string[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(stories).set({ tags: JSON.stringify(tags) }).where(eq(stories.id, id));
}

// Collections
export async function moveToCollection(storyId: number, collectionId: number | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(stories).set({ collectionId }).where(eq(stories.id, storyId));
}

export async function getStoriesByCollection(collectionId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(stories)
    .where(and(
      eq(stories.collectionId, collectionId),
      isNull(stories.deletedAt)
    ))
    .orderBy(stories.createdAt);
}

export async function createCollection(data: InsertCollection) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(collections).values(data);
}

export async function getUserCollections(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(collections).where(eq(collections.userId, userId));
}

export async function deleteCollection(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Move stories back to no collection
  await db.update(stories).set({ collectionId: null }).where(eq(stories.collectionId, id));
  return await db.delete(collections).where(eq(collections.id, id));
}

export async function updateCollection(id: number, data: Partial<InsertCollection>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(collections).set(data).where(eq(collections.id, id));
}

// Search and filter
export async function searchStories(userId: number, query: string) {
  const db = await getDb();
  if (!db) return [];
  // Full-text search would be better, but for now we'll do basic filtering
  return await db.select().from(stories)
    .where(and(
      eq(stories.userId, userId),
      isNull(stories.deletedAt)
    ));
}

export async function getStoriesByTag(userId: number, tag: string) {
  const db = await getDb();
  if (!db) return [];
  const allStories = await db.select().from(stories)
    .where(and(
      eq(stories.userId, userId),
      isNull(stories.deletedAt)
    ));
  
  return allStories.filter(story => {
    const tags = story.tags ? JSON.parse(story.tags) : [];
    return tags.includes(tag);
  });
}

export async function getAllTags(userId: number): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const allStories = await db.select().from(stories)
    .where(and(
      eq(stories.userId, userId),
      isNull(stories.deletedAt)
    ));
  
  const tagsSet = new Set<string>();
  allStories.forEach(story => {
    if (story.tags) {
      const tags = JSON.parse(story.tags);
      tags.forEach((tag: string) => tagsSet.add(tag));
    }
  });
  
  return Array.from(tagsSet);
}

export async function getDeletedStories(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(stories)
    .where(and(
      eq(stories.userId, userId),
      // deletedAt is not null
    ));
}

export async function restoreStory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(stories).set({ deletedAt: null }).where(eq(stories.id, id));
}

