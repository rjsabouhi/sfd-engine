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

### Reactive Event System (December 27, 2024)
Added real-time reactive event detection for dynamic status narration:
- **Variance Spike**: Detected when variance changes >40% over 12 steps
- **Basin Merge**: Detected when basins decrease
- **Boundary Fracture**: Detected when curvature max spikes >1.5x
- **Approaching Stability**: Variance derivative <0.001 with low variance
- **Enter/Exit Criticality**: High variance sensitivity (0.1-0.2) with multiple basins
- **Enter/Exit Chaos**: Very high variance (>0.25) with rapid change
- Simulation phase tracking: idle/firstMotion/running
- Dynamic status line using `getStatusLine()` with priority-based event selection

### Hidden Diagnostic Suite (December 27, 2024)
Added comprehensive development/debugging tools accessible via CTRL+SHIFT+D:
- **Summary Diagnostic Dashboard**: Collapsible overview at top of panel with:
  - Stability badge (Stable/Borderline/Unstable) using threshold-based classification
  - Primary metrics grid: Energy, ΔE, Variance, Variance Trend, Max Gradient, Curvature Mean, Frame Hash, Determinism Sync
  - Warning system: High Energy Drift, Curvature Spike, Determinism Divergence, Rapid Variance Change
  - Energy trend sparkline (last 60 ΔE values)
  - Advanced metrics (collapsible): Curvature Min/Max, Gradient Min/Max, Laplacian Mean, Grid Mean/Std, Basin Count, Last 20 Frame Hashes
- **Seedable RNG**: Mulberry32 PRNG for reproducible simulations
- **5-Tab Diagnostic Panel**: Solver, Consistency, Events, Render, Internals
- **Solver Diagnostics**: Energy functional tracking, variance monitor, stability alerts
- **Consistency Checker**: Determinism verification comparing two runs from same seed
- **Event Logger**: Searchable, filterable event history with export
- **Render Stats**: Frame timing, FPS, dropped frames tracking
- **Internals Explorer**: Grid stats, gradient magnitude, curvature, Laplacian distribution
- **Export Tools**: Full diagnostics JSON, frame window, event log, determinism reports
- **Frame-by-Frame Mode**: Sandbox stepping through simulation history
- **Zero Performance Cost**: Panel only updates when visible, intervals cleared when hidden

### Mobile Video Recording (December 31, 2024)
Added real-time video recording for mobile sharing:
- **Record Button**: Located in playback controls panel, records 12 seconds of live simulation
- **Progress Indicator**: Visual progress bar shows recording time elapsed
- **Post-Recording Dialog**: After recording completes, shows options to Save or Share
- **Save to Device**: Downloads video file directly to device
- **Share Video**: Uses Web Share API for sharing to social apps (with fallback to save)
- **Format Support**: Tries VP9/VP8 WebM first, falls back to MP4 if needed
- **Live Recording**: Captures actual running simulation, not history playback

### Mobile-First App Optimization (December 30, 2024)
Complete mobile UI redesign for app-store quality experience:
- **Full-Screen Canvas**: Maximized visualization with floating overlays
- **Floating Header**: Minimal logo and status indicator
- **Live Metrics Panel**: Top-left floating display for step/energy/basins
- **Preset Chips**: Horizontal scrollable regime selection with Smart View Router integration
- **Large Touch Controls**: Central 64px play/pause button, 48px satellite controls
- **Dark Settings Sheet**: Bottom sheet with dark theme styling (bg-gray-900/95)
- **iOS Safe Areas**: CSS utilities for notched device support (pb-safe, pt-safe, etc.)
- **Accessibility**: All icon-only buttons have aria-labels, 44px minimum touch targets
- **Dark Theme Consistency**: All mobile components styled with white/10 borders, white/60 text

### Research-Grade Export Suite (December 29, 2024)
Added comprehensive export capabilities for research use:
- **Visual Exports**: PNG snapshots, GIF animations, WebM video (MediaRecorder API)
- **Data Exports**: CSV simulation data, metrics logs, operator contributions, settings JSON
- **NumPy Array (.npy)**: Binary float32 field data loadable in Python
- **Python Script (.py)**: Auto-generated reconstruction script with matplotlib visualization
- **Layer Data (.json)**: Separated curvature, gradient, tension fields computed from primary
- **Batch Spec (.json)**: Minimal parameter specification for automated testing
- **Full Archive (.json)**: Comprehensive bundle with field, operators, events, metrics, config

