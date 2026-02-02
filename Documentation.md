# Argko.gr - Greek Slang Dictionary

## Overview

**Argko.gr** is a community-driven platform for documenting modern Greek slang. Built as a fullstack Astro application with PostgreSQL, it combines 25,000+ curated terms from [slang.gr](https://www.slang.gr) with community features including user authentication, commenting, voting, and bookmarking.

## Tech Stack

- **Astro** (Server-Side Rendering) - Fullstack framework handling both frontend and API
- **PostgreSQL** - Relational database for terms, users, and community data
- **Drizzle ORM** - Type-safe database queries and schema management
- **Bun** - JavaScript runtime and package manager
- **Better Auth** - Authentication with Clerk integration
- **TailwindCSS** - Styling with Radix UI components
- **Docker** - Local PostgreSQL development environment

---

## Project Structure

```
argko.gr/
├── src/
│   ├── pages/                # Astro routes and API endpoints
│   ├── components/           # UI components (Astro & React)
│   ├── layouts/              # Page layouts
│   ├── lib/                  # Utilities and helpers
│   └── styles/               # Global styles
│
├── db/
│   ├── schema.ts             # Drizzle database schema
│   ├── auth-schema.ts        # Better Auth schema
│   ├── seed.ts               # Database seeding script
│   ├── drizzle.config.ts     # Drizzle Kit configuration
│   └── slang_terms/          # Source JSON files (25k+ terms)
│
├── public/                   # Static assets
├── docker-compose.yml        # PostgreSQL container
├── astro.config.mjs          # Astro configuration
├── package.json              # Dependencies and scripts
└── tsconfig.json             # TypeScript configuration
```

---

## Database Schema

### Tables

#### **users**

User accounts managed by Better Auth/Clerk

- `id` - Clerk user ID (primary key)
- `username` - Unique username
- `role` - User role (user, moderator, admin)
- `createdAt` - Account creation timestamp

#### **terms**

Slang terms/entries

- `id` - Auto-incrementing primary key
- `term` - Term name
- `slug` - URL-friendly identifier
- `sourceUrl` - Original slang.gr link
- `submittedBy` - User ID (NULL for seeded/archive terms)
- `createdAt` - Submission timestamp

#### **definitions**

Multiple definitions per term

- `id` - Auto-incrementing primary key
- `termId` - Foreign key to terms
- `text` - Definition text
- `example` - Usage example (optional)
- `upvotes` / `downvotes` - Vote counts
- `createdAt` - Creation timestamp

#### **comments**

User discussions on terms

- `id` - Auto-incrementing primary key
- `termId` - Foreign key to terms
- `userId` - Foreign key to users
- `parentId` - Self-reference for nested replies
- `content` - Comment text
- `upvotes` / `downvotes` - Vote counts
- `isDeleted` - Soft deletion flag
- `createdAt` - Creation timestamp

#### **definitionVotes** & **commentVotes**

User voting on definitions and comments

- `definitionId` / `commentId` - Foreign key to voted item
- `userId` - Foreign key to users
- `voteType` - 'up' or 'down'
- Unique constraint: one vote per user per item

#### **tags**

Categorization system

- `id` - Auto-incrementing primary key
- `name` - Tag name
- `slug` - URL-friendly identifier

#### **termTags**

Many-to-many junction table

- `termId` - Foreign key to terms
- `tagId` - Foreign key to tags
- Composite primary key

#### **bookmarks**

User-saved favorite terms

- `userId` - Foreign key to users
- `termId` - Foreign key to terms
- Unique constraint: one bookmark per user per term

#### **definitionReferences**

Cross-references between definitions

- `definitionId` - Foreign key to definitions
- `referencedTermId` - Foreign key to terms
- Tracks terms mentioned in definitions

### Relationships

- Terms → Definitions (one-to-many)
- Terms → Comments (one-to-many)
- Comments → Comments (self-referencing for replies)
- Users → Terms, Comments, Bookmarks, Votes (one-to-many)
- Terms ↔ Tags (many-to-many via termTags)
- All foreign keys use CASCADE on delete

---

## Development Setup

### Prerequisites

- [Bun](https://bun.sh) 1.0+
- [Docker](https://www.docker.com/) & Docker Compose
- Git

### Setup Steps

1. **Install dependencies**

   ```bash
   bun install
   ```

2. **Start PostgreSQL**

   ```bash
   docker compose up -d
   ```

3. **Configure environment**

   ```bash
   # Create .env file with DATABASE_URL
   # Example: postgresql://user:password@localhost:5432/argko
   ```

4. **Initialize database**

   ```bash
   bun run db:push     # Push schema to database
   bun run db:seed     # Import slang terms from JSON files
   ```

5. **Start development server**
   ```bash
   bun dev             # Astro dev server at http://localhost:4321
   ```

### Available Scripts

- `bun dev` - Start Astro development server
- `bun build` - Build for production
- `bun preview` - Preview production build
- `bun run db:push` - Push schema changes to database
- `bun run db:seed` - Seed database with JSON terms
- `bun run db:studio` - Open Drizzle Studio (database GUI)
- `bun run db:generate` - Generate migration files
- `bun run db:migrate` - Run migrations

---

## Development Workflow

### Database Changes

1. Modify schema in `db/schema.ts`
2. Run `bun run db:push` for development
3. Or generate migrations with `bun run db:generate` for production
4. Inspect data with `bun run db:studio`

### Querying Data

Drizzle ORM provides type-safe queries:

```typescript
import { db } from "@/db";
import { terms, definitions, comments } from "@/db/schema";
import { eq } from "drizzle-orm";

// Get term with definitions and comments
const term = await db.query.terms.findFirst({
  where: eq(terms.slug, "example-slug"),
  with: {
    definitions: true,
    comments: {
      with: {
        user: true,
        replies: true,
      },
    },
  },
});
```

### Astro API Routes

API endpoints in `src/pages/api/`:

```typescript
// src/pages/api/terms/[slug].ts
export async function GET({ params }) {
  const term = await db.query.terms.findFirst({
    where: eq(terms.slug, params.slug),
  });
  return new Response(JSON.stringify(term));
}
```

---

## Architecture

### Astro Fullstack

Astro handles both frontend rendering and backend API in a single application:

- **SSR Mode**: Server-side rendering for dynamic content
- **API Routes**: RESTful endpoints in `src/pages/api/`
- **Components**: Mix of Astro components and React islands
- **Database**: Direct PostgreSQL access via Drizzle ORM

### Authentication

Better Auth with Clerk integration:

- User sessions managed by Clerk
- User data stored in local PostgreSQL
- Role-based access control (user, moderator, admin)

### Data Flow

```
Client Request
    ↓
Astro Route/API
    ↓
Drizzle ORM Query
    ↓
PostgreSQL Database
    ↓
Response (HTML or JSON)
```

---

## Deployment

### Database

- Managed PostgreSQL (Neon, Supabase, or Railway)
- Run migrations: `bun run db:migrate`
- One-time seed: `bun run db:seed`

### Application

- Deploy to Vercel, Netlify, or Cloudflare Pages
- Set `output: "server"` in `astro.config.mjs`
- Environment variables: `DATABASE_URL`, auth credentials

---

## Key Technologies

**Why Astro?**

- Content-focused with excellent performance
- SSR for dynamic features (auth, comments, votes)
- Minimal client-side JavaScript
- Great SEO out of the box

**Why PostgreSQL?**

- Robust relational data model
- Full-text search capabilities
- JSON support for flexible data
- Proven scalability

**Why Drizzle ORM?**

- Type-safe queries with TypeScript
- Lightweight with no runtime overhead
- SQL-like syntax
- Excellent migration tooling

**Why Bun?**

- Fast package installation
- TypeScript support out of the box
- Drop-in Node.js replacement

---

**Last Updated:** February 2026
