
import { db } from "./server/db";
import { verifications, notes } from "./shared/schema";

async function clearDatabase() {
  try {
    console.log("Clearing database...");
    
    // Delete all notes first (due to foreign key constraint)
    const deletedNotes = await db.delete(notes);
    console.log(`Deleted all notes`);
    
    // Delete all verifications
    const deletedVerifications = await db.delete(verifications);
    console.log(`Deleted all verifications`);
    
    console.log("Database cleared successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error clearing database:", error);
    process.exit(1);
  }
}

clearDatabase();
