import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { terms, definitions } from "./schema";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

// JSON structure from your files
interface SlangTermJson {
  term: string;
  definitions: Array<{
    id: string;
    text: string;
    example?: string;
  }>;
  url: string;
}

// Slugify function for Greek text
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ά/g, "a")
    .replace(/έ/g, "e")
    .replace(/ή/g, "i")
    .replace(/ί/g, "i")
    .replace(/ό/g, "o")
    .replace(/ύ/g, "u")
    .replace(/ώ/g, "o")
    .replace(/ς/g, "s")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function seed() {
  const DATABASE_URL = process.env.DATABASE_URL;

  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  console.log("🔌 Connecting to database...");
  const client = postgres(DATABASE_URL);
  const db = drizzle(client);

  try {
    const slangTermsDir = join(__dirname, "slang_terms");
    const files = readdirSync(slangTermsDir).filter((f) => f.endsWith(".json"));

    console.log(`📚 Found ${files.length} slang term files`);
    console.log("🗑️  Clearing existing data...");

    // Clear existing data (careful in production!)
    await db.delete(definitions);
    await db.delete(terms);

    console.log("✅ Existing data cleared");
    console.log("📝 Starting import...\n");

    let processedCount = 0;
    let errorCount = 0;
    const batchSize = 100;
    let batch: Array<typeof terms.$inferInsert> = [];

    for (const file of files) {
      try {
        const filePath = join(slangTermsDir, file);
        const content = readFileSync(filePath, "utf-8");
        const data: SlangTermJson = JSON.parse(content);

        // Prepare term data (simplified schema)
        const termData = {
          term: data.term,
          slug: slugify(data.term),
          sourceUrl: data.url,
        };

        batch.push(termData);

        // Insert in batches
        if (batch.length >= batchSize) {
          const insertedTerms = await db
            .insert(terms)
            .values(batch)
            .returning();

          // Insert definitions for these terms
          for (let i = 0; i < insertedTerms.length; i++) {
            const fileIndex = processedCount + i;
            const termFile = files[fileIndex];
            const termFilePath = join(slangTermsDir, termFile);
            const termContent = readFileSync(termFilePath, "utf-8");
            const termData: SlangTermJson = JSON.parse(termContent);

            const definitionsData = termData.definitions.map((def) => ({
              termId: insertedTerms[i].id,
              text: def.text,
              example: def.example || null,
            }));

            if (definitionsData.length > 0) {
              await db.insert(definitions).values(definitionsData);
            }
          }

          processedCount += batch.length;
          console.log(`✓ Processed ${processedCount}/${files.length} terms`);
          batch = [];
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ Error processing ${file}:`, error);
      }
    }

    // Insert remaining batch
    if (batch.length > 0) {
      const insertedTerms = await db.insert(terms).values(batch).returning();

      for (let i = 0; i < insertedTerms.length; i++) {
        const fileIndex = processedCount + i;
        const termFile = files[fileIndex];
        const termFilePath = join(slangTermsDir, termFile);
        const termContent = readFileSync(termFilePath, "utf-8");
        const termData: SlangTermJson = JSON.parse(termContent);

        const definitionsData = termData.definitions.map((def) => ({
          termId: insertedTerms[i].id,
          text: def.text,
          example: def.example || null,
        }));

        if (definitionsData.length > 0) {
          await db.insert(definitions).values(definitionsData);
        }
      }

      processedCount += batch.length;
      console.log(`✓ Processed ${processedCount}/${files.length} terms`);
    }

    console.log("\n🎉 Seeding completed!");
    console.log(`✅ Successfully imported: ${processedCount} terms`);
    if (errorCount > 0) {
      console.log(`⚠️  Errors encountered: ${errorCount}`);
    }

    // Display some stats
    const termCount = await db.select({ count: terms.id }).from(terms);
    const defCount = await db
      .select({ count: definitions.id })
      .from(definitions);

    console.log(`\n📊 Database Stats:`);
    console.log(`   Terms: ${processedCount}`);
    console.log(`   Definitions: ${defCount.length}`);
  } catch (error) {
    console.error("💥 Fatal error during seeding:", error);
    process.exit(1);
  } finally {
    await client.end();
    console.log("\n👋 Database connection closed");
  }
}

// Run the seeder
seed();
