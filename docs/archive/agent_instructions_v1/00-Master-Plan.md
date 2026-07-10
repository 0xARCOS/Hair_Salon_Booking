# Master Plan: Lean Supabase Booking & CRM Template

## 1. Objective
Build a lightweight, highly functional, and cost-effective landing page and booking system for a service-based business (e.g., Hair Salon). The system should be serverless, scalable, and easy to maintain.

## 2. Technology Stack
We have optimized the stack for high developer velocity, minimal operational cost, and excellent user experience:
- **Framework**: Next.js (App Router) - Provides built-in API routes/Server Actions, making it easy to integrate Google Calendar without a separate Node.js backend.
- **Language**: TypeScript - For type safety and better developer experience.
- **Styling**: Tailwind CSS + shadcn/ui - For rapid UI development with beautiful, accessible, and customizable components.
- **Backend/BaaS**: Supabase - Handles PostgreSQL database, Authentication, Row Level Security (RLS), and API layer via PostgREST.
- **External Integration**: Google Calendar API - Handled via Next.js Server Actions to protect API keys.

## 3. Directory Structure
The workspace is organized as follows:
```
/
├── docs/
│   └── agent_instructions/     # Detailed specifications for the coding agent
├── src/                        # Next.js Application Source (to be generated)
│   ├── app/                    # Next.js App Router (Pages, Layouts, API)
│   ├── components/             # Reusable UI components (shadcn/ui + custom)
│   ├── lib/                    # Utility functions, Supabase clients
│   └── actions/                # Next.js Server Actions (GCal, DB Mutations)
├── supabase/                   # Supabase migrations and types
└── package.json                # Project dependencies
```

## 4. Execution Phases
The coding agent should follow these phases sequentially:
1. **Phase 1: Project Initialization & Architecture** (See `02-Nextjs-Architecture.md`)
2. **Phase 2: Database Setup & RLS** (See `01-Database-Schema.md`)
3. **Phase 3: Authentication & Middleware** (See `03-Auth-and-Routing.md`)
4. **Phase 4: Booking Engine & Google Calendar** (See `04-Booking-Engine.md`)
5. **Phase 5: UI/UX Implementation** (See `05-UI-UX-Design.md`)

**Coding Agent Rule**: Read the corresponding instruction file before starting a phase. Output only requested code blocks or perform the necessary tool calls to set up the files.
