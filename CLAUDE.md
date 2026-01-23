# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend
```bash
npm run dev      # Start dev server (http://localhost:5173)
npm run build    # TypeScript check + Vite production build
npm run lint     # ESLint
npm run preview  # Preview production build
npm run test     # Run tests with Vitest
npm run test:ui  # Run tests with browser UI
npx vitest src/utils/candidateUtils.test.ts  # Run a single test file
```

### Backend
```bash
cd backend
npm run dev                    # Start backend server (http://localhost:3000)
npm run build                  # TypeScript compile
npm run test                   # Run all integration tests
npm run prisma:seed            # Seed database with initial data
npm run prisma:push            # Push schema changes to database
npm run prisma:generate        # Generate Prisma client
```

### Docker
```bash
docker-compose up              # Start all services (mysql, backend, frontend)
docker-compose up -d mysql     # Start only MySQL
docker-compose down -v         # Stop and remove volumes
```

### E2E Tests
```bash
npx playwright test            # Run E2E tests
npx playwright test --headed   # Run with browser visible
```

## Architecture

Hellio HR is a full-stack application with React + TypeScript frontend and Node.js + Express + MySQL backend.

### Project Structure

```
HellioHR/
├── backend/                    # Node.js + Express backend
│   ├── src/
│   │   ├── config/             # env.ts, database.ts
│   │   ├── middleware/         # auth.ts, roleGuard.ts, errorHandler.ts
│   │   ├── routes/             # auth.routes.ts, candidates.routes.ts, positions.routes.ts
│   │   ├── services/           # authService.ts, candidateService.ts, positionService.ts
│   │   └── index.ts
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   └── seed.ts             # Data seeding script
│   └── test/
│       └── integration/        # API integration tests
├── src/                        # React frontend
│   ├── types/                  # TypeScript interfaces (Candidate, Position)
│   ├── data/                   # Static JSON data (fallback when not using API)
│   ├── services/               # API client and data services
│   ├── context/                # React contexts (AuthContext, ThemeContext)
│   ├── utils/                  # Pure business logic
│   ├── hooks/                  # React hooks
│   ├── components/             # Presentational components
│   └── pages/                  # Route pages
├── tests/e2e/                  # Playwright E2E tests
└── docker-compose.yml          # Docker setup
```

### API Contract

The frontend types in `src/types/index.ts` define the API contract:

```typescript
interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  skills: string[];
  positionIds: string[];
  cvUrl: string;
  status: 'active' | 'inactive';
}

interface Position {
  id: string;
  title: string;
  department: string;
  description: string;
  candidateIds: string[];
}
```

### REST API Endpoints

| Method | Endpoint | Auth | Role | Purpose |
|--------|----------|------|------|---------|
| POST | `/api/auth/login` | No | - | Returns JWT token |
| GET | `/api/auth/me` | Yes | Any | Current user + role |
| GET | `/api/candidates` | Yes | Any | List all candidates |
| GET | `/api/candidates/:id` | Yes | Any | Single candidate |
| GET | `/api/positions` | Yes | Any | List all positions |
| GET | `/api/positions/:id` | Yes | Any | Single position |
| PATCH | `/api/positions/:id` | Yes | Editor | Update position |
| GET | `/api/compare/:id1/:id2` | Yes | Any | Compare two candidates |

### Authentication

- JWT-based authentication
- Roles: `viewer` (read-only) and `editor` (can update positions)
- Demo accounts:
  - viewer@hellio.hr / viewer123
  - editor@hellio.hr / editor123

### Data Flow Pattern

1. **Frontend services** check for auth token; if present, fetch from backend API
2. **Backend routes** validate JWT and apply role-based access control
3. **Backend services** query MySQL via Prisma ORM
4. **Response** matches frontend TypeScript interfaces exactly

### Key Relationships

- Candidates have `positionIds[]` linking to positions
- Positions have `candidateIds[]` linking to candidates
- Many-to-many via `candidate_position` junction table
- Use `getLinkedPositions()` and `getLinkedCandidates()` from `positionUtils.ts`

### Routing

- `/login` - Login page
- `/` - Candidate list with search (protected)
- `/candidates/:id` - Candidate profile (protected)
- `/compare/:id1/:id2` - Side-by-side comparison (protected)
- `/positions` - Positions list (protected)

## Delegation Agents

Three specialized agents are configured in `.claude/agents/`:

- **ui-specialist**: Validates UI/UX via Playwright, checks readability and flows
- **test-bug-hunter**: Identifies edge cases, adds tests, runs lint/typecheck/tests
- **clean-code-writer**: Refactors for maintainability, enforces separation of concerns

## Null Safety

All utils handle null/undefined gracefully with `??` operators. When adding new data access:
- Always use `candidate.field ?? defaultValue` pattern
- Never assume arrays exist - use `candidate.skills ?? []`
