import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { terms, definitions, definitionReferences } from "./schema";
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

// Greek to Latin transliteration map
const greekToLatinMap: Record<string, string> = {
  α: "a",
  ά: "a",
  β: "v",
  γ: "g",
  δ: "d",
  ε: "e",
  έ: "e",
  ζ: "z",
  η: "i",
  ή: "i",
  θ: "th",
  ι: "i",
  ί: "i",
  ϊ: "i",
  ΐ: "i",
  κ: "k",
  λ: "l",
  μ: "m",
  ν: "n",
  ξ: "x",
  ο: "o",
  ό: "o",
  π: "p",
  ρ: "r",
  σ: "s",
  ς: "s",
  τ: "t",
  υ: "y",
  ύ: "y",
  ϋ: "y",
  ΰ: "y",
  φ: "f",
  χ: "ch",
  ψ: "ps",
  ω: "o",
  ώ: "o",
};

/**
 * Transliterates Greek text to Latin characters
 */
function transliterate(text: string): string {
  return text
    .toLowerCase()
    .split("")
    .map((char) => greekToLatinMap[char] || char)
    .join("")
    .replace(/[^a-z0-9]/g, ""); // Remove non-alphanumeric
}

/**
 * Formats text by adding line breaks before dialogue markers
 * Converts: "text - dialogue - more" → "text\n- dialogue\n- more"
 */
function formatDialogue(text: string): string {
  if (!text) return text;

  // Add \n before " - " (space-dash-space pattern for dialogue)
  return text.replace(/\s+-\s+/g, "\n- ");
}

/**
 * Extracts individual words from Greek text for reference matching
 */
