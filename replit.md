# SFD Engine - Structural Field Dynamics Simulation

## Overview

This is a Structural Field Dynamics (SFD) simulation engine - a scientific visualization tool that demonstrates complex adaptive systems through operator-driven field evolution. The application renders real-time 2D manifold simulations with curvature-driven flows, attractor basins, and emergent geometric patterns.

The core purpose is to provide an interactive visualization of field dynamics where users can adjust simulation parameters in real-time and observe the resulting patterns on a heightfield grid. The application includes research-grade analysis tools for in-depth structural field analysis.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (December 2024)

### Research-Grade Feature Suite
Added 12 research-grade features for comprehensive field analysis:

1. **Field State Inspector** - Hover probe tool showing real-time field values at cursor position
2. **Temporal Playback Controls** - Ring buffer history (100 frames) with timeline scrubbing
3. **Preset Structural Regimes** - Predefined parameter configurations for common dynamics
4. **Export Options** - PNG snapshots, JSON settings export, GIF placeholder
5. **Basin Mapper Overlay** - Gradient-descent basin identification with color overlay
6. **Phase Transition Detector** - Automatic event detection for variance spikes and basin changes
7. **Dual-Field View** - Side-by-side visualization of primary and derived fields
8. **Structural Event Log** - Chronological record of detected structural events
9. **Operator Sensitivity Visualizer** - Real-time contribution breakdown by operator
10. **Structural Signature Bar** - Quick metrics display (basins, depth, curvature, stability)
11. **Notebook Mode** - Researcher view with equations, parameters, and regime analysis
12. **Basin Map Integration** - Visual overlay showing basin boundaries

### Centralized Language System
Added a comprehensive LANGUAGE engine (`client/src/lib/language.ts`) for all UI text:
- **Three Interpretation Modes**: Technical, Structural, Intuitive
- **LANGUAGE.META**: Mode names and descriptions
- **LANGUAGE.ONBOARDING**: All onboarding step text, button labels
- **LANGUAGE.METRICS**: 6 metrics (FG, CC, TI, TE, RI, SR) with mode-specific descriptions
- **LANGUAGE.REGIMES**: 8 system states with mode-aware explanations
- **LANGUAGE.UI**: Common UI strings (Reset, Export, etc.)
- Regime detection system analyzes basin count, variance, energy, and variance change

### Engine Enhancements
- Ring buffer for temporal history (100 frames, ~36MB for 300x300 grid)
- Operator contribution tracking per update step
- Automatic event detection system
- Derived field computation (curvature, tension, coupling, variance maps)
- Probe data computation for field inspection
- Variance change tracking for regime detection

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**: React Query for server state, React useState/useRef for local state
- **Styling**: Tailwind CSS with CSS variables for theming (dark mode optimized)
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
- **Rendering**: Canvas-based visualization with colormap interpolation (Inferno/Viridis/Plasma)
- **History**: Ring buffer stores 100 frames for temporal playback
- **Analysis**: Real-time operator contribution tracking and basin mapping

### Key Components
- `VisualizationCanvas` - Primary field renderer with basin overlay support
- `ControlPanel` - Full parameter controls with collapsible sections
- `HoverProbe` - Field inspection tooltip following cursor
- `TemporalControls` - Timeline playback with frame scrubbing
- `DualFieldView` - Derived field visualization (curvature/tension/coupling/variance)
- `OperatorSensitivity` - Contribution bar chart
- `EventLog` - Structural event history
- `NotebookMode` - Researcher reference panel
- `StructuralSignatureBar` - Quick metrics display

### Data Flow
1. SFDEngine class manages simulation state and grid data
2. Engine uses requestAnimationFrame for smooth animation
3. Callback pattern notifies React components of state updates
4. VisualizationCanvas renders grid data to HTML Canvas
5. ControlPanel provides real-time parameter adjustment
6. Ring buffer captures frame history for temporal playback

### Layout Design
- Split-screen: Visualization canvas (primary) + Control panel (sidebar)
- Optional dual-field view for derived visualizations
- Dark-first theme optimized for scientific visualization
- Responsive design with mobile stack layout

### Type System
- Shared types in `shared/schema.ts` using Zod for validation
- SimulationParameters, SimulationState, FieldData interfaces
- OperatorContributions, ProbeData, StructuralEvent, BasinMap, DerivedField types
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
- **JetBrains Mono**: Monospace font for numerical values and notebook mode
