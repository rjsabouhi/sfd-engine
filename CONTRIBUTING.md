# Contributing to SFD Engine

Thank you for your interest in contributing to the Structural Field Dynamics (SFD) Engine. This document provides guidelines for researchers and developers who wish to contribute.

## Table of Contents

- [Getting Started](#getting-started)
- [How to Submit Issues](#how-to-submit-issues)
- [How to Propose Features](#how-to-propose-features)
- [Code Style Expectations](#code-style-expectations)
- [Testing Guidelines](#testing-guidelines)
- [Branch Naming and PR Conventions](#branch-naming-and-pr-conventions)
- [Review Process](#review-process)

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/sfd-engine.git
   cd sfd-engine
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Create a branch** for your work (see [Branch Naming](#branch-naming-and-pr-conventions))
5. **Make your changes** following the guidelines below
6. **Submit a pull request**

## How to Submit Issues

We use GitHub Issues to track bugs, feature requests, and questions.

### Bug Reports

When reporting a bug, please include:

- **Title**: Clear, concise description of the issue
- **Environment**: Browser, OS, screen size (if relevant)
- **Steps to Reproduce**: Numbered list of actions to trigger the bug
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Screenshots/Videos**: If applicable
- **Console Errors**: Any JavaScript errors from browser developer tools

Example:
```
Title: Field visualization freezes when switching colormaps rapidly

Environment: Chrome 120, Windows 11, 1920x1080

Steps to Reproduce:
1. Start simulation
2. Rapidly click through colormap options (5+ times in 2 seconds)
3. Observe field display

Expected: Colormap changes smoothly
Actual: Canvas stops updating, simulation continues in background

Console: No errors
```

### Documentation Issues

For documentation problems, please specify:
- Which document contains the issue
- The specific section or line
- What correction is needed

## How to Propose Features

Feature proposals should include:

1. **Problem Statement**: What problem does this solve?
2. **Proposed Solution**: How would this feature work?
3. **Alternatives Considered**: Other approaches you evaluated
4. **Use Cases**: Who would benefit and how?
5. **Implementation Notes**: Any technical considerations (optional)

For significant features, consider opening a discussion before submitting a detailed proposal.

### Feature Categories

- **Visualization**: New rendering modes, colormaps, overlays
- **Analysis**: New metrics, detection algorithms, export formats
- **Interface**: UI/UX improvements, accessibility enhancements
- **Performance**: Optimization, memory management
- **Research**: New operators, regime classifications, mathematical extensions

## Code Style Expectations

### TypeScript/JavaScript

- Use TypeScript for all new code
- Follow existing patterns in the codebase
- Use meaningful variable and function names
- Document complex algorithms with comments
- Prefer `const` over `let`; avoid `var`
- Use async/await over raw promises when possible

```typescript
// Good
const computeFieldGradient = (field: Float32Array, width: number): number => {
  // Implementation
};

// Avoid
var grad = function(f, w) {
  // Implementation
};
```

### React Components

- Use functional components with hooks
- Keep components focused on a single responsibility
- Extract complex logic into custom hooks or utility functions
- Use TypeScript interfaces for props

```typescript
interface ProbeDisplayProps {
  position: { x: number; y: number };
  value: number;
  isActive: boolean;
}

export function ProbeDisplay({ position, value, isActive }: ProbeDisplayProps) {
  // Component implementation
}
```

### CSS/Styling

- Use Tailwind CSS utility classes
- Follow the design system in `design_guidelines.md`
- Maintain dark mode compatibility
- Ensure responsive behavior

### File Organization

- Place components in `client/src/components/`
- Place utility functions in `client/src/lib/`
- Place page components in `client/src/pages/`
- Keep related code close together

## Testing Guidelines

### Manual Testing

Before submitting a PR, verify:

1. **Basic functionality**: Simulation starts, runs, and can be paused
2. **Parameter controls**: All sliders and inputs work correctly
3. **Visual rendering**: Field displays correctly with different colormaps
4. **Export functions**: At least one export from each category works
5. **Responsive design**: UI works on both desktop and mobile viewports
6. **Dark mode**: All elements render correctly in dark theme

### Determinism Testing

For changes to the simulation engine:

1. Enable diagnostic mode (Ctrl+Shift+D)
2. Run consistency checker with a fixed seed
3. Verify frame hashes match across runs

### Performance Testing

For rendering or computation changes:

1. Check FPS counter in diagnostic panel
2. Verify no memory leaks over extended runs
3. Test with maximum grid size (if applicable)

## Branch Naming and PR Conventions

### Branch Names

Use descriptive branch names with prefixes:

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `perf/` - Performance improvements

Examples:
```
feature/add-entropy-metric
fix/colormap-switching-freeze
docs/update-primer-examples
refactor/extract-probe-logic
perf/optimize-gradient-computation
```

### Commit Messages

Write clear, concise commit messages:

```
Add entropy metric to structural analysis

- Implement Shannon entropy calculation for field values
- Add entropy display to signature bar
- Include entropy in metrics export
```

### Pull Request Guidelines

1. **Title**: Clear summary of changes
2. **Description**: Explain what changed and why
3. **Testing**: Describe how you tested the changes
4. **Screenshots**: Include before/after images for UI changes
5. **Breaking Changes**: Clearly note any breaking changes

PR Template:
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation
- [ ] Refactoring
- [ ] Performance improvement

## Testing
How was this tested?

## Screenshots (if applicable)

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-reviewed the code
- [ ] Tested on desktop and mobile
- [ ] Updated documentation if needed
```

## Review Process

1. **Automated checks**: Must pass (if configured)
2. **Code review**: At least one maintainer approval required
3. **Testing verification**: Changes tested in development environment
4. **Documentation check**: README or other docs updated if needed

### Response Times

We aim to respond to:
- Issues: Within 1 week
- PRs: Within 2 weeks

Please be patient; this is a research project with limited maintainer time.

## Questions?

If you have questions about contributing, feel free to:
- Open a GitHub Discussion
- Comment on a related issue
- Reach out via the contact information in the README

Thank you for contributing to the SFD Engine!