function extractWords(text: string): string[] {
  // Remove punctuation and split on whitespace
  const words = text
    .toLowerCase()
    .replace(/[.,;:!?()«»"'–—]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2); // Skip very short words

  return words;
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
    await db.delete(definitionReferences);
    await db.delete(definitions);
    await db.delete(terms);

    console.log("✅ Existing data cleared");
    console.log("📝 Loading and deduplicating terms...\n");

    // PHASE 1: Load all JSON files and group by transliteration
    const termsByTransliteration = new Map<
      string,
      {
        originalTerm: string;
        sourceUrls: string[];
        allDefinitions: Array<{
          text: string;
          example?: string;
        }>;
      }
    >();

    for (const file of files) {
      try {
        const filePath = join(slangTermsDir, file);
        const content = readFileSync(filePath, "utf-8");
        const data: SlangTermJson = JSON.parse(content);

        const transliterated = transliterate(data.term);

        if (termsByTransliteration.has(transliterated)) {
          // Duplicate found - merge definitions
          const existing = termsByTransliteration.get(transliterated)!;
          existing.sourceUrls.push(data.url);
          existing.allDefinitions.push(...data.definitions);
          console.log(
            `🔗 Merged duplicate: "${data.term}" -> "${existing.originalTerm}" (${transliterated})`,
          );
        } else {
          // New term
          termsByTransliteration.set(transliterated, {
            originalTerm: data.term,
            sourceUrls: [data.url],
            allDefinitions: data.definitions,
          });
        }
      } catch (error) {
        console.error(`❌ Error loading ${file}:`, error);
      }
    }

    console.log(
      `\n✅ Deduplicated ${files.length} files into ${termsByTransliteration.size} unique terms\n`,
    );

    // PHASE 2: Insert unique terms and their definitions
    console.log("💾 Inserting terms and definitions...");

    let slugCounter = 1;
    const insertedTermsMap = new Map<
      string,
      { id: number; slug: string; term: string }
    >();
    const definitionIdToText = new Map<
      number,
      { text: string; example?: string }
    >();

    for (const [transliterated, data] of termsByTransliteration.entries()) {
      try {
        // Insert term
        const [insertedTerm] = await db
          .insert(terms)
          .values({
            term: data.originalTerm,
            slug: String(slugCounter),
            sourceUrl: data.sourceUrls[0], // Use first URL
            submittedBy: null, // NULL = Archive
          })
          .returning();

        slugCounter++;
        insertedTermsMap.set(transliterated, {
          id: insertedTerm.id,
          slug: insertedTerm.slug,
          term: insertedTerm.term,
        });

        // Insert definitions for this term
        if (data.allDefinitions.length > 0) {
          const definitionsData = data.allDefinitions.map((def) => ({
            termId: insertedTerm.id,
            text: formatDialogue(def.text),
            example: def.example ? formatDialogue(def.example) : null,
          }));

          const insertedDefs = await db
            .insert(definitions)
            .values(definitionsData)
            .returning();

          // Store definition ID -> text mapping for reference extraction
          insertedDefs.forEach((def, idx) => {
            definitionIdToText.set(def.id, {
              text: def.text,
              example: data.allDefinitions[idx].example,
            });
          });
        }

        if (insertedTermsMap.size % 50 === 0) {
          console.log(
            `✓ Inserted ${insertedTermsMap.size}/${termsByTransliteration.size} terms`,
          );
        }
      } catch (error) {
        console.error(
          `❌ Error inserting term "${data.originalTerm}":`,
          error,
        );
      }
    }

    console.log(
      `\n✅ Inserted ${insertedTermsMap.size} terms with ${definitionIdToText.size} definitions`,
    );

    // PHASE 3: Extract references from definitions
    console.log("\n🔗 Extracting term references from definitions...");

    const referencesToInsert: Array<{
      definitionId: number;
      referencedTermId: number;
    }> = [];
    let processedDefs = 0;

    for (const [defId, defData] of definitionIdToText.entries()) {
      // Combine text and example for word extraction
      const combinedText = [defData.text, defData.example || ""].join(" ");
      const words = extractWords(combinedText);

      // For each word, check if it matches any term (by transliteration)
      const matchedTermIds = new Set<number>();

      for (const word of words) {
        const wordTranslit = transliterate(word);

        // Check if this transliteration matches any term
        if (insertedTermsMap.has(wordTranslit)) {
          const matchedTerm = insertedTermsMap.get(wordTranslit)!;
          matchedTermIds.add(matchedTerm.id);
        }
      }

      // Add references (self-references will be filtered by unique constraint)
      for (const termId of matchedTermIds) {
        referencesToInsert.push({
          definitionId: defId,
          referencedTermId: termId,
        });
      }

      processedDefs++;
      if (processedDefs % 100 === 0) {
        console.log(
          `✓ Processed ${processedDefs}/${definitionIdToText.size} definitions`,
        );
      }
    }

    // Insert all references
    if (referencesToInsert.length > 0) {
      console.log(`\n💾 Inserting ${referencesToInsert.length} references...`);

      // Insert in batches to avoid large queries
      const batchSize = 500;
      for (let i = 0; i < referencesToInsert.length; i += batchSize) {
        const batch = referencesToInsert.slice(i, i + batchSize);
        try {
          await db.insert(definitionReferences).values(batch).onConflictDoNothing();
        } catch (error) {
          console.error(`❌ Error inserting reference batch ${i}:`, error);
        }

        if ((i + batchSize) % 2000 === 0) {
          console.log(`✓ Inserted ${i + batchSize} references`);
        }
      }
    }

    console.log("\n🎉 Seeding completed!");
    console.log(`✅ Unique terms: ${insertedTermsMap.size}`);
    console.log(`✅ Total definitions: ${definitionIdToText.size}`);
    console.log(`✅ Term references: ${referencesToInsert.length}`);

    // Display final stats
    const termCount = await db.select({ count: terms.id }).from(terms);
    const defCount = await db
      .select({ count: definitions.id })
      .from(definitions);
    const refCount = await db
      .select({ count: definitionReferences.id })
      .from(definitionReferences);

    console.log(`\n📊 Database Stats:`);
    console.log(`   Terms: ${termCount.length}`);
    console.log(`   Definitions: ${defCount.length}`);
    console.log(`   References: ${refCount.length}`);
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
