import type { SFDEngine } from "./sfd-engine";
import type { StructuralEvent, SimulationParameters } from "@shared/schema";

export interface SFDConfiguration {
  parameters: SimulationParameters;
  regime: string;
  colormap: "inferno" | "viridis" | "cividis";
  mode: string;
  version: string;
  timestamp: string;
}

function getTimestamp(): string {
  return Date.now().toString();
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportPNGSnapshot(canvas: HTMLCanvasElement | null): Promise<boolean> {
  if (!canvas) return false;
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = `sfd-snapshot-${getTimestamp()}.png`;
  a.click();
  return true;
}

export function saveConfiguration(
  parameters: SimulationParameters,
  regime: string,
  colormap: "inferno" | "viridis" | "cividis",
  mode: string
): void {
  const config: SFDConfiguration = {
    parameters,
    regime,
    colormap,
    mode,
    version: "1.0",
    timestamp: new Date().toISOString(),
  };
  const json = JSON.stringify(config, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  downloadBlob(blob, `sfd-config-${getTimestamp()}.json`);
}

export function loadConfiguration(file: File): Promise<SFDConfiguration | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const config = JSON.parse(json) as SFDConfiguration;
        if (config.parameters && config.colormap) {
          resolve(config);
        } else {
          resolve(null);
        }
      } catch {
        resolve(null);
      }
    };
    reader.onerror = () => resolve(null);
    reader.readAsText(file);
  });
}

export async function exportAnimationGIF(
  engine: SFDEngine,
  canvas: HTMLCanvasElement | null,
  colormap: "inferno" | "viridis" | "cividis",
  onProgress?: (progress: number) => void
): Promise<boolean> {
  const frames = engine.getAllFrames();
  if (frames.length === 0 || !canvas) {
    return false;
  }

  const { width, height } = engine.getGridSize();
  
  const colormaps: Record<string, number[][]> = {
    inferno: [[0,0,4],[40,11,84],[101,21,110],[159,42,99],[212,72,66],[245,125,21],[252,192,39],[252,255,164]],
    viridis: [[68,1,84],[72,36,117],[65,68,135],[53,95,141],[42,120,142],[33,144,140],[34,167,132],[68,190,112],[122,209,81],[189,222,38],[253,231,37]],
    cividis: [[0,32,77],[42,67,108],[75,99,130],[107,130,151],[140,160,170],[175,191,186],[212,221,198],[253,252,205]]
  };
  
  const colors = colormaps[colormap] || colormaps.viridis;
  
  function interpolateColor(t: number): [number, number, number] {
    const idx = t * (colors.length - 1);
    const i = Math.floor(idx);
    const f = idx - i;
    const c1 = colors[Math.min(i, colors.length - 1)];
    const c2 = colors[Math.min(i + 1, colors.length - 1)];
    return [
      Math.round(c1[0] + f * (c2[0] - c1[0])),
      Math.round(c1[1] + f * (c2[1] - c1[1])),
      Math.round(c1[2] + f * (c2[2] - c1[2]))
    ];
  }
  
  const offCanvas = document.createElement("canvas");
  offCanvas.width = width;
  offCanvas.height = height;
  const ctx = offCanvas.getContext("2d");
  if (!ctx) return false;
  
  const frameDataUrls: string[] = [];
  
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const imageData = ctx.createImageData(width, height);
    
    let min = Infinity, max = -Infinity;
    for (let j = 0; j < frame.grid.length; j++) {
      min = Math.min(min, frame.grid[j]);
      max = Math.max(max, frame.grid[j]);
    }
    const range = max - min || 1;
    
    for (let j = 0; j < frame.grid.length; j++) {
      const t = (frame.grid[j] - min) / range;
      const [r, g, b] = interpolateColor(t);
      const pixIdx = j * 4;
      imageData.data[pixIdx] = r;
      imageData.data[pixIdx + 1] = g;
      imageData.data[pixIdx + 2] = b;
      imageData.data[pixIdx + 3] = 255;
    }
    
    ctx.putImageData(imageData, 0, 0);
    frameDataUrls.push(offCanvas.toDataURL("image/png"));
    
    if (onProgress) {
      onProgress((i + 1) / frames.length * 0.5);
    }
  }
  
  const gifData = await createSimpleGIF(frameDataUrls, width, height, 100, colormap, onProgress);
  
  const blob = new Blob([gifData], { type: "image/gif" });
  downloadBlob(blob, `sfd-animation-${getTimestamp()}.gif`);
  
  return true;
}

