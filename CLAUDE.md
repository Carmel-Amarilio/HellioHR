# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (http://localhost:5173)
npm run build    # TypeScript check + Vite production build
npm run lint     # ESLint
npm run preview  # Preview production build
npm run test     # Run tests with Vitest
npm run test:ui  # Run tests with browser UI
npx vitest src/utils/candidateUtils.test.ts  # Run a single test file
```

## Architecture

Hellio HR is a React + TypeScript + Vite application for managing candidates and positions.

### Layer Structure

```
src/
├── types/          # TypeScript interfaces (Candidate, Position)
├── data/           # Static JSON data (candidates.json, positions.json)
├── services/       # Data access layer (getAllCandidates, getCandidateById, etc.)
├── utils/          # Pure business logic (filterCandidatesBySearch, getLinkedPositions)
├── hooks/          # React hooks with memoization (useCandidates, usePositions)
├── components/     # Presentational components (CandidateCard, CandidateList)
└── pages/          # Route pages (CandidatesPage, CandidateProfilePage, PositionsPage)
```

### Data Flow Pattern

1. **Services** load and type-cast JSON data (single source of truth)
2. **Utils** contain pure functions for filtering, sorting, relationships
3. **Hooks** wrap services with React memoization
4. **Pages** orchestrate hooks and utils, pass data to components
5. **Components** are pure presentational (receive props, render UI)

### Key Relationships

- Candidates have `positionIds[]` linking to positions
- Positions have `candidateIds[]` linking to candidates
- Use `getLinkedPositions()` and `getLinkedCandidates()` from `positionUtils.ts`

### Routing

- `/` - Candidate list with search (supports `?search=` and `?selected=id1,id2` query params)
- `/candidates/:id` - Candidate profile
- `/compare/:id1/:id2` - Side-by-side candidate comparison
- `/positions` - Positions list with expandable cards

## Delegation Agents

Three specialized agents are configured in `.claude/agents/`:

- **ui-specialist**: Validates UI/UX via Playwright, checks readability and flows
- **test-bug-hunter**: Identifies edge cases, adds tests, runs lint/typecheck/tests
- **clean-code-writer**: Refactors for maintainability, enforces separation of concerns

## Null Safety

All utils handle null/undefined gracefully with `??` operators. When adding new data access:
- Always use `candidate.field ?? defaultValue` pattern
- Never assume arrays exist - use `candidate.skills ?? []`
