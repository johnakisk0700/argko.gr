import {
  pgTable,
  varchar,
  text,
  integer,
  timestamp,
  boolean,
  primaryKey,
  index,
  uniqueIndex,
  type AnyPgColumn,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth-schema";

// Vote type enum
export const voteTypeEnum = pgEnum("vote_type", ["up", "down"]);

// Terms
export const terms = pgTable(
  "terms",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    term: varchar({ length: 255 }).notNull(),
    slug: varchar({ length: 255 }).notNull(),
    sourceUrl: text("source_url"), // Original slang.gr link
    submittedBy: text("submitted_by").references(() => user.id), // NULL = Archive/seeded terms
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("terms_slug_idx").on(table.slug),
    index("terms_created_at_idx").on(table.createdAt),
  ],
);

// Definitions
export const definitions = pgTable(
  "definitions",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    termId: integer("term_id")
      .notNull()
      .references(() => terms.id, { onDelete: "cascade" }),
    text: text().notNull(),
    example: text(),
    upvotes: integer().default(0).notNull(),
    downvotes: integer().default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("definitions_term_id_idx").on(table.termId)],
);

// Comments
export const comments = pgTable(
  "comments",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    termId: integer("term_id")
      .notNull()
      .references(() => terms.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    parentId: integer("parent_id").references((): AnyPgColumn => comments.id),
    content: text().notNull(),
    upvotes: integer().default(0).notNull(),
    downvotes: integer().default(0).notNull(),
    isDeleted: boolean("is_deleted").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("comments_term_id_idx").on(table.termId),
    index("comments_parent_id_idx").on(table.parentId),
    index("comments_user_id_idx").on(table.userId),
  ],
);

// Definition Votes
export const definitionVotes = pgTable(
  "definition_votes",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    definitionId: integer("definition_id")
      .notNull()
      .references(() => definitions.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    voteType: voteTypeEnum("vote_type").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("definition_votes_unique_idx").on(
      table.definitionId,
      table.userId,
    ),
  ],
);

// Comment Votes
export const commentVotes = pgTable(
  "comment_votes",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    commentId: integer("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    voteType: voteTypeEnum("vote_type").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("comment_votes_unique_idx").on(table.commentId, table.userId),
  ],
);

// Tags
export const tags = pgTable(
  "tags",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar({ length: 100 }).notNull(),
    slug: varchar({ length: 100 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("tags_name_idx").on(table.name),
    uniqueIndex("tags_slug_idx").on(table.slug),
  ],
);

// Term Tags (many-to-many)
export const termTags = pgTable(
  "term_tags",
  {
    termId: integer("term_id")
      .notNull()
      .references(() => terms.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.termId, table.tagId] })],
);

// Bookmarks
export const bookmarks = pgTable(
  "bookmarks",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    termId: integer("term_id")
      .notNull()
      .references(() => terms.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("bookmarks_unique_idx").on(table.userId, table.termId),
  ],
);

// Definition References (terms mentioned in definitions)
export const definitionReferences = pgTable(
  "definition_references",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    definitionId: integer("definition_id")
      .notNull()
      .references(() => definitions.id, { onDelete: "cascade" }),
    referencedTermId: integer("referenced_term_id")
      .notNull()
      .references(() => terms.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("definition_references_unique_idx").on(
      table.definitionId,
      table.referencedTermId,
    ),
    index("definition_references_definition_id_idx").on(table.definitionId),
  ],
);

// Relations for Drizzle queries
export const userRelations = relations(user, ({ many }) => ({
  submittedTerms: many(terms),
  comments: many(comments),
  bookmarks: many(bookmarks),
  definitionVotes: many(definitionVotes),
  commentVotes: many(commentVotes),
}));

export const termsRelations = relations(terms, ({ one, many }) => ({
  submitter: one(user, {
    fields: [terms.submittedBy],
    references: [user.id],
  }),
  definitions: many(definitions),
  comments: many(comments),
  termTags: many(termTags),
  bookmarks: many(bookmarks),
}));

export const definitionsRelations = relations(definitions, ({ one, many }) => ({
  term: one(terms, {
    fields: [definitions.termId],
    references: [terms.id],
  }),
  votes: many(definitionVotes),
  references: many(definitionReferences),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  term: one(terms, {
    fields: [comments.termId],
    references: [terms.id],
  }),
  user: one(user, {
    fields: [comments.userId],
    references: [user.id],
  }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: "commentReplies",
  }),
  replies: many(comments, { relationName: "commentReplies" }),
  votes: many(commentVotes),
}));

export const definitionVotesRelations = relations(
  definitionVotes,
  ({ one }) => ({
    definition: one(definitions, {
      fields: [definitionVotes.definitionId],
      references: [definitions.id],
    }),
    user: one(user, {
      fields: [definitionVotes.userId],
      references: [user.id],
    }),
  }),
);

export const commentVotesRelations = relations(commentVotes, ({ one }) => ({
  comment: one(comments, {
    fields: [commentVotes.commentId],
    references: [comments.id],
  }),
  user: one(user, {
    fields: [commentVotes.userId],
    references: [user.id],
  }),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  termTags: many(termTags),
}));

export const termTagsRelations = relations(termTags, ({ one }) => ({
  term: one(terms, {
    fields: [termTags.termId],
    references: [terms.id],
  }),
  tag: one(tags, {
    fields: [termTags.tagId],
    references: [tags.id],
  }),
}));

export const bookmarksRelations = relations(bookmarks, ({ one }) => ({
  user: one(user, {
    fields: [bookmarks.userId],
    references: [user.id],
  }),
  term: one(terms, {
    fields: [bookmarks.termId],
    references: [terms.id],
  }),
}));

export const definitionReferencesRelations = relations(
  definitionReferences,
  ({ one }) => ({
    definition: one(definitions, {
      fields: [definitionReferences.definitionId],
      references: [definitions.id],
    }),
    referencedTerm: one(terms, {
      fields: [definitionReferences.referencedTermId],
      references: [terms.id],
    }),
  }),
);
