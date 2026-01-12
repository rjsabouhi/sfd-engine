import { useRef, useEffect, useCallback, useState } from "react";
import type { FieldData, BasinMap, DerivedField, SavedProbe } from "@shared/schema";

export interface CanvasTransform {
  zoom: number;
  panX: number;
  panY: number;
}

interface VisualizationCanvasProps {
  field: FieldData | null;
  colormap?: "inferno" | "viridis" | "cividis";
  basinMap?: BasinMap | null;
  showBasins?: boolean;
  onHover?: (x: number, y: number, screenX: number, screenY: number) => void;
  onHoverEnd?: () => void;
  onClick?: (x: number, y: number, shiftKey: boolean) => void;
  perturbMode?: boolean;
  trajectoryProbePoint?: { x: number; y: number } | null;
  perceptualSmoothing?: boolean;
  onTransformChange?: (transform: CanvasTransform) => void;
  disableTouch?: boolean;
  // Overlay layer props - rendered inside same container for perfect alignment
  overlayDerivedField?: DerivedField | null;
  overlayBasinMap?: BasinMap | null;
  overlayOpacity?: number;
  // Saved probe markers
  savedProbes?: SavedProbe[];
  showProbeMarkers?: boolean;
  // Inspector mode - clicks add probes instead of perturbing
  inspectorMode?: boolean;
  onAddProbe?: (x: number, y: number) => void;
}

// Temporal smoothing buffer for perceptual safety
let lastFrameBuffer: Float32Array | null = null;
let lastFrameEnergy: number = 0;

// Export function to clear the temporal buffer (called on reset)
export function clearTemporalBuffer(): void {
  lastFrameBuffer = null;
  lastFrameEnergy = 0;
}

const INFERNO_COLORS = [
  [0, 0, 4],
  [40, 11, 84],
  [101, 21, 110],
  [159, 42, 99],
  [212, 72, 66],
  [245, 125, 21],
  [250, 193, 39],
  [252, 255, 164],
];

const VIRIDIS_COLORS = [
  [68, 1, 84],
  [72, 40, 120],
  [62, 73, 137],
  [49, 104, 142],
  [38, 130, 142],
  [31, 158, 137],
  [53, 183, 121],
  [109, 205, 89],
  [180, 222, 44],
  [253, 231, 37],
];

// Cividis - colorblind-friendly palette (optimized for deuteranopia/protanopia)
const CIVIDIS_COLORS = [
  [0, 32, 77],
  [0, 67, 106],
  [54, 92, 108],
  [94, 114, 110],
  [131, 135, 114],
  [168, 157, 117],
  [207, 181, 118],
  [244, 210, 118],
  [253, 234, 118],
];

const BASIN_COLORS = [
  [255, 99, 132],
  [54, 162, 235],
  [255, 206, 86],
  [75, 192, 192],
  [153, 102, 255],
  [255, 159, 64],
  [199, 199, 199],
  [83, 102, 255],
  [255, 99, 255],
  [99, 255, 132],
];

// Plasma colormap for derived field overlays
const PLASMA_COLORS = [
  [13, 8, 135],
  [75, 3, 161],
  [126, 3, 168],
  [168, 34, 150],
  [204, 71, 120],
  [232, 107, 87],
  [250, 149, 62],
  [253, 195, 56],
  [240, 249, 33],
];

