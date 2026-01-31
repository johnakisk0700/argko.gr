# Database Schema Simplification

## Summary of Changes

The database schema has been streamlined to **reduce complexity and mental overhead** while maintaining core functionality. Here's what changed:

---

## 🎯 Key Simplifications

### **users** table (60% reduction)

**Removed:**

- `email` - Clerk provides this
- `password_hash` - Clerk handles authentication
- `display_name` - Username serves this purpose
- `avatar_url` - Clerk provides this
- `updated_at` - Not needed for Phase 1

**Changed:**

- `id`: `integer` → `varchar(255)` (stores Clerk user ID)

**Kept:**

- `id` (Clerk ID), `username`, `role`, `created_at`

**Why:** Clerk handles all authentication, so we only store app-specific data (username, role).

---

### **terms** table (50% reduction)

**Removed:**

- `status` - All imported terms are published
- `submitted_by` - Not needed until user submissions (Phase 2)
- `approved_by` - Not needed until moderation workflow (Phase 2)
- `view_count` - Analytics can be added later
- `updated_at` - Terms rarely change
- `published_at` - Use `created_at` instead

**Kept:**

- `id`, `term`, `slug`, `source_url`, `created_at`

**Why:** For Phase 1 (static site), all terms are pre-approved. User submissions come in Phase 2.

---

### **definitions** table (50% reduction)

**Removed:**

- `source_definition_id` - Only needed for import tracking
- `upvotes`/`downvotes` - Calculated from `definition_votes` table (single source of truth)
- `display_order` - Can sort by vote count or `created_at`
- `updated_at` - Definitions rarely change

**Kept:**

- `id`, `term_id`, `text`, `example`, `created_at`

**Why:** Denormalized vote counts create data sync issues. Calculate on-demand from votes table.

---

### **comments** table (40% reduction)

**Removed:**

- `upvotes`/`downvotes` - Calculated from `comment_votes` table
- `updated_at` - Can add back if edit feature is needed

**Changed:**

- `user_id`: `integer` → `varchar(255)` (Clerk ID)

**Kept:**

- `id`, `term_id`, `user_id`, `parent_id`, `content`, `is_deleted`, `created_at`

**Why:** Same principle - avoid denormalized data. Single source of truth for votes.

---

### **definition_votes** & **comment_votes** (minimal change)

**Changed:**

- `user_id`: `integer` → `varchar(255)` (Clerk ID)

**Why:** Must match Clerk's user ID format.

---

### **tags** table (25% reduction)

**Removed:**

- `description` - Can add later if needed

**Kept:**

- `id`, `name`, `slug`, `created_at`

**Why:** Tag descriptions add complexity without immediate value.

---

### **bookmarks** table (no change except user_id)

**Changed:**

- `user_id`: `integer` → `varchar(255)` (Clerk ID)

**Why:** Already minimal - just junction table.

---

## 📊 Before vs After

| Table            | Columns Before | Columns After | Reduction        |
| ---------------- | -------------- | ------------- | ---------------- |
| users            | 9              | 4             | **56%**          |
| terms            | 11             | 5             | **55%**          |
| definitions      | 10             | 5             | **50%**          |
| comments         | 10             | 7             | **30%**          |
| definition_votes | 5              | 5             | 0% (type change) |
| comment_votes    | 5              | 5             | 0% (type change) |
| tags             | 4              | 3             | **25%**          |
| term_tags        | 2              | 2             | 0%               |
| bookmarks        | 4              | 4             | 0% (type change) |

**Total columns: 60 → 40 (33% reduction)**

---

## 🔄 What This Means

### ✅ Benefits

1. **Less to think about** - Fewer fields to manage and validate
2. **Single source of truth** - Vote counts calculated from votes table (no sync issues)
3. **Clerk integration** - No auth code to write or maintain
4. **Easier queries** - Fewer joins, simpler SELECT statements
5. **Faster development** - Less boilerplate, fewer edge cases
6. **Room to grow** - Can add fields back when actually needed (YAGNI principle)

### 🎯 Phase 1 Focus

With this schema, you can build:

- ✅ Static site with all terms
- ✅ Search functionality
- ✅ Term pages with definitions
- ✅ Basic routing and SEO

### 📈 Phase 2 Additions (when needed)

Add back only when implementing:

- `terms.submitted_by`, `terms.approved_by`, `terms.status` → User submissions & moderation
- `terms.view_count` → Analytics dashboard
- `comments.updated_at` → Edit comments feature
- `tags.description` → Advanced tag management UI

---

## 💡 Design Principles Applied

### YAGNI (You Aren't Gonna Need It)

Don't add fields "just in case". Add them when you actually need them.

### Single Source of Truth

Vote counts stored in votes tables, not duplicated on definitions/comments.

### Embrace External Services

Clerk handles auth better than we can. Use their user IDs directly.

### Start Simple, Scale Up

It's easier to add columns later than to maintain unused ones now.

---

## 🔨 Migration Notes

If you've already run migrations:

1. **Development:** Drop database and re-seed: `docker compose down -v && docker compose up -d`
2. **Production:** Create migration to drop columns: `bun run db:generate`

The simplified schema is **fully functional** for Phase 1 and can scale to Phase 2+ by adding fields incrementally.

---

**Result:** Cleaner code, faster development, less mental overhead. Add complexity only when you need it! 🚀
