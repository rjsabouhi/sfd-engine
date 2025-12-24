# Design Guidelines: Structural Field Dynamics Engine

## Design Approach

**Selected Approach:** Design System (Material Design) with scientific visualization principles
**Justification:** Scientific/data visualization tool where clarity, precision, and focus on the simulation are paramount. The visualization canvas is the hero element.

## Core Design Principles

1. **Visualization-First:** The field simulation is the primary focus; UI elements support but never compete
2. **Technical Precision:** Clean, data-oriented interface that conveys scientific credibility
3. **Dark Canvas:** Dark backgrounds enhance visibility of colorful field visualizations
4. **Efficient Controls:** Parameter adjustments should be immediate and intuitive

## Typography

**Font Families:**
- Primary: 'Inter' (controls, labels, headers)
- Monospace: 'JetBrains Mono' (numerical values, parameters, data readouts)

**Hierarchy:**
- Page title: text-2xl, font-semibold
- Section headers: text-lg, font-medium
- Parameter labels: text-sm, font-normal
- Numerical values: text-base, font-mono
- Help text: text-xs, text-gray-400

## Layout System

**Spacing Units:** Tailwind 2, 4, 6, 8 units (p-2, m-4, gap-6, py-8)

**Core Layout:**
- Split-screen design: Visualization canvas (70%) + Control panel (30%)
- Canvas: Full-height, dark background, centered visualization
- Controls: Fixed sidebar, scrollable, light background on dark mode
- Responsive: Stack vertically on mobile (canvas top, controls bottom)

## Component Library

### Visualization Canvas
- Full-bleed dark container (bg-gray-900)
- Centered matplotlib output
- Frame counter overlay (top-left, subtle)
- Status indicator (bottom-right, small)

### Control Panel
- Sectioned parameter groups with dividers
- Collapsible sections for operator weights
- Real-time value displays alongside sliders
- Preset configurations dropdown
- Play/Pause/Reset controls prominently placed

### Parameter Controls
**Sliders:** Material Design style with visible track, numerical input field paired
**Numerical Inputs:** Monospace font, precise step controls, validation
**Buttons:** Filled for primary actions (Run Simulation), outlined for secondary (Reset)
**Dropdowns:** Clean, minimal with operator/preset selections

### Data Display
- Statistics panel showing: current step, energy level, variance, basin count
- Compact metric cards (2-column grid)
- Each metric: label + large numerical value + trend indicator

### Information Components
- Operator explanation tooltips (hover icons)
- Parameter range indicators
- Performance metrics (FPS, computation time)

## Functional Sections

1. **Header Bar:** Title + mode toggle (light/dark) + help icon
2. **Main Canvas:** Visualization with minimal chrome
3. **Control Sidebar:**
   - Simulation Controls (top)
   - Core Parameters (curvature, coupling, etc.)
   - Operator Weights (collapsible)
   - Advanced Settings (collapsible)
   - Statistics Panel (bottom)
4. **Footer Status:** Brief system info, optional save/export controls

## Images

**No hero images required.** This is a scientific tool where the live simulation visualization serves as the dynamic visual centerpiece. Any static imagery would detract from the real-time field dynamics display.

## Visual Treatment

**Color Strategy:**
- Visualization uses 'inferno' or 'viridis' colormaps (as specified)
- UI uses neutral grays with accent color for interactive elements
- Accent: Teal/cyan for scientific aesthetic (#06b6d4)
- Background: Dark slate for canvas, lighter for controls

**Depth & Hierarchy:**
- Subtle shadows on control panels
- Clear visual separation between canvas and controls
- Parameter groups with subtle borders/backgrounds
- Active/selected states clearly indicated

## Accessibility

- High contrast between text and backgrounds
- Keyboard shortcuts for play/pause/reset
- Clear focus indicators on all controls
- Slider values always visible
- Labels for all controls

## Animation

**Minimal and purposeful:**
- Smooth transitions on parameter changes (150ms)
- No distracting UI animations
- Simulation renders at stable 5-10 FPS
- Loading states for computation-heavy operations

---

**Expected Output:** A professional scientific visualization interface where users can immediately understand the SFD simulation behavior, adjust parameters with precision, and observe emergent patterns in real-time without UI interference.