# Structural Field Dynamics (SFD) Engine

A computational framework for visualizing emergent structure in complex adaptive systems through operator-driven field evolution.

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](RELEASE_NOTES.md)
[![Live Demo](https://img.shields.io/badge/SFD%20Engine-Live%20Demo-red.svg)](https://sfd-engine.replit.app/)
---

## Abstract

The Structural Field Dynamics (SFD) Engine is an interactive visualization tool that demonstrates how local computational rules can produce coherent global patterns. It renders real-time 2D manifold simulations featuring curvature-driven flows, attractor basins, and emergent geometric structures.

This framework provides researchers and practitioners with a sandbox for exploring parameter spaces, observing regime transitions, and developing intuitions about structure formation in dynamical systems.

---

## Key Features

- **Real-time field evolution** with configurable operator weights
- **Multiple visualization modes** including primary field, curvature, gradient, tension, and variance maps
- **Regime detection** with automatic classification of system states
- **Temporal playback** with 100-frame ring buffer history
- **Multi-point probe system** for detailed field inspection
- **Comprehensive export suite** supporting PNG, WebM, CSV, NumPy, and Python reconstruction scripts
- **Preset configurations** for common dynamical regimes
- **Mobile-optimized interface** with touch controls

---

## What This System Does

The SFD Engine:

- Visualizes how local update rules produce global spatial patterns
- Provides interactive parameter adjustment with immediate visual feedback
- Tracks and displays key metrics: field energy, variance, basin count, and curvature
- Detects and logs structural events (variance spikes, basin merges, boundary fractures)
- Enables systematic exploration of parameter spaces through preset regimes
- Exports simulation data in formats suitable for further analysis

---

## What This System Is NOT

To set appropriate expectations:

- **Not a physics simulator** — The operators do not correspond to specific physical laws
- **Not a predictive model** — Results describe emergent behavior within the defined rules, not real-world forecasts
- **Not validated against empirical data** — This is a computational exploration tool, not a scientific instrument
- **Not making ontological claims** — The terminology (fields, attractors, basins) is descriptive, not asserting these structures exist in nature

---

## Conceptual Overview

The engine operates on a discrete 2D grid where each cell holds a scalar field value. At each simulation step, five operators contribute to field evolution:

1. **Diffusion** — Smooths local variations, promoting spatial coherence
2. **Curvature** — Enhances or suppresses regions based on local surface geometry
3. **Tension** — Resists deviation from neighboring values
4. **Coupling** — Introduces nonlinear feedback based on field magnitude
5. **Noise** — Adds stochastic perturbations to prevent stagnation

The relative weights of these operators determine the system's behavior, producing distinct dynamical regimes ranging from stable equilibria to chaotic evolution.

---

## Mathematical Structure

### Field Update Rule

At each timestep, the field $\phi$ evolves according to:

$$\phi_{t+1} = \phi_t + \Delta t \sum_i w_i \cdot O_i(\phi_t)$$

where $O_i$ are the operators and $w_i$ their respective weights.

### Operators

| Operator | Definition | Effect |
|----------|------------|--------|
| Diffusion | $\nabla^2 \phi$ (discrete Laplacian) | Spatial smoothing |
| Curvature | Mean curvature of $\phi$ as height field | Geometric flow |
| Tension | $-\phi + \langle\phi\rangle_{neighbors}$ | Local averaging |
| Coupling | $\tanh(\phi) \cdot |\nabla\phi|$ | Nonlinear feedback |
| Noise | $\mathcal{N}(0, \sigma^2)$ | Stochastic perturbation |

### Detected Regimes

The system automatically classifies behavior into regimes based on metrics:

- **Ground State** — Minimal variance, single basin
- **Crystalline** — Low variance, multiple stable basins
- **Wave-Locked** — Moderate variance with oscillatory character
- **Turbulent Mixing** — High variance, frequent basin changes
- **Critical** — Sensitivity to perturbations, complex basin structure
- **Chaotic** — Very high variance with rapid unpredictable changes

### Key Metrics

- **Field Energy**: $E = \sum_{i,j} \phi_{i,j}^2$
- **Variance**: $\sigma^2 = \text{Var}(\phi)$
- **Basin Count**: Number of distinct attractor basins via gradient descent
- **Curvature Range**: Min/max of discrete mean curvature

---

## Export System

The engine provides comprehensive export capabilities:

### Visual Exports
- **PNG Snapshot** — Current field state as image
- **WebM Video** — Playback history as video
- **Field Layers** — Contact sheet of all derived fields

### Data Exports
- **Metrics Summary** — CSV of tracked metrics over time
- **Settings JSON** — Current parameter configuration
- **Event Log** — Chronological record of structural events

### Technical Exports (Advanced Mode)
- **NumPy Array** — Raw field data as `.npy` file
- **Python Script** — Reconstruction script with matplotlib visualization
- **Batch Spec** — Minimal parameters for automated runs
- **Full Archive** — Complete simulation state bundle

---

## Installation and Usage

### Running on Replit

1. Open the project in Replit
2. Click "Run" — the application starts automatically
3. Access the visualization at the provided URL

### Local Development

```bash
# Clone the repository
git clone <repository-url>
cd sfd-engine

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5000`.

### Python Reconstruction

Exported `.npy` files can be loaded in Python:

```python
import numpy as np
import matplotlib.pyplot as plt

# Load exported field
field = np.load('sfd-numpy-export.npy')

# Visualize
plt.imshow(field, cmap='inferno')
plt.colorbar(label='Field Value')
plt.title('SFD Field Reconstruction')
plt.show()
```

---

## Example Workflow

1. **Select a regime preset** from the Home tab to configure operators
2. **Observe the field evolution** in the main canvas
3. **Adjust parameters** in the Controls tab to explore variations
4. **Use the timeline** to scrub through simulation history
5. **Place probes** to inspect local field values
6. **Export data** for external analysis or publication

---

## Live Simulator Demo
Run the SFD Engine directly in your browser:
https://sfd-engine.replit.app/

## Citation

If you use the SFD Engine in your research, please cite:

```bibtex
@software{sabouhi2026sfd,
  author = {Sabouhi, Ryan},
  title = {Structural Field Dynamics (SFD) Engine},
  year = {2026},
  version = {1.0.0},
  url = {https://github.com/rjsabouhi/sfd-engine}
}
```

See [CITATION.cff](CITATION.cff) for machine-readable citation metadata.

---

## Documentation

- [Technical Primer](SFD_PRIMER.md) — Conceptual overview and interpretation guide
- [Release Notes](RELEASE_NOTES.md) — Version history and changelog
- [Contributing Guide](CONTRIBUTING.md) — How to contribute
- [Code of Conduct](CODE_OF_CONDUCT.md) — Community guidelines
- [License](LICENSE) — Apache License 2.0

---

## Version

**v1.0.0** — Initial public release

See [RELEASE_NOTES.md](RELEASE_NOTES.md) for detailed version information.

---

## License

This project is licensed under the Apache License 2.0. See [LICENSE](LICENSE) for details.
