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
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Users (Clerk handles auth - this is just for app data)
export const users = pgTable(
  "users",
  {
    id: varchar({ length: 255 }).primaryKey(), // Clerk user ID
    username: varchar({ length: 50 }).notNull(),
    role: varchar({ length: 20 }).default("user"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("users_username_idx").on(table.username)],
);

// Terms
export const terms = pgTable(
  "terms",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    term: varchar({ length: 255 }).notNull(),
    slug: varchar({ length: 255 }).notNull(),
    sourceUrl: text("source_url"), // Original slang.gr link
    submittedBy: varchar("submitted_by", { length: 255 }).references(
      () => users.id,
    ),
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
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id),
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
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id),
    voteType: varchar("vote_type", { length: 10 }).notNull(), // 'up' or 'down'
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
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id),
    voteType: varchar("vote_type", { length: 10 }).notNull(), // 'up' or 'down'
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
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    termId: integer("term_id")
      .notNull()
      .references(() => terms.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("bookmarks_unique_idx").on(table.userId, table.termId),
  ],
);

// Relations for Drizzle queries
export const usersRelations = relations(users, ({ many }) => ({
  submittedTerms: many(terms),
  comments: many(comments),
  bookmarks: many(bookmarks),
  definitionVotes: many(definitionVotes),
  commentVotes: many(commentVotes),
}));

export const termsRelations = relations(terms, ({ one, many }) => ({
  submitter: one(users, {
    fields: [terms.submittedBy],
    references: [users.id],
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
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  term: one(terms, {
    fields: [comments.termId],
    references: [terms.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
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
    user: one(users, {
      fields: [definitionVotes.userId],
      references: [users.id],
    }),
  }),
);

export const commentVotesRelations = relations(commentVotes, ({ one }) => ({
  comment: one(comments, {
    fields: [commentVotes.commentId],
    references: [comments.id],
  }),
  user: one(users, {
    fields: [commentVotes.userId],
    references: [users.id],
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
  user: one(users, {
    fields: [bookmarks.userId],
    references: [users.id],
  }),
  term: one(terms, {
    fields: [bookmarks.termId],
    references: [terms.id],
  }),
}));