async function createSimpleGIF(
  frames: string[],
  width: number,
  height: number,
  delay: number,
  colormap: "inferno" | "viridis" | "cividis",
  onProgress?: (progress: number) => void
): Promise<Uint8Array> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  
  const colormaps: Record<string, number[][]> = {
    inferno: [[0,0,4],[40,11,84],[101,21,110],[159,42,99],[212,72,66],[245,125,21],[252,192,39],[252,255,164]],
    viridis: [[68,1,84],[72,36,117],[65,68,135],[53,95,141],[42,120,142],[33,144,140],[34,167,132],[68,190,112],[122,209,81],[189,222,38],[253,231,37]],
    cividis: [[0,32,77],[42,67,108],[75,99,130],[107,130,151],[140,160,170],[175,191,186],[212,221,198],[253,252,205]]
  };
  
  const colors = colormaps[colormap] || colormaps.viridis;
  
  function interpolateColor(t: number): [number, number, number] {
    const idx = t * (colors.length - 1);
    const i = Math.floor(idx);
    const f = idx - i;
    const c1 = colors[Math.min(i, colors.length - 1)];
    const c2 = colors[Math.min(i + 1, colors.length - 1)];
    return [
      Math.round(c1[0] + f * (c2[0] - c1[0])),
      Math.round(c1[1] + f * (c2[1] - c1[1])),
      Math.round(c1[2] + f * (c2[2] - c1[2]))
    ];
  }
  
  const palette: number[][] = [];
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    palette.push(interpolateColor(t));
  }
  
  const gifBytes: number[] = [];
  
  gifBytes.push(0x47, 0x49, 0x46, 0x38, 0x39, 0x61);
  
  gifBytes.push(width & 0xFF, (width >> 8) & 0xFF);
  gifBytes.push(height & 0xFF, (height >> 8) & 0xFF);
  gifBytes.push(0xF7, 0x00, 0x00);
  
  for (let i = 0; i < 256; i++) {
    gifBytes.push(palette[i][0], palette[i][1], palette[i][2]);
  }
  
  gifBytes.push(0x21, 0xFF, 0x0B);
  const netscape = "NETSCAPE2.0";
  for (let i = 0; i < netscape.length; i++) {
    gifBytes.push(netscape.charCodeAt(i));
  }
  gifBytes.push(0x03, 0x01, 0x00, 0x00, 0x00);
  
  for (let f = 0; f < frames.length; f++) {
    const img = new Image();
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.src = frames[f];
    });
    
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, width, height);
    
    gifBytes.push(0x21, 0xF9, 0x04, 0x04);
    gifBytes.push((delay / 10) & 0xFF, ((delay / 10) >> 8) & 0xFF);
    gifBytes.push(0x00, 0x00);
    
    gifBytes.push(0x2C);
    gifBytes.push(0x00, 0x00, 0x00, 0x00);
    gifBytes.push(width & 0xFF, (width >> 8) & 0xFF);
    gifBytes.push(height & 0xFF, (height >> 8) & 0xFF);
    gifBytes.push(0x00);
    
    gifBytes.push(0x08);
    
    const paletteIndices: number[] = [];
    for (let i = 0; i < imageData.data.length; i += 4) {
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let j = 0; j < 256; j++) {
        const dr = r - palette[j][0];
        const dg = g - palette[j][1];
        const db = b - palette[j][2];
        const dist = dr * dr + dg * dg + db * db;
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = j;
        }
      }
      paletteIndices.push(bestIdx);
    }
    
    const lzwData = lzwEncode(paletteIndices, 8);
    let offset = 0;
    while (offset < lzwData.length) {
      const chunkSize = Math.min(255, lzwData.length - offset);
      gifBytes.push(chunkSize);
      for (let i = 0; i < chunkSize; i++) {
        gifBytes.push(lzwData[offset + i]);
      }
      offset += chunkSize;
    }
    gifBytes.push(0x00);
    
    if (onProgress) {
      onProgress(0.5 + (f + 1) / frames.length * 0.5);
    }
  }
  
  gifBytes.push(0x3B);
  
  return new Uint8Array(gifBytes);
}