### Multi-Point Probe System with Detail Dialog (January 2026)
Advanced probe analysis system for research-grade field inspection:
- **Multi-Point Probes**: Save up to 8 color-coded probe locations by clicking on the field
- **Probe Detail Dialog**: Click expand button or double-click probe to open comprehensive analysis
- **Neighborhood Analysis**: 7×7 toroidal sampling with local min/max/mean/std, gradient direction/magnitude, anisotropy
- **Baseline Comparison**: Freeze probe state for delta calculations and percentage change tracking
- **Canvas Overlay Markers**: Visual indicators for saved probe positions with numbered labels
- **Reactive State**: Dialog stays synchronized with probe mutations (baseline toggles, deletions)

### Global Playback Architecture (January 2026)
Complete simulation history preservation across all parameter and regime changes:
- **FrameSnapshot Extended**: Each frame now stores full SimulationParameters alongside grid data
- **History Persistence**: Ring buffer no longer clears on parameter/regime changes - timeline preserved
- **Event Markers**: Snapshots include eventMarker field for tracking significant changes (mode changes, parameter shifts)
- **Parameter Restoration**: When resuming from a historical frame, both grid AND parameters are restored
- **UI State Sync**: React state syncs with restored params via getPlaybackParams() when committing from playback
- **Explicit Reset**: Only reset() and resetToDefaults() clear history - parameter changes preserve timeline
- Users can now scrub through entire simulation timeline including regime transitions

### Engine Enhancements
- Ring buffer for temporal history (100 frames, ~36MB for 300x300 grid)
- Operator contribution tracking per update step
- Automatic event detection system
- Derived field computation (curvature, tension, coupling, variance maps)
- Probe data computation for field inspection
- Variance change tracking for regime detection
- Reactive event detection with empirically-tuned thresholds
- Seedable mulberry32 PRNG for determinism testing
- Diagnostic data getters for solver, render, and internal metrics

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
- `DiagnosticPanel` - Hidden developer tools (CTRL+SHIFT+D)

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

### UI Components
- **Radix UI**: Core accessible primitives (dialog, dropdown, tooltip, accordion, select, slider, tabs, etc.)
- **Lucide React**: Icon library
- **Framer Motion**: Animation library (used in welcome modal)
- **React Resizable Panels**: Resizable panel layout
- **React Query**: Server state management

### Build & Development
- **Vite**: Frontend bundler with React plugin
- **esbuild**: Server bundling for production
- **Replit Plugins**: Runtime error overlay, cartographer, dev banner

### Fonts
- **Inter**: Primary UI font (Google Fonts)
- **JetBrains Mono**: Monospace font for numerical values and notebook mode

## Production Audit (January 2026)

### Removed Dependencies
- react-icons (unused)
- passport, passport-local (unused)
- connect-pg-simple (unused)
- drizzle-orm, drizzle-zod, drizzle-kit (unused)
- pg, ws (unused)
- express-session, memorystore (unused)
- react-hook-form, @hookform/resolvers (unused)
- recharts, embla-carousel-react, react-day-picker, input-otp, cmdk, vaul, date-fns (unused)
- Multiple unused Radix packages

### Removed UI Components
- chart.tsx, carousel.tsx, calendar.tsx, input-otp.tsx, drawer.tsx, command.tsx
- navigation-menu.tsx, context-menu.tsx, hover-card.tsx, toggle-group.tsx
- pagination.tsx, aspect-ratio.tsx, breadcrumb.tsx, table.tsx, sidebar.tsx
- avatar.tsx, form.tsx

### Build Stats
- **0 vulnerabilities**
- **Client JS**: 908KB (264KB gzipped)
- **Client CSS**: 68KB (12KB gzipped)
- **Server**: 840KB
- **Total dist**: ~3.1MB
