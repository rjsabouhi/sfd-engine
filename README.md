# Structural Field Dynamics (SFD) Engine

A computational framework for visualizing emergent structure in complex adaptive systems through operator-driven field evolution.

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](RELEASE_NOTES.md)

## Abstract

The Structural Field Dynamics (SFD) Engine is an interactive visualization tool that demonstrates how local computational rules give rise to global geometric patterns. By applying configurable differential operators to a 2D scalar field, the system reveals emergent phenomena including attractor basins, phase transitions, and self-organizing structures.

This tool is designed for researchers and educators in complexity science, computational modeling, and machine learning who wish to explore how simple local dynamics can produce rich global behavior.

## Key Features

- **Real-time 2D field visualization** with smooth animation and multiple colormaps
- **Configurable operator system** controlling diffusion, curvature flow, tension, coupling, and noise
- **Automatic regime detection** classifying system state (equilibrium, oscillatory, chaotic, etc.)
- **Multi-probe inspection** for detailed local field analysis with neighborhood statistics
- **Temporal playback** with 100-frame history buffer and timeline scrubbing
- **Dual-field view** showing derived quantities (curvature, gradient, tension, variance)
- **Research-grade export suite** including PNG, WebM, CSV, NumPy, and Python reconstruction scripts
- **Mobile-optimized interface** with touch controls and video recording
- **Diagnostic tools** for determinism testing and solver analysis

## What This System Does

The SFD Engine simulates the evolution of a scalar field under the influence of multiple differential operators:

1. **Diffusion** - Smooths the field by averaging neighboring values
2. **Curvature flow** - Drives evolution based on local surface curvature
3. **Tension** - Pulls field values toward their local neighborhood
4. **Coupling** - Creates nonlinear feedback between field values
5. **Noise** - Introduces controlled stochastic perturbations

Users can adjust operator strengths in real-time and observe how the field evolves, transitions between regimes, and forms stable or chaotic patterns.

## What This System Is NOT

- **Not a physics simulation** - The operators are abstract mathematical constructs, not models of physical forces
- **Not a predictive model** - The system does not forecast real-world phenomena
- **Not a neural network** - While useful for studying emergence, this is not machine learning
- **Not making ontological claims** - The terminology (energy, tension, etc.) is metaphorical, not literal

## Conceptual Overview

The SFD Engine explores a fundamental question in complexity science: how do simple local rules produce complex global patterns?

The simulation maintains a 2D grid of scalar values. At each timestep, every cell updates based on:
- Its current value
- The values of its neighbors (toroidal boundary conditions)
- The weighted contribution of each operator

This local-to-global dynamic produces emergent phenomena including:
- **Basin formation** - Regions that converge to distinct attractors
- **Phase transitions** - Sudden shifts between qualitatively different states
- **Self-organization** - Spontaneous pattern formation from random initial conditions
- **Criticality** - Edge-of-chaos dynamics with scale-free correlations

## Mathematical Structure

### Field Representation

The field `u(x, y, t)` is discretized on an N×N grid with periodic boundary conditions.

### Update Equation

At each timestep, the field evolves according to:

```
u(t+1) = u(t) + dt × [α₁L(u) + α₂K(u) + α₃T(u) + α₄C(u) + α₅η]
```

Where:
- `L(u)` - Laplacian operator (diffusion)
- `K(u)` - Mean curvature operator
- `T(u)` - Tension operator
- `C(u)` - Nonlinear coupling operator
- `η` - Noise term (seedable PRNG)
- `α₁...α₅` - Operator weights (user-configurable)

### Metrics

The system computes several diagnostic quantities:

| Metric | Description |
|--------|-------------|
| Field Gradient (FG) | Mean gradient magnitude across the field |
| Curvature Complexity (CC) | Variance of local curvature values |
| Tension Index (TI) | Measure of field smoothness |
| Total Energy (TE) | Sum of squared field values |
| Regime Index (RI) | Categorical classification of system state |
| Stability Rating (SR) | Quantified stability based on variance trends |

### Regime Classification

The system automatically detects eight distinct regimes:

1. **Equilibrium** - Stable, low-variance state
2. **Near-Critical** - Edge of transition with high sensitivity
3. **Oscillatory** - Periodic fluctuations
4. **Chaotic** - High variance with rapid change
5. **Transitional** - Between stable states
6. **Deep Attractor** - Strong basin convergence
7. **Boundary Dynamics** - Active at basin edges
8. **Emergent Structure** - Self-organizing patterns

## Export System

The SFD Engine provides comprehensive export capabilities:

### Visual Exports
- **PNG Snapshot** - Current field state as image (main, projection, or side-by-side)
- **WebM Video** - Animated playback of simulation history
- **Field Layers** - Contact sheet of all derived field visualizations

### Data Exports
- **CSV** - Simulation data in tabular format
- **Metrics Log** - Time series of computed metrics
- **Settings JSON** - Complete parameter configuration
- **Event Log** - Structural events with timestamps

### Research Exports
- **NumPy Array (.npy)** - Binary field data for Python analysis
- **Python Script (.py)** - Auto-generated reconstruction code with matplotlib
- **Batch Spec** - Minimal parameters for automated testing
- **Full Archive** - Complete bundle with field, events, metrics, and config

## Installation and Usage

### Running on Replit

1. Fork this repository on Replit
2. Click "Run" to start the application
3. Open the webview to interact with the simulation

### Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/sfd-engine.git
cd sfd-engine

# Install dependencies
npm install

# Start development server
npm run dev
```

### Using Exported Data in Python

```python
import numpy as np
import matplotlib.pyplot as plt

# Load exported field data
field = np.load('sfd-field.npy')

# Visualize
plt.imshow(field, cmap='inferno')
plt.colorbar(label='Field Value')
plt.title('SFD Field State')
plt.show()
```

## Example Workflow

1. **Start the simulation** - The field initializes with gentle random perturbations
2. **Adjust parameters** - Use the control panel to modify operator strengths
3. **Observe regime transitions** - Watch as the system moves between states
4. **Place probes** - Click on the field to save inspection points
5. **Review history** - Use temporal controls to scrub through past states
6. **Export results** - Save snapshots, videos, or data for further analysis

## Citation

If you use the SFD Engine in your research, please cite:

```bibtex
@software{sabouhi2026sfd,
  author = {Sabouhi, Ryan},
  title = {Structural Field Dynamics (SFD) Engine},
  year = {2026},
  version = {1.0.0},
  url = {https://github.com/yourusername/sfd-engine}
}
```

See [CITATION.cff](CITATION.cff) for machine-readable citation metadata.

## Documentation

- [SFD Primer](SFD_PRIMER.md) - Technical overview and interpretation guide
- [Release Notes](RELEASE_NOTES.md) - Version history and changelog
- [Contributing](CONTRIBUTING.md) - Guidelines for contributors
- [Code of Conduct](CODE_OF_CONDUCT.md) - Community standards
- [License](LICENSE) - Apache License 2.0

## Version

**v1.0.0** - Initial public release

See [RELEASE_NOTES.md](RELEASE_NOTES.md) for detailed version information.

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

Built with React, TypeScript, and Tailwind CSS. Visualization powered by HTML5 Canvas.
