import { useCallback, useRef, useState, useEffect } from 'react';
import { SFDEngine } from './sfd-engine';

export interface TouchState {
  isLongPressing: boolean;
  isDragging: boolean;
  lastDoubleTapData: DoubleTapData | null;
}

export interface DoubleTapData {
  x: number;
  y: number;
  fieldX: number;
  fieldY: number;
  localKappa: number;
  localEpsilon: number;
  stabilityClass: 'stable' | 'borderline' | 'unstable';
  timestamp: number;
}

interface TouchPoint {
  x: number;
  y: number;
  clientX: number;
  clientY: number;
  time: number;
}

interface PerturbationState {
  active: boolean;
  x: number;
  y: number;
  startTime: number;
  amplitude: number;
}

const LONG_PRESS_THRESHOLD = 350;
const DOUBLE_TAP_THRESHOLD = 300;
const DOUBLE_TAP_DISTANCE = 30;
const PERTURBATION_DECAY_MS = 800;
const SHEAR_INTENSITY_CAP = 0.15;
const DOUBLE_TAP_FADEOUT_MS = 1500;

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function gaussianKernel(distance: number, sigma: number): number {
  return Math.exp(-(distance * distance) / (2 * sigma * sigma));
}

export interface TouchControllerOptions {
  regimeAmplitude?: number;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  visualScale?: number;
}

