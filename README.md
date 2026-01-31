# Argko.gr - Greek Slang Database

## Quick Start

### 1. Start PostgreSQL

```bash
docker compose up -d
```

### 2. Install Dependencies

```bash
cd shared/db
bun install
```

### 3. Set up Database URL

Create a `.env` file in `shared/db`:

```bash
DATABASE_URL=postgresql://argko:argko@localhost:5432/argko
```

### 4. Generate and Push Schema

```bash
cd shared/db
bun run db:push
```

### 5. Seed the Database

```bash
bun run db:seed
```

### 6. View Database (optional)

```bash
bun run db:studio
```

## Project Structure

```
argko.gr/
├── frontend/              # Astro site
├── shared/
│   └── db/               # Database schema & seeder
│       ├── schema.ts     # Drizzle schema
│       ├── seed.ts       # Seeding script
│       └── slang_terms/  # JSON source files
├── docker-compose.yml    # PostgreSQL container
└── README.md
```

## Scripts

- `db:generate` - Generate migrations from schema
- `db:migrate` - Run migrations
- `db:push` - Push schema directly (development)
- `db:studio` - Open Drizzle Studio GUI
- `db:seed` - Import all slang terms from JSON files

## Environment Variables

**DATABASE_URL**: PostgreSQL connection string

- Local: `postgresql://argko:argko@localhost:5432/argko`
- Production: Your hosted PostgreSQL URL
