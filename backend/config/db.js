import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = "applytrack";

let client = null;
let db = null;

/**
 * Connects to MongoDB and returns the database instance.
 * Reuses an existing connection if already established.
 */
const connectDB = async () => {
  if (db) return db;

  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined in environment variables.");
  }

  client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db(DB_NAME);
  console.log(`✅ Connected to MongoDB — database: "${DB_NAME}"`);
  return db;
};

/**
 * Returns the active database instance.
 * Must call connectDB() before using this.
 */
const getDB = () => {
  if (!db) throw new Error("Database not connected. Call connectDB() first.");
  return db;
};

/**
 * Closes the MongoDB connection gracefully.
 */
const closeDB = async () => {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log("🔌 MongoDB connection closed.");
  }
};

export { connectDB, getDB, closeDB };
