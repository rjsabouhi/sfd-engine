export interface VisualPreset {
  id: string;
  label: string;
  colorMap: 'viridis' | 'inferno' | 'plasma' | 'magma' | 'cividis';
  blend: number;
  noiseWeight: number;
  curvature: number;
  smoothing: number;
  previewColor1: string;
  previewColor2: string;
}

export const visualPresets: VisualPreset[] = [
  {
    id: 'equilibriumGlow',
    label: 'Equilibrium Glow',
    colorMap: 'viridis',
    blend: 0.35,
    noiseWeight: 0.1,
    curvature: 0.0,
    smoothing: 0.6,
    previewColor1: '#440154',
    previewColor2: '#fde725',
  },
  {
    id: 'shearBloom',
    label: 'Shear Bloom',
    colorMap: 'inferno',
    blend: 0.75,
    noiseWeight: 0.2,
    curvature: 1.2,
    smoothing: 0.5,
    previewColor1: '#000004',
    previewColor2: '#fcffa4',
  },
  {
    id: 'fractalSoft',
    label: 'Fractal Soft',
    colorMap: 'plasma',
    blend: 0.5,
    noiseWeight: 0.15,
    curvature: 0.8,
    smoothing: 0.4,
    previewColor1: '#0d0887',
    previewColor2: '#f0f921',
  },
  {
    id: 'collapseFog',
    label: 'Collapse Fog',
    colorMap: 'magma',
    blend: 0.9,
    noiseWeight: 0.05,
    curvature: 2.0,
    smoothing: 0.8,
    previewColor1: '#000004',
    previewColor2: '#fcfdbf',
  },
  {
    id: 'oceanDepth',
    label: 'Ocean Depth',
    colorMap: 'cividis',
    blend: 0.45,
    noiseWeight: 0.12,
    curvature: 0.3,
    smoothing: 0.55,
    previewColor1: '#00224e',
    previewColor2: '#fef287',
  },
  {
    id: 'volcanicFlow',
    label: 'Volcanic Flow',
    colorMap: 'inferno',
    blend: 0.85,
    noiseWeight: 0.08,
    curvature: 1.8,
    smoothing: 0.3,
    previewColor1: '#420a68',
    previewColor2: '#f98e09',
  },
  {
    id: 'crystalMatrix',
    label: 'Crystal Matrix',
    colorMap: 'viridis',
    blend: 0.25,
    noiseWeight: 0.22,
    curvature: 0.5,
    smoothing: 0.7,
    previewColor1: '#21918c',
    previewColor2: '#3b528b',
  },
  {
    id: 'nebulaDrift',
    label: 'Nebula Drift',
    colorMap: 'plasma',
    blend: 0.65,
    noiseWeight: 0.18,
    curvature: 1.0,
    smoothing: 0.45,
    previewColor1: '#7e03a8',
    previewColor2: '#cc4778',
  },
  {
    id: 'thermalVent',
    label: 'Thermal Vent',
    colorMap: 'magma',
    blend: 0.7,
    noiseWeight: 0.14,
    curvature: 1.5,
    smoothing: 0.35,
    previewColor1: '#b63679',
    previewColor2: '#fb8761',
  },
  {
    id: 'deepSpace',
    label: 'Deep Space',
    colorMap: 'cividis',
    blend: 0.55,
    noiseWeight: 0.06,
    curvature: 0.2,
    smoothing: 0.85,
    previewColor1: '#122f4d',
    previewColor2: '#8c9f85',
  },
  {
    id: 'solarFlare',
    label: 'Solar Flare',
    colorMap: 'inferno',
    blend: 0.95,
    noiseWeight: 0.25,
    curvature: 2.5,
    smoothing: 0.2,
    previewColor1: '#f7d03c',
    previewColor2: '#bc3754',
  },
  {
    id: 'quantumFrost',
    label: 'Quantum Frost',
    colorMap: 'viridis',
    blend: 0.4,
    noiseWeight: 0.03,
    curvature: 0.1,
    smoothing: 0.95,
    previewColor1: '#5ec962',
    previewColor2: '#b5de2b',
  },
];

export function getPresetById(id: string): VisualPreset | undefined {
  return visualPresets.find(p => p.id === id);
}