function lzwEncode(pixels: number[], minCodeSize: number): number[] {
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  
  const output: number[] = [];
  let codeSize = minCodeSize + 1;
  let nextCode = eoiCode + 1;
  const codeLimit = 4096;
  
  const dictionary = new Map<string, number>();
  for (let i = 0; i < clearCode; i++) {
    dictionary.set(String(i), i);
  }
  
  let bitBuffer = 0;
  let bitCount = 0;
  
  function writeCode(code: number) {
    bitBuffer |= code << bitCount;
    bitCount += codeSize;
    while (bitCount >= 8) {
      output.push(bitBuffer & 0xFF);
      bitBuffer >>= 8;
      bitCount -= 8;
    }
  }
  
  if (pixels.length === 0) {
    writeCode(clearCode);
    writeCode(eoiCode);
    if (bitCount > 0) {
      output.push(bitBuffer & 0xFF);
    }
    return output;
  }
  
  writeCode(clearCode);
  
  let current = String(pixels[0]);
  for (let i = 1; i < pixels.length; i++) {
    const pixel = pixels[i];
    const next = current + "," + pixel;
    if (dictionary.has(next)) {
      current = next;
    } else {
      writeCode(dictionary.get(current)!);
      if (nextCode < codeLimit) {
        dictionary.set(next, nextCode++);
        if (nextCode > (1 << codeSize) && codeSize < 12) {
          codeSize++;
        }
      }
      current = String(pixel);
    }
  }
  
  writeCode(dictionary.get(current)!);
  writeCode(eoiCode);
  
  if (bitCount > 0) {
    output.push(bitBuffer & 0xFF);
  }
  
  return output;
}

export async function exportSimulationData(engine: SFDEngine): Promise<boolean> {
  const frames = engine.getAllFrames();
  const { width, height } = engine.getGridSize();
  
  if (frames.length === 0) {
    return false;
  }
  
  if (frames.length === 1) {
    const frame = frames[0];
    const rows: string[] = [];
    
    for (let y = 0; y < height; y++) {
      const row: string[] = [];
      for (let x = 0; x < width; x++) {
        row.push(frame.grid[y * width + x].toFixed(6));
      }
      rows.push(row.join(","));
    }
    
    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    downloadBlob(blob, `sfd-simulation-data-${getTimestamp()}.csv`);
  } else {
    const files: { name: string; data: string }[] = [];
    
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const rows: string[] = [];
      
      for (let y = 0; y < height; y++) {
        const row: string[] = [];
        for (let x = 0; x < width; x++) {
          row.push(frame.grid[y * width + x].toFixed(6));
        }
        rows.push(row.join(","));
      }
      
      files.push({ name: `frame_${i.toString().padStart(4, "0")}.csv`, data: rows.join("\n") });
    }
    
    files.push({
      name: "metadata.json",
      data: JSON.stringify({
        width,
        height,
        frameCount: frames.length,
        exportedAt: new Date().toISOString()
      }, null, 2)
    });
    
    const combined = files.map(f => `=== ${f.name} ===\n${f.data}`).join("\n\n");
    const blob = new Blob([combined], { type: "text/plain" });
    downloadBlob(blob, `sfd-simulation-data-${getTimestamp()}.txt`);
  }
  
  return true;
}