function interpolateColor(t: number, colormap: typeof INFERNO_COLORS): [number, number, number] {
  t = Math.max(0, Math.min(1, t));
  const idx = t * (colormap.length - 1);
  const i = Math.floor(idx);
  const f = idx - i;
  
  if (i >= colormap.length - 1) {
    return colormap[colormap.length - 1] as [number, number, number];
  }
  
  const c1 = colormap[i];
  const c2 = colormap[i + 1];
  
  return [
    Math.round(c1[0] + f * (c2[0] - c1[0])),
    Math.round(c1[1] + f * (c2[1] - c1[1])),
    Math.round(c1[2] + f * (c2[2] - c1[2])),
  ];
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 10;

// Colormap transition state
interface ColormapTransition {
  fromColormap: "inferno" | "viridis" | "cividis";
  toColormap: "inferno" | "viridis" | "cividis";
  startTime: number;
  duration: number;
}

function getColormapColors(cm: "inferno" | "viridis" | "cividis") {
  return cm === "cividis" ? CIVIDIS_COLORS : cm === "inferno" ? INFERNO_COLORS : VIRIDIS_COLORS;
}

export function VisualizationCanvas({ 
  field, 
  colormap = "inferno", 
  basinMap,
  showBasins = false,
  onHover,
  onHoverEnd,
  onClick,
  perturbMode = false,
  trajectoryProbePoint,
  perceptualSmoothing = false,
  onTransformChange,
  disableTouch = false,
  overlayDerivedField,
  overlayBasinMap,
  overlayOpacity = 0,
  savedProbes = [],
  showProbeMarkers = true,
  inspectorMode = false,
  onAddProbe,
}: VisualizationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState(0);
  
  const lastTouchDistRef = useRef<number | null>(null);
  const lastTouchCenterRef = useRef<{ x: number; y: number } | null>(null);
  
  // Colormap transition state
  const colormapTransitionRef = useRef<ColormapTransition | null>(null);
  const prevColormapRef = useRef<"inferno" | "viridis" | "cividis">(colormap);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Detect colormap changes and start transition
  useEffect(() => {
    if (colormap !== prevColormapRef.current) {
      colormapTransitionRef.current = {
        fromColormap: prevColormapRef.current,
        toColormap: colormap,
        startTime: performance.now(),
        duration: 350, // 350ms transition
      };
      prevColormapRef.current = colormap;
      setIsTransitioning(true);
      
      // Schedule end of transition
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        colormapTransitionRef.current = null;
      }, 350);
      
      return () => clearTimeout(timer);
    }
  }, [colormap]);
  
  // Force re-render during transition using requestAnimationFrame
  const [transitionTick, setTransitionTick] = useState(0);
  
  useEffect(() => {
    if (!isTransitioning) return;
    
    let animationId: number;
    const animate = () => {
      // Force a re-render by incrementing state
      if (colormapTransitionRef.current) {
        const elapsed = performance.now() - colormapTransitionRef.current.startTime;
        if (elapsed < colormapTransitionRef.current.duration) {
          setTransitionTick(t => t + 1);
          animationId = requestAnimationFrame(animate);
        }
      }
    };
    animationId = requestAnimationFrame(animate);
    
    return () => cancelAnimationFrame(animationId);
  }, [isTransitioning]);

  const render = useCallback(() => {
    try {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container || !field) return;
      
      // Guard against zero dimensions during resizing
      if (field.width <= 0 || field.height <= 0) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const size = Math.min(containerWidth, containerHeight);
    
    // Guard against zero container size during resizing
    if (size <= 0) return;
    
    setCanvasSize(size);
    
    // High-DPI scaling: render at display resolution for crisp visuals
    const dpr = Math.min(window.devicePixelRatio || 1, 3); // Cap at 3x for performance
    const renderSize = Math.floor(size * dpr);
    
    // Guard against zero render size
    if (renderSize <= 0) return;
    
    canvas.width = renderSize;
    canvas.height = renderSize;
    // Explicitly set CSS size to match logical size for proper DPI scaling
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    
    // Create imageData at grid resolution, then scale up
    const imageData = ctx.createImageData(field.width, field.height);
    const data = imageData.data;
    
    // Check if we're in a colormap transition
    const transition = colormapTransitionRef.current;
    let transitionProgress = 1; // 1 = fully transitioned to new colormap
    let fromColors = getColormapColors(colormap);
    let toColors = getColormapColors(colormap);
    
    if (transition) {
      const elapsed = performance.now() - transition.startTime;
      transitionProgress = Math.min(elapsed / transition.duration, 1);
      
      if (transitionProgress >= 1) {
        // Transition complete, clear it
        colormapTransitionRef.current = null;
      } else {
        fromColors = getColormapColors(transition.fromColormap);
        toColors = getColormapColors(transition.toColormap);
      }
    }
    
    const colors = toColors; // For non-transition rendering

    // Apply temporal smoothing if enabled (Perceptual Safety Layer)
    let displayGrid = field.grid;
    if (perceptualSmoothing) {
      // Compute current frame energy to detect resets
      let currentEnergy = 0;
      for (let i = 0; i < field.grid.length; i++) {
        currentEnergy += field.grid[i] * field.grid[i];
      }
      
      // Detect dramatic energy change (reset) - clear buffer if energy changed by >50%
      const energyRatio = lastFrameEnergy > 0 ? Math.abs(currentEnergy - lastFrameEnergy) / lastFrameEnergy : 0;
      const isReset = energyRatio > 0.5 || !lastFrameBuffer || lastFrameBuffer.length !== field.grid.length;
      
      if (isReset) {
        lastFrameBuffer = new Float32Array(field.grid);
        lastFrameEnergy = currentEnergy;
      } else if (lastFrameBuffer) {
        const alpha = 0.7; // 70% current, 30% previous
        const smoothed = new Float32Array(field.grid.length);
        for (let i = 0; i < field.grid.length; i++) {
          smoothed[i] = alpha * field.grid[i] + (1 - alpha) * lastFrameBuffer[i];
        }
        lastFrameBuffer = smoothed;
        lastFrameEnergy = currentEnergy;
        displayGrid = smoothed;
      }
    }

    let minVal = Infinity, maxVal = -Infinity;
    for (let i = 0; i < displayGrid.length; i++) {
      const v = displayGrid[i];
      if (isFinite(v)) {
        if (v < minVal) minVal = v;
        if (v > maxVal) maxVal = v;
      }
    }
    if (!isFinite(minVal) || !isFinite(maxVal)) {
      minVal = -1;
      maxVal = 1;
    }
    const range = maxVal - minVal || 1;

    // Hue shift for perceptual smoothing (slow breathing effect)
    const hueShift = perceptualSmoothing ? Math.sin(performance.now() * 0.00015) * 0.03 : 0;

    for (let i = 0; i < displayGrid.length; i++) {
      let value = displayGrid[i];
      let normalized = isFinite(value) ? (value - minVal) / range : 0.5;
      
      // Micro-texture noise to break phase-lock (Perceptual Safety)
      if (perceptualSmoothing) {
        const noise = (Math.random() - 0.5) * 0.005;
        normalized = Math.max(0, Math.min(1, normalized + noise));
      }
      
      // Apply hue shift
      let adjustedNorm = Math.max(0, Math.min(1, normalized + hueShift));
      
      // Blend between colormaps during transition
      let r: number, g: number, b: number;
      if (transitionProgress < 1) {
        const [r1, g1, b1] = interpolateColor(adjustedNorm, fromColors);
        const [r2, g2, b2] = interpolateColor(adjustedNorm, toColors);
        // Use ease-out cubic for smoother perceptual transition
        const eased = 1 - Math.pow(1 - transitionProgress, 3);
        r = Math.round(r1 + (r2 - r1) * eased);
        g = Math.round(g1 + (g2 - g1) * eased);
        b = Math.round(b1 + (b2 - b1) * eased);
      } else {
        [r, g, b] = interpolateColor(adjustedNorm, colors);
      }
      
      // Gamma compression for softer contrast (Perceptual Safety)
      if (perceptualSmoothing) {
        r = Math.round(Math.pow(r / 255, 0.85) * 255);
        g = Math.round(Math.pow(g / 255, 0.85) * 255);
        b = Math.round(Math.pow(b / 255, 0.85) * 255);
      }
      
      if (showBasins && basinMap && basinMap.labels[i] >= 0) {
        const basinId = basinMap.labels[i];
        const basinColor = BASIN_COLORS[basinId % BASIN_COLORS.length];
        const alpha = 0.25;
        r = Math.round(r * (1 - alpha) + basinColor[0] * alpha);
        g = Math.round(g * (1 - alpha) + basinColor[1] * alpha);
        b = Math.round(b * (1 - alpha) + basinColor[2] * alpha);
      }
      
      const pixelIdx = i * 4;
      data[pixelIdx] = r;
      data[pixelIdx + 1] = g;
      data[pixelIdx + 2] = b;
      data[pixelIdx + 3] = 255;
    }

    // Use offscreen canvas at grid resolution, then scale up for high-DPI display
    const offscreen = document.createElement("canvas");
    offscreen.width = field.width;
    offscreen.height = field.height;
    const offCtx = offscreen.getContext("2d");
    if (offCtx) {
      offCtx.putImageData(imageData, 0, 0);
      // Use image smoothing for better upscaling quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(offscreen, 0, 0, renderSize, renderSize);
    }
    } catch (e) {
      // Silently handle canvas errors during resize
    }
  }, [field, colormap, basinMap, showBasins, perceptualSmoothing, transitionTick]);

  useEffect(() => {
    render();
  }, [render]);

  useEffect(() => {
    const handleResize = () => render();
    window.addEventListener("resize", handleResize);
    
    // Use ResizeObserver to detect container size changes (e.g., when panels open/close)
    const container = containerRef.current;
    let resizeObserver: ResizeObserver | null = null;
    if (container) {
      resizeObserver = new ResizeObserver(() => {
        render();
      });
      resizeObserver.observe(container);
    }
    
    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [render]);

  // Report transform changes to parent for overlay synchronization
  useEffect(() => {
    if (onTransformChange) {
      onTransformChange({ zoom, panX: pan.x, panY: pan.y });
    }
  }, [zoom, pan, onTransformChange]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    const container = containerRef.current;
    if (!container || !field) return;
    
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - rect.width / 2;
    const mouseY = e.clientY - rect.top - rect.height / 2;
    
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * zoomFactor));
    
    if (newZoom !== zoom) {
      const scale = newZoom / zoom;
      const newPanX = mouseX - scale * (mouseX - pan.x);
      const newPanY = mouseY - scale * (mouseY - pan.y);
      
      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    }
  }, [zoom, pan, field]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (zoom > 1 && e.button === 0) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [zoom, pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning) {
      const newPanX = e.clientX - panStart.x;
      const newPanY = e.clientY - panStart.y;
      
      const maxPan = (canvasSize * (zoom - 1)) / 2;
      setPan({
        x: Math.max(-maxPan, Math.min(maxPan, newPanX)),
        y: Math.max(-maxPan, Math.min(maxPan, newPanY)),
      });
    } else if (field && onHover) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const scaleX = field.width / rect.width;
      const scaleY = field.height / rect.height;
      
      const x = Math.floor((e.clientX - rect.left) * scaleX);
      const y = Math.floor((e.clientY - rect.top) * scaleY);
      
      if (x >= 0 && x < field.width && y >= 0 && y < field.height) {
        onHover(x, y, e.clientX, e.clientY);
      }
    }
  }, [isPanning, panStart, canvasSize, zoom, field, onHover]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPanning(false);
    onHoverEnd?.();
  }, [onHoverEnd]);

  const handleDoubleClick = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dx = t0.clientX - t1.clientX;
      const dy = t0.clientY - t1.clientY;
      lastTouchDistRef.current = Math.sqrt(dx * dx + dy * dy);
      lastTouchCenterRef.current = {
        x: (t0.clientX + t1.clientX) / 2,
        y: (t0.clientY + t1.clientY) / 2,
      };
    } else if (e.touches.length === 1 && zoom > 1) {
      setIsPanning(true);
      setPanStart({ 
        x: e.touches[0].clientX - pan.x, 
        y: e.touches[0].clientY - pan.y 
      });
    }
  }, [zoom, pan]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;

    if (e.touches.length === 2 && lastTouchDistRef.current !== null) {
      e.preventDefault();
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dx = t0.clientX - t1.clientX;
      const dy = t0.clientY - t1.clientY;
      const newDist = Math.sqrt(dx * dx + dy * dy);
      const newCenter = {
        x: (t0.clientX + t1.clientX) / 2,
        y: (t0.clientY + t1.clientY) / 2,
      };
      
      if (lastTouchCenterRef.current) {
        const scale = newDist / lastTouchDistRef.current;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * scale));
        
        if (newZoom !== zoom) {
          const rect = container.getBoundingClientRect();
          const centerX = newCenter.x - rect.left - rect.width / 2;
          const centerY = newCenter.y - rect.top - rect.height / 2;
          
          const zoomScale = newZoom / zoom;
          const newPanX = centerX - zoomScale * (centerX - pan.x);
          const newPanY = centerY - zoomScale * (centerY - pan.y);
          
          setZoom(newZoom);
          setPan({ x: newPanX, y: newPanY });
        }
        
        lastTouchDistRef.current = newDist;
        lastTouchCenterRef.current = newCenter;
      }
    } else if (e.touches.length === 1 && isPanning) {
      const newPanX = e.touches[0].clientX - panStart.x;
      const newPanY = e.touches[0].clientY - panStart.y;
      
      const maxPan = (canvasSize * (zoom - 1)) / 2;
      setPan({
        x: Math.max(-maxPan, Math.min(maxPan, newPanX)),
        y: Math.max(-maxPan, Math.min(maxPan, newPanY)),
      });
    }
  }, [zoom, pan, isPanning, panStart, canvasSize]);

  const handleTouchEnd = useCallback(() => {
    lastTouchDistRef.current = null;
    lastTouchCenterRef.current = null;
    setIsPanning(false);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!field || isPanning) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = field.width / rect.width;
    const scaleY = field.height / rect.height;
    
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);
    
    if (x >= 0 && x < field.width && y >= 0 && y < field.height) {
      // In inspector mode, clicks add probes; otherwise delegate to onClick
      if (inspectorMode && onAddProbe) {
        onAddProbe(x, y);
      } else if (onClick) {
        onClick(x, y, e.shiftKey);
      }
    }
  }, [field, onClick, isPanning, inspectorMode, onAddProbe]);

  const zoomPercent = Math.round(zoom * 100);
  
  const getCursor = () => {
    if (inspectorMode) return 'copy'; // Indicates adding a probe marker
    if (perturbMode) return 'cell';
    if (zoom > 1) return isPanning ? 'grabbing' : 'grab';
    return 'crosshair';
  };

  // Use canvasSize directly - no visual scaling to avoid overlay misalignment
  const visualSize = canvasSize;

  // Render overlay canvas when overlay data is provided
  useEffect(() => {
    try {
      const canvas = overlayCanvasRef.current;
      if (!canvas || canvasSize <= 0) return;
      if (!overlayDerivedField && !overlayBasinMap) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const renderSize = Math.floor(canvasSize * dpr);
    
    canvas.width = renderSize;
    canvas.height = renderSize;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (overlayBasinMap && overlayBasinMap.labels.length > 0) {
      const { labels, width, height } = overlayBasinMap;
      
      // Guard against zero dimensions
      if (width <= 0 || height <= 0) return;
      
      // Use offscreen canvas at grid resolution for smooth scaling
      const offscreen = document.createElement("canvas");
      offscreen.width = width;
      offscreen.height = height;
      const offCtx = offscreen.getContext("2d");
      if (!offCtx) return;
      
      const imageData = offCtx.createImageData(width, height);
      const data = imageData.data;
      
      for (let i = 0; i < labels.length; i++) {
        const basinId = labels[i];
        const pixelIdx = i * 4;
        if (basinId >= 0) {
          const color = BASIN_COLORS[basinId % BASIN_COLORS.length];
          data[pixelIdx] = color[0];
          data[pixelIdx + 1] = color[1];
          data[pixelIdx + 2] = color[2];
          data[pixelIdx + 3] = 255;
        } else {
          data[pixelIdx] = 20;
          data[pixelIdx + 1] = 20;
          data[pixelIdx + 2] = 30;
          data[pixelIdx + 3] = 255;
        }
      }
      
      offCtx.putImageData(imageData, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(offscreen, 0, 0, renderSize, renderSize);
      
    } else if (overlayDerivedField) {
      const { grid, width, height } = overlayDerivedField;
      
      // Guard against zero dimensions
      if (width <= 0 || height <= 0) return;
      
      let min = Infinity, max = -Infinity;
      for (let i = 0; i < grid.length; i++) {
        if (grid[i] < min) min = grid[i];
        if (grid[i] > max) max = grid[i];
      }
      const range = max - min || 1;

      // Use offscreen canvas at grid resolution for smooth scaling
      const offscreen = document.createElement("canvas");
      offscreen.width = width;
      offscreen.height = height;
      const offCtx = offscreen.getContext("2d");
      if (!offCtx) return;
      
      const imageData = offCtx.createImageData(width, height);
      const data = imageData.data;

      for (let i = 0; i < grid.length; i++) {
        const val = grid[i];
        const t = Math.max(0, Math.min(1, (val - min) / range));
        const idx = Math.min(Math.floor(t * (PLASMA_COLORS.length - 1)), PLASMA_COLORS.length - 2);
        const f = t * (PLASMA_COLORS.length - 1) - idx;
        const c1 = PLASMA_COLORS[idx];
        const c2 = PLASMA_COLORS[idx + 1];
        const r = Math.round(c1[0] + f * (c2[0] - c1[0]));
        const g = Math.round(c1[1] + f * (c2[1] - c1[1]));
        const b = Math.round(c1[2] + f * (c2[2] - c1[2]));
        const pixelIdx = i * 4;
        data[pixelIdx] = r;
        data[pixelIdx + 1] = g;
        data[pixelIdx + 2] = b;
        data[pixelIdx + 3] = 255;
      }
      
      offCtx.putImageData(imageData, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(offscreen, 0, 0, renderSize, renderSize);
    }
    } catch (e) {
      // Silently handle canvas errors during resize
    }
  }, [overlayDerivedField, overlayBasinMap, canvasSize]);

  // Always render overlay canvas when there's data - opacity controls visibility
  // This prevents remounting issues when opacity goes to 0 and back
  const hasOverlayData = overlayDerivedField || overlayBasinMap;

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center overflow-hidden"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onDoubleClick={handleDoubleClick}
      onClick={handleClick}
      onTouchStart={disableTouch ? undefined : handleTouchStart}
      onTouchMove={disableTouch ? undefined : handleTouchMove}
      onTouchEnd={disableTouch ? undefined : handleTouchEnd}
      style={{ 
        cursor: getCursor(),
        backgroundColor: 'rgb(0, 0, 0)',
        touchAction: disableTouch ? 'auto' : 'none',
      }}
      data-testid="visualization-container"
    >

      {field ? (
        <>
          <canvas
            ref={canvasRef}
            className="rounded-md relative"
            style={{ 
              imageRendering: zoom > 2 ? "pixelated" : "auto",
              width: `${visualSize}px`,
              height: `${visualSize}px`,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              boxShadow: '0 4px 24px rgba(0,0,0,0.6), 0 0 1px rgba(255,255,255,0.1)',
            }}
            data-testid="canvas-visualization"
          />
          {/* Overlay canvas - positioned absolutely over the base canvas */}
          {hasOverlayData && (
            <canvas
              ref={overlayCanvasRef}
              className="absolute rounded-md pointer-events-none"
              style={{ 
                width: `${visualSize}px`,
                height: `${visualSize}px`,
                left: '50%',
                top: '50%',
                marginLeft: `-${visualSize / 2}px`,
                marginTop: `-${visualSize / 2}px`,
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
                opacity: overlayOpacity,
              }}
              data-testid="canvas-overlay"
            />
          )}
          {trajectoryProbePoint && field && (
            <div 
              className="absolute pointer-events-none"
              style={{
                left: `calc(50% - ${visualSize/2}px + ${(trajectoryProbePoint.x / field.width) * visualSize}px + ${pan.x}px)`,
                top: `calc(50% - ${visualSize/2}px + ${(trajectoryProbePoint.y / field.height) * visualSize}px + ${pan.y}px)`,
                transform: `scale(${zoom})`,
                transformOrigin: 'center center',
              }}
              data-testid="trajectory-probe-marker"
            >
              <div 
                className="w-3 h-3 rounded-full border-2 border-cyan-400 bg-cyan-400/30"
                style={{ 
                  boxShadow: '0 0 8px rgba(34, 211, 238, 0.6)',
                  marginLeft: '-6px',
                  marginTop: '-6px',
                }}
              />
            </div>
          )}
          {showProbeMarkers && field && savedProbes.map((probe) => (
            <div 
              key={probe.id}
              className="absolute pointer-events-none"
              style={{
                left: `calc(50% - ${visualSize/2}px + ${(probe.x / field.width) * visualSize}px + ${pan.x}px)`,
                top: `calc(50% - ${visualSize/2}px + ${(probe.y / field.height) * visualSize}px + ${pan.y}px)`,
                transform: `scale(${zoom})`,
                transformOrigin: 'center center',
              }}
              data-testid={`probe-marker-${probe.id}`}
            >
              {/* Crosshair lines */}
              <div 
                className="absolute"
                style={{
                  width: '24px',
                  height: '2px',
                  backgroundColor: 'white',
                  left: '-12px',
                  top: '-1px',
                  boxShadow: '0 0 4px rgba(0,0,0,0.8)',
                }}
              />
              <div 
                className="absolute"
                style={{
                  width: '2px',
                  height: '24px',
                  backgroundColor: 'white',
                  left: '-1px',
                  top: '-12px',
                  boxShadow: '0 0 4px rgba(0,0,0,0.8)',
                }}
              />
              {/* Outer white ring for contrast */}
              <div 
                className="absolute"
                style={{ 
                  width: '28px',
                  height: '28px',
                  marginLeft: '-14px',
                  marginTop: '-14px',
                  borderRadius: '50%',
                  border: '2px solid white',
                  boxShadow: '0 0 8px rgba(0,0,0,0.8), inset 0 0 8px rgba(0,0,0,0.4)',
                }}
              />
              {/* Inner colored ring */}
              <div 
                className="absolute flex items-center justify-center"
                style={{ 
                  width: '22px',
                  height: '22px',
                  marginLeft: '-11px',
                  marginTop: '-11px',
                  borderRadius: '50%',
                  border: `3px solid ${probe.color}`,
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  boxShadow: `0 0 12px ${probe.color}, 0 0 20px ${probe.color}66`,
                }}
              >
                <span 
                  className="text-[10px] font-bold"
                  style={{ 
                    color: 'white',
                    textShadow: `0 0 4px ${probe.color}, 0 0 8px ${probe.color}`,
                  }}
                >
                  {probe.label.replace('P', '')}
                </span>
              </div>
              {probe.isBaseline && (
                <div 
                  className="absolute w-3 h-3 rounded-full bg-amber-400 flex items-center justify-center"
                  style={{ 
                    boxShadow: '0 0 6px rgba(251, 191, 36, 1), 0 0 12px rgba(251, 191, 36, 0.6)',
                    top: '-16px',
                    left: '4px',
                    border: '1px solid white',
                  }}
                >
                  <span className="text-[6px] font-bold text-black">B</span>
                </div>
              )}
            </div>
          ))}
          {zoom > 1 && (
            <div className="absolute bottom-2 left-2 bg-background/80 text-xs px-2 py-1 rounded text-muted-foreground" data-testid="zoom-indicator">
              {zoomPercent}% (double-click to reset)
            </div>
          )}
        </>
      ) : (
        <div className="text-muted-foreground text-sm">
          Initializing simulation...
        </div>
      )}
    </div>
  );
}
