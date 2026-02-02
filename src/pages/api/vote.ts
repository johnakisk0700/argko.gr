import type { APIRoute } from "astro";
import { db, definitions, definitionVotes } from "../../lib/server/db";
import { auth } from "../../lib/server/auth";
import { and, eq, sql } from "drizzle-orm";

export const POST: APIRoute = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const { definitionId, voteType } = await request.json();

  if (!definitionId || !["up", "down", "remove"].includes(voteType)) {
    return new Response(JSON.stringify({ error: "Invalid input" }), {
      status: 400,
    });
  }

  try {
    // 1. Check existing vote
    const existingVote = await db.query.definitionVotes.findFirst({
      where: and(
        eq(definitionVotes.definitionId, definitionId),
        eq(definitionVotes.userId, session.user.id),
      ),
    });

    await db.transaction(async (tx) => {
      // 2. Handle Logic
      // Case A: Removing a vote (toggling off)
      if (voteType === "remove") {
        if (existingVote) {
          await tx
            .delete(definitionVotes)
            .where(eq(definitionVotes.id, existingVote.id));

          // Decrement the old counter
          if (existingVote.voteType === "up") {
            await tx
              .update(definitions)
              .set({ upvotes: sql`${definitions.upvotes} - 1` })
              .where(eq(definitions.id, definitionId));
          } else {
            await tx
              .update(definitions)
              .set({ downvotes: sql`${definitions.downvotes} - 1` })
              .where(eq(definitions.id, definitionId));
          }
        }
        return;
      }

      // Case B: Changing vote (up -> down OR down -> up)
      if (existingVote && existingVote.voteType !== voteType) {
        // Update the vote record
        await tx
          .update(definitionVotes)
          .set({ voteType })
          .where(eq(definitionVotes.id, existingVote.id));

        // Adjust counters: Remove old, Add new
        if (voteType === "up") {
          // Was down, now up
          await tx
            .update(definitions)
            .set({
              downvotes: sql`${definitions.downvotes} - 1`,
              upvotes: sql`${definitions.upvotes} + 1`,
            })
            .where(eq(definitions.id, definitionId));
        } else {
          // Was up, now down
          await tx
            .update(definitions)
            .set({
              upvotes: sql`${definitions.upvotes} - 1`,
              downvotes: sql`${definitions.downvotes} + 1`,
            })
            .where(eq(definitions.id, definitionId));
        }
        return;
      }

      // Case C: New vote (and no existing vote)
      if (!existingVote) {
        await tx.insert(definitionVotes).values({
          definitionId,
          userId: session.user.id,
          voteType,
        });

        if (voteType === "up") {
          await tx
            .update(definitions)
            .set({ upvotes: sql`${definitions.upvotes} + 1` })
            .where(eq(definitions.id, definitionId));
        } else {
          await tx
            .update(definitions)
            .set({ downvotes: sql`${definitions.downvotes} + 1` })
            .where(eq(definitions.id, definitionId));
        }
      }
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("Vote error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
    });
  }
};