export async function exportMetricsLog(engine: SFDEngine): Promise<boolean> {
  const metrics = engine.getMetricsHistory();
  
  if (metrics.length === 0) {
    return false;
  }
  
  const headers = ["Step", "FPS", "Structural Basins", "Depth", "Curvature", "Tension Variance", "Stability", "Field Energy", "Local Variance", "Timestamp"];
  const rows = [headers.join(",")];
  
  for (const m of metrics) {
    rows.push([
      m.step,
      m.fps.toFixed(1),
      m.basinCount,
      m.depth.toFixed(6),
      m.curvature.toFixed(6),
      m.tensionVariance.toFixed(6),
      m.stability.toFixed(4),
      m.energy.toFixed(6),
      m.variance.toFixed(6),
      m.timestamp
    ].join(","));
  }
  
  const csv = rows.join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  downloadBlob(blob, `sfd-metrics-${getTimestamp()}.csv`);
  
  return true;
}

export async function exportStateSnapshot(engine: SFDEngine): Promise<boolean> {
  const snapshot = engine.getCurrentFieldSnapshot();
  const json = JSON.stringify(snapshot, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  downloadBlob(blob, `sfd-state-${getTimestamp()}.json`);
  return true;
}

export async function exportSettingsJSON(engine: SFDEngine): Promise<boolean> {
  const json = engine.exportSettings() || "{}";
  const blob = new Blob([json], { type: "application/json" });
  downloadBlob(blob, `sfd-settings-${getTimestamp()}.json`);
  return true;
}

export async function exportEventLog(events: StructuralEvent[]): Promise<boolean> {
  const lines = events.map(e => `t=${e.step} | ${e.description}`);
  const text = lines.join("\n");
  const blob = new Blob([text], { type: "text/plain" });
  downloadBlob(blob, `sfd-events-${getTimestamp()}.log`);
  return true;
}

// ============================================================================
// NEW RESEARCH-GRADE EXPORT FUNCTIONS
// ============================================================================

/**
 * Export current frame as NumPy-compatible .npy file
 * NumPy format: magic string + header + raw float32 data
 */
export async function exportNumPyArray(engine: SFDEngine): Promise<boolean> {
  const { width, height } = engine.getGridSize();
  const frames = engine.getAllFrames();
  if (frames.length === 0) return false;
  
  const currentFrame = frames[frames.length - 1];
  const grid = currentFrame.grid;
  
  // Build NumPy .npy file format
  const npyData = createNpyFile(grid, [height, width]);
  const blob = new Blob([npyData], { type: "application/octet-stream" });
  downloadBlob(blob, `sfd-field-${getTimestamp()}.npy`);
  return true;
}

/**
 * Create a NumPy .npy file from Float32Array
 */
function createNpyFile(data: Float32Array, shape: number[]): ArrayBuffer {
  // NumPy magic number and version
  const magic = new Uint8Array([0x93, 0x4E, 0x55, 0x4D, 0x50, 0x59]); // \x93NUMPY
  const version = new Uint8Array([0x01, 0x00]); // Version 1.0
  
  // Create header dict
  const shapeStr = `(${shape.join(", ")},)`;
  const header = `{'descr': '<f4', 'fortran_order': False, 'shape': ${shapeStr}, }`;
  
  // Pad header to 64-byte alignment (header length + 10 for magic+version+headerlen)
  const headerLen = header.length;
  const paddingNeeded = 64 - ((10 + headerLen) % 64);
  const paddedHeader = header + " ".repeat(paddingNeeded - 1) + "\n";
  
  const headerLenBytes = new Uint8Array(2);
  headerLenBytes[0] = paddedHeader.length & 0xFF;
  headerLenBytes[1] = (paddedHeader.length >> 8) & 0xFF;
  
  // Combine all parts
  const headerBytes = new TextEncoder().encode(paddedHeader);
  const totalLen = magic.length + version.length + headerLenBytes.length + headerBytes.length + data.byteLength;
  const result = new ArrayBuffer(totalLen);
  const view = new Uint8Array(result);
  
  let offset = 0;
  view.set(magic, offset); offset += magic.length;
  view.set(version, offset); offset += version.length;
  view.set(headerLenBytes, offset); offset += headerLenBytes.length;
  view.set(headerBytes, offset); offset += headerBytes.length;
  view.set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength), offset);
  
  return result;
}

/**
 * Export minimal batch spec JSON for automated testing
 */