export function useTouchController(
  engineRef: React.RefObject<SFDEngine | null>,
  fieldWidth: number,
  fieldHeight: number,
  containerRef: React.RefObject<HTMLElement | null>,
  options: TouchControllerOptions = {}
) {
  const regimeAmplitude = options.regimeAmplitude ?? 0.25;
  const visualScale = options.visualScale ?? 0.88;
  const { onSwipeLeft, onSwipeRight } = options;
  const [touchState, setTouchState] = useState<TouchState>({
    isLongPressing: false,
    isDragging: false,
    lastDoubleTapData: null,
  });

  const touchStartRef = useRef<TouchPoint | null>(null);
  const lastTapRef = useRef<TouchPoint | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const perturbationRef = useRef<PerturbationState | null>(null);
  const perturbationAnimRef = useRef<number | null>(null);
  const dragPathRef = useRef<TouchPoint[]>([]);
  const doubleTapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getFieldCoords = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    
    // Calculate the actual canvas size (scaled and centered)
    const containerSize = Math.min(rect.width, rect.height);
    const canvasSize = containerSize * visualScale;
    
    // Canvas is centered in the container
    const canvasLeft = rect.left + (rect.width - canvasSize) / 2;
    const canvasTop = rect.top + (rect.height - canvasSize) / 2;
    
    // Map touch to canvas-relative coordinates
    const relX = (clientX - canvasLeft) / canvasSize;
    const relY = (clientY - canvasTop) / canvasSize;
    
    // Allow touches slightly outside the canvas bounds (for edge interactions)
    const clampedRelX = Math.max(0, Math.min(1, relX));
    const clampedRelY = Math.max(0, Math.min(1, relY));
    
    return {
      fieldX: Math.floor(clampedRelX * fieldWidth),
      fieldY: Math.floor(clampedRelY * fieldHeight),
      relX: clampedRelX,
      relY: clampedRelY,
    };
  }, [fieldWidth, fieldHeight, containerRef, visualScale]);

  const applyGaussianPerturbation = useCallback((
    fieldX: number,
    fieldY: number,
    amplitude: number,
    radius: number = 12
  ) => {
    if (!engineRef.current) return;
    engineRef.current.perturbField(fieldX, fieldY, amplitude, radius);
  }, [engineRef]);

  const animatePerturbationDecay = useCallback(() => {
    if (!perturbationRef.current || !perturbationRef.current.active) return;
    
    const elapsed = Date.now() - perturbationRef.current.startTime;
    const progress = Math.min(elapsed / PERTURBATION_DECAY_MS, 1);
    
    if (progress < 1) {
      const decayedAmplitude = perturbationRef.current.amplitude * (1 - easeOutExpo(progress)) * 0.1;
      if (decayedAmplitude > 0.01) {
        applyGaussianPerturbation(
          perturbationRef.current.x,
          perturbationRef.current.y,
          decayedAmplitude,
          8
        );
      }
      perturbationAnimRef.current = requestAnimationFrame(animatePerturbationDecay);
    } else {
      perturbationRef.current.active = false;
      perturbationAnimRef.current = null;
    }
  }, [applyGaussianPerturbation]);

  const startLongPressPerturbation = useCallback((fieldX: number, fieldY: number) => {
    if (perturbationAnimRef.current) {
      cancelAnimationFrame(perturbationAnimRef.current);
    }
    
    const baseAmplitude = regimeAmplitude;
    
    perturbationRef.current = {
      active: true,
      x: fieldX,
      y: fieldY,
      startTime: Date.now(),
      amplitude: baseAmplitude,
    };
    
    applyGaussianPerturbation(fieldX, fieldY, baseAmplitude, 15);
    
    setTouchState(prev => ({ ...prev, isLongPressing: true }));
    
    perturbationAnimRef.current = requestAnimationFrame(animatePerturbationDecay);
  }, [applyGaussianPerturbation, animatePerturbationDecay]);

  const applyShearDeformation = useCallback((
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ) => {
    if (!engineRef.current) return;
    
    const dx = toX - fromX;
    const dy = toY - fromY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 1) return;
    
    const magnitude = Math.min(distance * 0.01, SHEAR_INTENSITY_CAP);
    
    const steps = Math.ceil(distance / 3);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = Math.floor(fromX + dx * t);
      const y = Math.floor(fromY + dy * t);
      
      const perpX = -dy / distance;
      const perpY = dx / distance;
      
      const falloff = gaussianKernel(Math.abs(i - steps / 2), steps / 3);
      const shearMag = magnitude * falloff;
      
      engineRef.current.perturbField(x, y, shearMag, 6);
    }
  }, [engineRef]);

  const getLocalFieldData = useCallback((fieldX: number, fieldY: number): DoubleTapData | null => {
    if (!engineRef.current) return null;
    
    const probeData = engineRef.current.computeProbeData(fieldX, fieldY);
    if (!probeData) return null;
    
    const localKappa = probeData.curvature || 0;
    const localEpsilon = probeData.value || 0;
    
    let stabilityClass: 'stable' | 'borderline' | 'unstable' = 'stable';
    const variance = Math.abs(localKappa);
    if (variance > 0.15) {
      stabilityClass = 'unstable';
    } else if (variance > 0.05) {
      stabilityClass = 'borderline';
    }
    
    return {
      x: 0,
      y: 0,
      fieldX,
      fieldY,
      localKappa,
      localEpsilon,
      stabilityClass,
      timestamp: Date.now(),
    };
  }, [engineRef]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    const coords = getFieldCoords(touch.clientX, touch.clientY);
    if (!coords) return;
    
    const now = Date.now();
    
    touchStartRef.current = {
      x: coords.fieldX,
      y: coords.fieldY,
      clientX: touch.clientX,
      clientY: touch.clientY,
      time: now,
    };
    
    if (lastTapRef.current) {
      const timeDiff = now - lastTapRef.current.time;
      const distDiff = Math.sqrt(
        Math.pow(coords.fieldX - lastTapRef.current.x, 2) +
        Math.pow(coords.fieldY - lastTapRef.current.y, 2)
      );
      
      if (timeDiff < DOUBLE_TAP_THRESHOLD && distDiff < DOUBLE_TAP_DISTANCE) {
        const doubleTapData = getLocalFieldData(coords.fieldX, coords.fieldY);
        if (doubleTapData) {
          doubleTapData.x = touch.clientX;
          doubleTapData.y = touch.clientY;
          setTouchState(prev => ({
            ...prev,
            lastDoubleTapData: doubleTapData,
          }));
          
          if (doubleTapTimeoutRef.current) {
            clearTimeout(doubleTapTimeoutRef.current);
          }
          doubleTapTimeoutRef.current = setTimeout(() => {
            setTouchState(prev => ({ ...prev, lastDoubleTapData: null }));
          }, DOUBLE_TAP_FADEOUT_MS);
        }
        
        lastTapRef.current = null;
        return;
      }
    }
    
    longPressTimerRef.current = setTimeout(() => {
      if (touchStartRef.current) {
        startLongPressPerturbation(touchStartRef.current.x, touchStartRef.current.y);
      }
    }, LONG_PRESS_THRESHOLD);
    
  }, [getFieldCoords, getLocalFieldData, startLongPressPerturbation]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (!touchStartRef.current || e.touches.length !== 1) return;
    
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    
    const touch = e.touches[0];
    const coords = getFieldCoords(touch.clientX, touch.clientY);
    if (!coords) return;
    
    const dx = touch.clientX - touchStartRef.current.clientX;
    const dy = touch.clientY - touchStartRef.current.clientY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 10 && !touchState.isDragging) {
      setTouchState(prev => ({ ...prev, isDragging: true, isLongPressing: false }));
      dragPathRef.current = [{
        x: touchStartRef.current.x,
        y: touchStartRef.current.y,
        clientX: touchStartRef.current.clientX,
        clientY: touchStartRef.current.clientY,
        time: touchStartRef.current.time,
      }];
    }
    
    if (touchState.isDragging) {
      const lastPoint = dragPathRef.current[dragPathRef.current.length - 1];
      if (lastPoint) {
        applyShearDeformation(lastPoint.x, lastPoint.y, coords.fieldX, coords.fieldY);
      }
      
      dragPathRef.current.push({
        x: coords.fieldX,
        y: coords.fieldY,
        clientX: touch.clientX,
        clientY: touch.clientY,
        time: Date.now(),
      });
      
      if (dragPathRef.current.length > 10) {
        dragPathRef.current = dragPathRef.current.slice(-10);
      }
    }
  }, [getFieldCoords, touchState.isDragging, applyShearDeformation]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    
    const startData = touchStartRef.current;
    
    if (startData && !touchState.isDragging && !touchState.isLongPressing) {
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - startData.clientX;
      const deltaY = touch.clientY - startData.clientY;
      const elapsed = Date.now() - startData.time;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      
      // Swipe detection: horizontal swipe
      if (absX > 80 && absX > absY * 2 && elapsed < 400) {
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight();
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft();
        }
      } else if (elapsed < LONG_PRESS_THRESHOLD) {
        // Short tap - register for double-tap detection
        lastTapRef.current = { ...startData };
      }
    }
    
    setTouchState(prev => ({
      ...prev,
      isLongPressing: false,
      isDragging: false,
    }));
    
    if (perturbationRef.current) {
      perturbationRef.current.active = false;
    }
    
    dragPathRef.current = [];
    touchStartRef.current = null;
  }, [touchState.isDragging, touchState.isLongPressing, onSwipeLeft, onSwipeRight]);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
      if (perturbationAnimRef.current) {
        cancelAnimationFrame(perturbationAnimRef.current);
      }
      if (doubleTapTimeoutRef.current) {
        clearTimeout(doubleTapTimeoutRef.current);
      }
    };
  }, []);

  const clearDoubleTapData = useCallback(() => {
    setTouchState(prev => ({ ...prev, lastDoubleTapData: null }));
  }, []);

  return {
    touchState,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    clearDoubleTapData,
  };
}
