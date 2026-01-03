export interface VisualPreset {
  id: string;
  label: string;
  colorMap: 'viridis' | 'inferno' | 'cividis';
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
    id: 'calmWaters',
    label: 'Calm Waters',
    colorMap: 'viridis',
    blend: 0.6,
    noiseWeight: 0.02,
    curvature: 0.15,
    smoothing: 0.9,
    previewColor1: '#31688e',
    previewColor2: '#35b779',
  },
  {
    id: 'goldenHaze',
    label: 'Golden Haze',
    colorMap: 'cividis',
    blend: 0.7,
    noiseWeight: 0.08,
    curvature: 0.6,
    smoothing: 0.65,
    previewColor1: '#1e3d59',
    previewColor2: '#d4bc6a',
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
    id: 'neonPulse',
    label: 'Neon Pulse',
    colorMap: 'viridis',
    blend: 0.85,
    noiseWeight: 0.2,
    curvature: 1.8,
    smoothing: 0.25,
    previewColor1: '#482878',
    previewColor2: '#73d055',
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
    id: 'twilightZone',
    label: 'Twilight Zone',
    colorMap: 'viridis',
    blend: 0.65,
    noiseWeight: 0.18,
    curvature: 1.0,
    smoothing: 0.45,
    previewColor1: '#440154',
    previewColor2: '#21918c',
  },
  {
    id: 'staticField',
    label: 'Static Field',
    colorMap: 'cividis',
    blend: 0.3,
    noiseWeight: 0.25,
    curvature: 2.2,
    smoothing: 0.15,
    previewColor1: '#5c7a64',
    previewColor2: '#e8d964',
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
    id: 'emberGlow',
    label: 'Ember Glow',
    colorMap: 'inferno',
    blend: 0.6,
    noiseWeight: 0.1,
    curvature: 0.8,
    smoothing: 0.5,
    previewColor1: '#932667',
    previewColor2: '#fca636',
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