export async function exportBatchSpec(engine: SFDEngine): Promise<boolean> {
  const params = engine.getParams();
  const state = engine.getState();
  
  const spec = {
    params: {
      gridSize: params.gridSize,
      dt: params.dt,
      curvatureGain: params.curvatureGain,
      couplingRadius: params.couplingRadius,
      couplingWeight: params.couplingWeight,
      attractorStrength: params.attractorStrength,
      redistributionRate: params.redistributionRate,
      wK: params.wK,
      wT: params.wT,
      wC: params.wC,
      wA: params.wA,
      wR: params.wR
    },
    steps: state.step,
    seed: Date.now(),
    gridSize: engine.getGridSize(),
    timestamp: new Date().toISOString()
  };
  
  const json = JSON.stringify(spec, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  downloadBlob(blob, `sfd-batch-spec-${getTimestamp()}.json`);
  return true;
}

/**
 * Export operator contributions as CSV (current snapshot)
 */
export async function exportOperatorContributions(engine: SFDEngine): Promise<boolean> {
  const current = engine.getOperatorContributions();
  const headers = ["curvature", "tension", "coupling", "redistribution", "attractor"];
  const row = [
    current.curvature.toFixed(6),
    current.tension.toFixed(6),
    current.coupling.toFixed(6),
    current.redistribution.toFixed(6),
    current.attractor.toFixed(6)
  ];
  const csv = headers.join(",") + "\n" + row.join(",");
  const blob = new Blob([csv], { type: "text/csv" });
  downloadBlob(blob, `sfd-operators-${getTimestamp()}.csv`);
  return true;
}

/**
 * Generate Python reconstruction script
 */
export async function exportPythonScript(engine: SFDEngine): Promise<boolean> {
  const { width, height } = engine.getGridSize();
  const params = engine.getParams();
  
  const script = `#!/usr/bin/env python3
"""
SFD Engine Reconstruction Script
Generated: ${new Date().toISOString()}

This script loads exported field data and recreates the visualization.
Requires: numpy, matplotlib

Usage:
  python reconstruct_simulation.py

Place your exported .npy files in the same directory.
"""

import numpy as np
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap
import glob
import os

# Simulation parameters used
PARAMS = {
    "gridSize": ${params.gridSize},
    "dt": ${params.dt},
    "curvatureGain": ${params.curvatureGain},
    "couplingRadius": ${params.couplingRadius},
    "couplingWeight": ${params.couplingWeight},
    "attractorStrength": ${params.attractorStrength},
    "redistributionRate": ${params.redistributionRate},
    "wK": ${params.wK},
    "wT": ${params.wT},
    "wC": ${params.wC},
    "wA": ${params.wA},
    "wR": ${params.wR}
}

GRID_SIZE = (${height}, ${width})

# Viridis-like colormap
VIRIDIS_COLORS = [
    (0.267, 0.004, 0.329),
    (0.282, 0.140, 0.458),
    (0.254, 0.265, 0.529),
    (0.207, 0.372, 0.553),
    (0.164, 0.471, 0.557),
    (0.128, 0.565, 0.551),
    (0.133, 0.658, 0.518),
    (0.267, 0.749, 0.441),
    (0.478, 0.821, 0.318),
    (0.741, 0.873, 0.150),
    (0.993, 0.906, 0.144)
]

def create_colormap():
    """Create viridis-like colormap."""
    return LinearSegmentedColormap.from_list("sfd_viridis", VIRIDIS_COLORS)

def load_field(filepath):
    """Load a field from .npy file."""
    return np.load(filepath)

def compute_metrics(field):
    """Compute basic field metrics."""
    return {
        "mean": np.mean(field),
        "std": np.std(field),
        "min": np.min(field),
        "max": np.max(field),
        "energy": np.sum(field ** 2),
        "variance": np.var(field)
    }

def plot_field(field, title="SFD Field", save_path=None):
    """Plot a single field frame."""
    fig, ax = plt.subplots(figsize=(10, 10))
    cmap = create_colormap()
    im = ax.imshow(field, cmap=cmap, origin='lower')
    ax.set_title(title, fontsize=14)
    ax.axis('off')
    plt.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
    
    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
        print(f"Saved: {save_path}")
    else:
        plt.show()
    plt.close()

def animate_frames(frames, output_path="animation.mp4", fps=30):
    """Animate multiple frames (requires ffmpeg)."""
    from matplotlib.animation import FuncAnimation, FFMpegWriter
    
    fig, ax = plt.subplots(figsize=(10, 10))
    cmap = create_colormap()
    
    vmin = min(np.min(f) for f in frames)
    vmax = max(np.max(f) for f in frames)
    
    im = ax.imshow(frames[0], cmap=cmap, vmin=vmin, vmax=vmax, origin='lower')
    ax.axis('off')
    
    def update(frame_idx):
        im.set_array(frames[frame_idx])
        return [im]
    
    anim = FuncAnimation(fig, update, frames=len(frames), interval=1000/fps, blit=True)
    
    try:
        writer = FFMpegWriter(fps=fps, bitrate=2000)
        anim.save(output_path, writer=writer)
        print(f"Animation saved: {output_path}")
    except Exception as e:
        print(f"Could not save animation (ffmpeg required): {e}")
        plt.show()
    
    plt.close()

def main():
    print("SFD Engine Reconstruction Script")
    print("=" * 40)
    print(f"Grid size: {GRID_SIZE}")
    print(f"Parameters: {PARAMS}")
    print()
    
    # Find .npy files
    npy_files = sorted(glob.glob("*.npy"))
    
    if not npy_files:
        print("No .npy files found in current directory.")
        print("Export field data from SFD Engine first.")
        return
    
    print(f"Found {len(npy_files)} .npy file(s)")
    
    # Load and process
    frames = []
    for f in npy_files:
        field = load_field(f)
        frames.append(field)
        metrics = compute_metrics(field)
        print(f"  {f}: shape={field.shape}, mean={metrics['mean']:.4f}, std={metrics['std']:.4f}")
    
    # Plot first frame
    if frames:
        plot_field(frames[0], title=f"SFD Field (Frame 1/{len(frames)})")
    
    # Animate if multiple frames
    if len(frames) > 1:
        print("\\nMultiple frames detected. Creating animation...")
        animate_frames(frames)

if __name__ == "__main__":
    main()
`;
  
  const blob = new Blob([script], { type: "text/x-python" });
  downloadBlob(blob, `sfd-reconstruct-${getTimestamp()}.py`);
  return true;
}

/**
 * Export layer-separated data (curvature, tension, coupling, attractor)
 */
export async function exportLayersSeparate(
  engine: SFDEngine,
  format: "png" | "npz" = "npz"
): Promise<boolean> {
  const { width, height } = engine.getGridSize();
  const frames = engine.getAllFrames();
  if (frames.length === 0) return false;
  
  const currentFrame = frames[frames.length - 1];
  const grid = currentFrame.grid;
  
  // Compute derived fields
  const curvatureField = new Float32Array(width * height);
  const tensionField = new Float32Array(width * height);
  const gradientField = new Float32Array(width * height);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const c = grid[idx];
      const l = grid[idx - 1];
      const r = grid[idx + 1];
      const u = grid[idx - width];
      const d = grid[idx + width];
      
      // Laplacian (curvature proxy)
      curvatureField[idx] = l + r + u + d - 4 * c;
      
      // Gradient magnitude (tension proxy)
      const gx = (r - l) / 2;
      const gy = (d - u) / 2;
      gradientField[idx] = Math.sqrt(gx * gx + gy * gy);
      
      // Tension (second derivative of gradient)
      tensionField[idx] = Math.abs(curvatureField[idx]) * gradientField[idx];
    }
  }
  
  if (format === "npz") {
    // Create combined NPZ-like bundle (multiple .npy files in a structure)
    const layers = {
      primary: grid,
      curvature: curvatureField,
      gradient: gradientField,
      tension: tensionField
    };
    
    // Export as JSON with base64-encoded arrays (simpler than true NPZ)
    const bundle = {
      format: "sfd-layers-v1",
      width,
      height,
      layers: {
        primary: Array.from(grid),
        curvature: Array.from(curvatureField),
        gradient: Array.from(gradientField),
        tension: Array.from(tensionField)
      },
      timestamp: new Date().toISOString()
    };
    
    const json = JSON.stringify(bundle);
    const blob = new Blob([json], { type: "application/json" });
    downloadBlob(blob, `sfd-layers-${getTimestamp()}.json`);
  } else {
    // Export as separate PNG files
    const exportLayerAsPNG = async (data: Float32Array, name: string) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      const imageData = ctx.createImageData(width, height);
      
      let min = Infinity, max = -Infinity;
      for (let i = 0; i < data.length; i++) {
        min = Math.min(min, data[i]);
        max = Math.max(max, data[i]);
      }
      const range = max - min || 1;
      
      for (let i = 0; i < data.length; i++) {
        const t = (data[i] - min) / range;
        const v = Math.floor(t * 255);
        const pi = i * 4;
        imageData.data[pi] = v;
        imageData.data[pi + 1] = v;
        imageData.data[pi + 2] = v;
        imageData.data[pi + 3] = 255;
      }
      
      ctx.putImageData(imageData, 0, 0);
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `sfd-layer-${name}-${getTimestamp()}.png`;
      a.click();
    };
    
    await exportLayerAsPNG(grid, "primary");
    await exportLayerAsPNG(curvatureField, "curvature");
    await exportLayerAsPNG(gradientField, "gradient");
    await exportLayerAsPNG(tensionField, "tension");
  }
  
  return true;
}

