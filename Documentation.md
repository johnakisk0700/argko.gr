# Argko.gr - Greek Slang Dictionary Platform

## 📖 Project Overview

**Argko.gr** is a community-driven platform dedicated to documenting and celebrating modern Greek slang. The project transforms a collection of 25,000+ curated slang terms from [slang.gr](https://www.slang.gr) into an interactive, searchable, and community-enhanced digital dictionary.

### The Story

Language evolves constantly, especially in the digital age where slang terms emerge, spread, and fade at an unprecedented pace. Greek slang is no exception - from street culture to social media, new expressions continuously enrich the Greek language. This project aims to preserve this linguistic creativity while building a platform where the community can contribute, discuss, and vote on definitions.

What started as a collection of JSON files has evolved into a full-stack application combining:

- **Static site generation** for blazing-fast performance
- **Relational database** for powerful querying and relationships
- **Community features** enabling user contributions, comments, and voting
- **Modern architecture** designed for scalability and maintainability

### Why This Tech Stack?

- **Astro** - Optimal for content-heavy sites, delivers minimal JavaScript, excellent SEO
- **PostgreSQL + Drizzle** - Robust relational data with type-safe queries, perfect for complex relationships
- **Bun** - Fast, modern JavaScript runtime and package manager
- **Monorepo** - Shared code between frontend/backend, easier dependency management
- **Future: NestJS** - When we add the backend API for CRUD operations and search

---

## 🎯 Project Goals

### Phase 1: Foundation (Current)

- [x] Set up monorepo structure with Bun workspaces
- [x] Design comprehensive database schema
- [x] Create data migration/seeding scripts
- [x] Establish Docker environment for local development
- [ ] Build static Astro site with term pages
- [ ] Implement search functionality
- [ ] Deploy initial version

### Phase 2: Community Features

- [ ] Add NestJS backend API
- [ ] Implement user authentication
- [ ] Enable term submissions (moderation queue)
- [ ] Add commenting system with nested replies
- [ ] Implement voting on definitions and comments
- [ ] User profiles and bookmarks

### Phase 3: Enhancement

- [ ] Advanced search with filters
- [ ] Tag system for categorization
- [ ] Analytics and popular terms
- [ ] Share features and social integration
- [ ] Mobile-responsive refinements

---

## 📁 Folder Structure

```
argko.gr/
├── frontend/                      # Astro static site
│   ├── src/
│   │   ├── pages/                # Routes (index, [slug], etc.)
│   │   ├── components/           # Astro/React components
│   │   ├── layouts/              # Page layouts
│   │   └── styles/               # Global styles
│   ├── public/                   # Static assets
│   ├── astro.config.mjs          # Astro configuration
│   ├── package.json
│   └── tsconfig.json
│
├── backend/                       # NestJS API (future)
│   ├── src/
│   │   ├── modules/              # Feature modules
│   │   ├── auth/                 # Authentication
│   │   └── common/               # Shared utilities
│   ├── package.json
│   └── tsconfig.json
│
├── shared/                        # Shared packages
│   └── db/                       # Database schema & utilities
│       ├── schema.ts             # Drizzle schema definition
│       ├── seed.ts               # Database seeder script
│       ├── drizzle.config.ts     # Drizzle Kit configuration
│       ├── slang_terms/          # Source JSON files (25k+)
│       ├── package.json
│       └── tsconfig.json
│
├── docker-compose.yml             # PostgreSQL container
├── package.json                   # Root workspace config
├── README.md                      # Quick start guide
└── Documentation.md               # This file
```

---

## 🗄️ Database Schema

### Core Tables

#### **users**

User accounts for authentication and content attribution

- Authentication credentials (username, email, password)
- Profile information (display name, avatar)
- Role-based access (user, moderator, admin)

#### **terms**

The slang terms/entries

- Term name and URL-friendly slug
- Source URL from original slang.gr
- Status (published, pending, rejected)
- Submission and approval tracking
- View count analytics
- Timestamps

#### **definitions**

Multiple definitions per term (one term can have several meanings)

- Definition text and usage example
- Display order for sorting
- Vote counts (upvotes/downvotes)
- Source tracking for imported data

#### **comments**

User discussions on terms

- Nested comments (parent-child relationship)
- Soft deletion (is_deleted flag)
- Vote counts
- Associated with user and term

### Engagement Tables

#### **definition_votes** & **comment_votes**

User voting on definitions and comments

- One vote per user per item (unique constraint)
- Vote type (up/down)
- Enables democratic quality control

#### **tags**

Categorization system

- Tag name and slug
- Optional description

#### **term_tags** (junction table)

Many-to-many relationship between terms and tags

- Allows terms to belong to multiple categories

#### **bookmarks**

Users can save favorite terms

- One bookmark per user per term (unique constraint)

### Relationships

- **One-to-Many**: User → Terms (submitted), User → Comments
- **Many-to-Many**: Terms ↔ Tags (via term_tags junction)
- **Self-Referencing**: Comments → Comments (nested replies)
- **Foreign Keys**: All relationships with CASCADE on delete for data integrity

---

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh) 1.0+
- [Docker](https://www.docker.com/) & Docker Compose
- Git

### Initial Setup

1. **Clone and install dependencies**

   ```bash
   git clone <repository-url>
   cd argko.gr
   bun install
   ```

2. **Start PostgreSQL**

   ```bash
   docker compose up -d
   ```

3. **Configure environment**

   ```bash
   cd shared/db
   cp .env.example .env
   # Edit .env with your DATABASE_URL if needed
   ```

4. **Initialize database**

   ```bash
   # Push schema to database
   bun run db:push

   # Seed with slang terms (this will take a few minutes)
   bun run db:seed
   ```

5. **Start development server**
   ```bash
   cd ../../frontend
   bun dev
   ```

### Available Scripts

**Root level:**

- `bun dev` - Start Astro dev server
- `bun build` - Build frontend for production
- `bun run db:push` - Push schema changes to database
- `bun run db:seed` - Import JSON files to database
- `bun run db:studio` - Open Drizzle Studio (database GUI)

**In shared/db:**

- `bun run db:generate` - Generate migration files
- `bun run db:migrate` - Run migrations
- `bun run seed.ts` - Seed database directly

---

## 🔧 Development Workflow

### Working with the Database

1. **Modify schema** - Edit `shared/db/schema.ts`
2. **Push changes** - `bun run db:push` (development)
3. **Or generate migration** - `bun run db:generate` (production)
4. **Inspect with Drizzle Studio** - `bun run db:studio`

### Adding New Features

1. Create/modify Astro components in `frontend/src/`
2. Update schema if needed (shared/db/schema.ts)
3. Use Drizzle relations for data fetching
4. Test locally with seed data

### Data Model Examples

**Querying with Drizzle:**

```typescript
// Get term with all definitions and comments
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

---

## 🎨 Design Philosophy

### Content-First

The platform prioritizes content accessibility and readability. Fast load times and SEO are critical.

### Community-Driven

Users can contribute, discuss, and collectively improve definitions through voting and comments.

### Scalable Architecture

The monorepo structure and clear separation between frontend/backend/shared code enables:

- Easy scaling as the project grows
- Code reuse between frontend and backend
- Independent deployment of services

### Type Safety

TypeScript + Drizzle ORM provides end-to-end type safety from database to UI.

---

## 🚢 Deployment Strategy

### Current (Phase 1)

- **Frontend**: Static site deployed to Vercel/Netlify/Cloudflare Pages
- **Database**: Managed PostgreSQL (Neon, Supabase, Railway)
- **Build**: Database seeded once, frontend queries at build time

### Future (Phase 2+)

- **Backend API**: NestJS deployed to Docker container
- **Database**: Production PostgreSQL with automated backups
- **Frontend**: Connects to API for dynamic features
- **Consideration**: Docker Compose for all services or Kubernetes for scale

---

## 📚 Technical Decisions

### Why Static Site (Astro)?

- 25k+ terms = lots of pages, SSG is perfect
- Excellent SEO out of the box
- Can add interactive islands when needed
- Blazing fast performance

### Why PostgreSQL?

- Proven reliability for relational data
- Excellent full-text search (Greek language support)
- Handles millions of rows efficiently
- JSON support for flexible data when needed

### Why Drizzle ORM?

- Type-safe queries with great DX
- Lightweight, no runtime overhead
- SQL-like syntax, close to the metal
- Excellent migration tooling

### Why Monorepo?

- Share database schema between frontend/backend
- Single source of truth for types
- Easier dependency management
- Coordinated versioning

---

## 🤝 Contributing

(To be defined based on project visibility and collaboration needs)

---

## 📄 License

(To be determined)

---

## 🙏 Acknowledgments

- Original data sourced from [slang.gr](https://www.slang.gr)
- Built with [Astro](https://astro.build), [Drizzle ORM](https://orm.drizzle.team), and [Bun](https://bun.sh)

---

**Last Updated:** February 2026  
**Status:** In Active Development (Phase 1)
