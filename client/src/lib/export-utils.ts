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
