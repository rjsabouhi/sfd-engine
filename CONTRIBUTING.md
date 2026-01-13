# Contributing to the SFD Engine

Thank you for your interest in contributing to the Structural Field Dynamics Engine. This document provides guidelines for researchers and developers who wish to contribute.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Submitting Issues](#submitting-issues)
- [Proposing Features](#proposing-features)
- [Code Contributions](#code-contributions)
- [Code Style](#code-style)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)

---

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Install dependencies with `npm install`
4. Create a new branch for your work
5. Make your changes
6. Submit a pull request

---

## Submitting Issues

When reporting bugs or problems:

### Bug Reports

Please include:

- **Clear title** describing the issue
- **Steps to reproduce** the problem
- **Expected behavior** vs. actual behavior
- **Environment details** (browser, OS, screen size)
- **Screenshots or recordings** if applicable
- **Console errors** if any appear

### Example Bug Report

```
Title: Field visualization freezes when changing colormap

Steps to reproduce:
1. Start simulation
2. Let it run for ~30 seconds
3. Change colormap from Inferno to Viridis

Expected: Colormap changes smoothly
Actual: Canvas freezes, requires page refresh

Environment: Chrome 120, macOS 14.2, 1920x1080
Console: No errors visible
```

---

## Proposing Features

Before proposing a new feature:

1. **Search existing issues** to avoid duplicates
2. **Consider the scope** — Does it align with the project's purpose?
3. **Think about implementation** — Is it technically feasible?

### Feature Proposal Template

```
Title: [Feature] Brief description

## Problem
What problem does this solve?

## Proposed Solution
How would this work?

## Alternatives Considered
What other approaches did you consider?

## Additional Context
Any relevant background, mockups, or references
```

---

## Code Contributions

### Branch Naming

Use descriptive branch names:

- `feature/` — New features (e.g., `feature/probe-history-export`)
- `fix/` — Bug fixes (e.g., `fix/colormap-freeze`)
- `docs/` — Documentation updates (e.g., `docs/api-reference`)
- `refactor/` — Code refactoring (e.g., `refactor/engine-state-management`)

### Commit Messages

Write clear, descriptive commit messages:

```
Good:
- "Add basin boundary overlay toggle"
- "Fix memory leak in ring buffer cleanup"
- "Update operator documentation with formulas"

Avoid:
- "Fixed stuff"
- "WIP"
- "Changes"
```

---

## Code Style

### TypeScript

- Use strict TypeScript — no `any` types without justification
- Define interfaces for complex objects
- Use meaningful variable names
- Add JSDoc comments for public functions

```typescript
/**
 * Computes the discrete Laplacian of the field at position (x, y)
 * using a 5-point stencil with toroidal boundary conditions.
 */
function computeLaplacian(field: Float32Array, x: number, y: number, width: number): number {
  // Implementation
}
```

### React Components

- Use functional components with hooks
- Keep components focused on single responsibilities
- Extract reusable logic into custom hooks
- Use semantic prop names

### CSS/Tailwind

- Follow the existing design system in `design_guidelines.md`
- Use CSS variables for colors (defined in `index.css`)
- Prefer Tailwind utility classes over custom CSS
- Maintain dark mode compatibility

---

## Testing Guidelines

### Manual Testing

Before submitting a PR, verify:

1. **Core functionality** — Simulation runs correctly
2. **Parameter changes** — All sliders and controls work
3. **Export functions** — Exports produce valid files
4. **Responsive design** — Works on desktop and mobile
5. **Browser compatibility** — Test in Chrome, Firefox, Safari

### Areas Requiring Special Attention

- **Ring buffer operations** — Memory management is critical
- **Canvas rendering** — Performance impacts user experience
- **Export functions** — File formats must be valid
- **State management** — Avoid race conditions

### Performance Considerations

- Profile any changes to the simulation loop
- Avoid allocations in hot paths
- Test with large grid sizes (500x500)
- Monitor memory usage over extended sessions

---

## Pull Request Process

### Before Submitting

1. Ensure your code follows the style guidelines
2. Test your changes thoroughly
3. Update documentation if needed
4. Rebase on the latest main branch

### PR Template

```
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring
- [ ] Other (describe)

## Testing Performed
Describe how you tested the changes

## Screenshots
If applicable, add screenshots

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-reviewed my code
- [ ] Added comments for complex logic
- [ ] Updated documentation if needed
- [ ] No new warnings or errors
```

### Review Process

1. Maintainers will review your PR
2. Address any requested changes
3. Once approved, your PR will be merged

### Response Time

We aim to respond to PRs within one week. Complex changes may require additional review time.

---

## Questions?

If you have questions about contributing, please open an issue with the `question` label.

Thank you for helping improve the SFD Engine!
