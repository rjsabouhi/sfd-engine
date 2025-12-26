# SFD Engine - Structural Field Dynamics Simulation

## Overview

This is a Structural Field Dynamics (SFD) simulation engine - a scientific visualization tool that demonstrates complex adaptive systems through operator-driven field evolution. The application renders real-time 2D manifold simulations with curvature-driven flows, attractor basins, and emergent geometric patterns.

The core purpose is to provide an interactive visualization of field dynamics where users can adjust simulation parameters in real-time and observe the resulting patterns on a heightfield grid.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**: React Query for server state, React useState/useRef for local state
- **Styling**: Tailwind CSS with CSS variables for theming (dark/light mode support)
- **Component Library**: shadcn/ui (Radix UI primitives with custom styling)
- **Build Tool**: Vite with React plugin

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **Structure**: Minimal API server that serves the static frontend and handles API routes
- **Development**: Vite middleware for HMR during development

### Simulation Engine
- **Location**: `client/src/lib/sfd-engine.ts`
- **Design**: Pure TypeScript class that runs entirely client-side
- **Data Structure**: Float32Array for efficient grid computation
- **Rendering**: Canvas-based visualization with colormap interpolation (Inferno/Viridis)

### Data Flow
1. SFDEngine class manages simulation state and grid data
2. Engine uses requestAnimationFrame for smooth animation
3. Callback pattern notifies React components of state updates
4. VisualizationCanvas renders grid data to HTML Canvas
5. ControlPanel provides real-time parameter adjustment

### Layout Design
- Split-screen: Visualization canvas (primary) + Control panel (sidebar)
- Dark-first theme optimized for scientific visualization
- Responsive design with mobile stack layout

### Type System
- Shared types in `shared/schema.ts` using Zod for validation
- SimulationParameters, SimulationState, and FieldData interfaces
- Path aliases: `@/` for client, `@shared/` for shared code

## External Dependencies

### Database
- **ORM**: Drizzle ORM configured for PostgreSQL
- **Schema**: Located in `shared/schema.ts`
- **Status**: Schema defined but currently unused (placeholder `users` export)

### UI Components
- **Radix UI**: Full suite of accessible primitives (dialog, dropdown, tooltip, etc.)
- **Lucide React**: Icon library
- **Embla Carousel**: Carousel component
- **React Day Picker**: Calendar component
- **Recharts**: Charting library (available but not currently used)

### Build & Development
- **Vite**: Frontend bundler with React plugin
- **esbuild**: Server bundling for production
- **Replit Plugins**: Runtime error overlay, cartographer, dev banner

### Fonts
- **Inter**: Primary UI font (Google Fonts)
- **JetBrains Mono**: Monospace font for numerical values