/**
 * Export full data archive as a downloadable bundle
 * Contains: field data, operators, metrics, events, config, readme
 */
export async function exportFullArchive(
  engine: SFDEngine,
  events: StructuralEvent[],
  colormap: "inferno" | "viridis" | "cividis"
): Promise<boolean> {
  const { width, height } = engine.getGridSize();
  const frames = engine.getAllFrames();
  const params = engine.getParams();
  const state = engine.getState();
  const metrics = engine.getMetricsHistory();
  const operators = engine.getOperatorContributions();
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const generatedAt = new Date().toISOString();
  
  // Build readme as a regular string
  const readme = [
    "SFD Engine Data Archive",
    "========================",
    "Generated: " + generatedAt,
    "",
    "This archive contains all data needed to reconstruct or analyze the simulation.",
    "",
    "Contents:",
    "- metadata: Grid dimensions, frame count, settings",
    "- config: All simulation parameters",
    "- currentOperators: Latest operator contributions",
    "- events: Structural event log",
    "- metricsTimeSeries: Recent metrics history",
    "- currentField: Current field state (grid array + statistics)",
    "",
    "To load in Python:",
    "  import json",
    "  with open('archive.json') as f:",
    "      data = json.load(f)",
    "  import numpy as np",
    "  grid = np.array(data['currentField']['grid']).reshape(data['metadata']['height'], data['metadata']['width'])",
    "",
    "For full NumPy arrays, use the separate .npy export option."
  ].join("\n");
  
  // Build archive contents as a single JSON bundle
  const archive = {
    format: "sfd-archive-v1",
    created: generatedAt,
    metadata: {
      width,
      height,
      frameCount: frames.length,
      stepCount: state.step,
      colormap
    },
    config: {
      gridSize: params.gridSize,
      dt: params.dt,
      curvatureGain: params.curvatureGain,
      couplingRadius: params.couplingRadius,
      couplingWeight: params.couplingWeight,
      attractorStrength: params.attractorStrength,
      redistributionRate: params.redistributionRate,
      wK: params.wK,
      wT: params.wT,
      wC: params.wC,
      wA: params.wA,
      wR: params.wR
    },
    currentOperators: operators,
    events: events.map(e => ({
      step: e.step,
      type: e.type,
      description: e.description
    })),
    metricsTimeSeries: metrics.slice(-100).map(m => ({
      step: m.step,
      energy: m.energy,
      variance: m.variance,
      basinCount: m.basinCount,
      curvature: m.curvature,
      stability: m.stability
    })),
    currentField: {
      grid: Array.from(frames.length > 0 ? frames[frames.length - 1].grid : new Float32Array(0)),
      stats: frames.length > 0 ? frames[frames.length - 1].stats : null
    },
    readme
  };
  
  const json = JSON.stringify(archive, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  downloadBlob(blob, `sfd-archive-${timestamp}.json`);
  return true;
}

/**
 * Export simulation as WebM video (uses MediaRecorder API)
 */
export async function exportVideoWebM(
  engine: SFDEngine,
  canvas: HTMLCanvasElement | null,
  colormap: "inferno" | "viridis" | "cividis",
  fps: number = 30,
  onProgress?: (progress: number) => void
): Promise<boolean> {
  const frames = engine.getAllFrames();
  if (frames.length === 0 || !canvas) return false;
  
  const { width, height } = engine.getGridSize();
  
  // Create offscreen canvas for rendering
  const offCanvas = document.createElement("canvas");
  offCanvas.width = width;
  offCanvas.height = height;
  const ctx = offCanvas.getContext("2d");
  if (!ctx) return false;
  
  const colormaps: Record<string, number[][]> = {
    inferno: [[0,0,4],[40,11,84],[101,21,110],[159,42,99],[212,72,66],[245,125,21],[252,192,39],[252,255,164]],
    viridis: [[68,1,84],[72,36,117],[65,68,135],[53,95,141],[42,120,142],[33,144,140],[34,167,132],[68,190,112],[122,209,81],[189,222,38],[253,231,37]],
    cividis: [[0,32,77],[42,67,108],[75,99,130],[107,130,151],[140,160,170],[175,191,186],[212,221,198],[253,252,205]]
  };
  
  const colors = colormaps[colormap] || colormaps.viridis;
  
  function interpolateColor(t: number): [number, number, number] {
    const idx = t * (colors.length - 1);
    const i = Math.floor(idx);
    const f = idx - i;
    const c1 = colors[Math.min(i, colors.length - 1)];
    const c2 = colors[Math.min(i + 1, colors.length - 1)];
    return [
      Math.round(c1[0] + f * (c2[0] - c1[0])),
      Math.round(c1[1] + f * (c2[1] - c1[1])),
      Math.round(c1[2] + f * (c2[2] - c1[2]))
    ];
  }
  
  // Check for MediaRecorder support
  if (typeof MediaRecorder === "undefined") {
    console.error("MediaRecorder not supported");
    return false;
  }
  
  // Use captureStream for video recording
  const stream = offCanvas.captureStream(fps);
  const chunks: Blob[] = [];
  
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: "video/webm;codecs=vp9",
    videoBitsPerSecond: 5000000
  });
  
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) {
      chunks.push(e.data);
    }
  };
  
  return new Promise((resolve) => {
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      downloadBlob(blob, `sfd-video-${getTimestamp()}.webm`);
      resolve(true);
    };
    
    mediaRecorder.start();
    
    let frameIndex = 0;
    const frameDuration = 1000 / fps;
    
    const renderNextFrame = () => {
      if (frameIndex >= frames.length) {
        mediaRecorder.stop();
        return;
      }
      
      const frame = frames[frameIndex];
      const imageData = ctx.createImageData(width, height);
      
      let min = Infinity, max = -Infinity;
      for (let j = 0; j < frame.grid.length; j++) {
        min = Math.min(min, frame.grid[j]);
        max = Math.max(max, frame.grid[j]);
      }
      const range = max - min || 1;
      
      for (let j = 0; j < frame.grid.length; j++) {
        const t = (frame.grid[j] - min) / range;
        const [r, g, b] = interpolateColor(t);
        const pixIdx = j * 4;
        imageData.data[pixIdx] = r;
        imageData.data[pixIdx + 1] = g;
        imageData.data[pixIdx + 2] = b;
        imageData.data[pixIdx + 3] = 255;
      }
      
      ctx.putImageData(imageData, 0, 0);
      
      if (onProgress) {
        onProgress((frameIndex + 1) / frames.length);
      }
      
      frameIndex++;
      setTimeout(renderNextFrame, frameDuration);
    };
    
    renderNextFrame();
  });
}
