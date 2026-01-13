import { VisualPreset } from '@/config/visual-presets';

interface TweenState {
  startValue: number;
  endValue: number;
  startTime: number;
  duration: number;
}

interface TweenValues {
  blend: number;
  smoothing: number;
  noiseWeight: number;
  curvature: number;
}

interface PresetTransition {
  blend: TweenState | null;
  smoothing: TweenState | null;
  noiseWeight: TweenState | null;
  curvature: TweenState | null;
  animationFrame: number | null;
  onUpdate: ((values: TweenValues) => void) | null;
  onComplete: (() => void) | null;
}

const activeTransition: PresetTransition = {
  blend: null,
  smoothing: null,
  noiseWeight: null,
  curvature: null,
  animationFrame: null,
  onUpdate: null,
  onComplete: null,
};

function easeOutQuad(t: number): number {
  return t * (2 - t);
}

function interpolateValue(tween: TweenState, currentTime: number): number {
  const elapsed = currentTime - tween.startTime;
  const progress = Math.min(elapsed / tween.duration, 1);
  const easedProgress = easeOutQuad(progress);
  return tween.startValue + (tween.endValue - tween.startValue) * easedProgress;
}

function animationLoop() {
  const now = Date.now();
  let allComplete = true;
  
  const values: TweenValues = {
    blend: 0,
    smoothing: 0,
    noiseWeight: 0,
    curvature: 0,
  };
  
  if (activeTransition.blend) {
    values.blend = interpolateValue(activeTransition.blend, now);
    if (now - activeTransition.blend.startTime < activeTransition.blend.duration) {
      allComplete = false;
    } else {
      values.blend = activeTransition.blend.endValue;
    }
  }
  
  if (activeTransition.smoothing) {
    values.smoothing = interpolateValue(activeTransition.smoothing, now);
    if (now - activeTransition.smoothing.startTime < activeTransition.smoothing.duration) {
      allComplete = false;
    } else {
      values.smoothing = activeTransition.smoothing.endValue;
    }
  }

  if (activeTransition.noiseWeight) {
    values.noiseWeight = interpolateValue(activeTransition.noiseWeight, now);
    if (now - activeTransition.noiseWeight.startTime < activeTransition.noiseWeight.duration) {
      allComplete = false;
    } else {
      values.noiseWeight = activeTransition.noiseWeight.endValue;
    }
  }

  if (activeTransition.curvature) {
    values.curvature = interpolateValue(activeTransition.curvature, now);
    if (now - activeTransition.curvature.startTime < activeTransition.curvature.duration) {
      allComplete = false;
    } else {
      values.curvature = activeTransition.curvature.endValue;
    }
  }
  
  if (activeTransition.onUpdate) {
    activeTransition.onUpdate(values);
  }
  
  if (allComplete) {
    if (activeTransition.animationFrame) {
      cancelAnimationFrame(activeTransition.animationFrame);
      activeTransition.animationFrame = null;
    }
    if (activeTransition.onComplete) {
      activeTransition.onComplete();
    }
    activeTransition.blend = null;
    activeTransition.smoothing = null;
    activeTransition.noiseWeight = null;
    activeTransition.curvature = null;
    activeTransition.onUpdate = null;
    activeTransition.onComplete = null;
  } else {
    activeTransition.animationFrame = requestAnimationFrame(animationLoop);
  }
}

export interface ApplyPresetOptions {
  currentBlend: number;
  currentSmoothing: number;
  currentNoiseWeight?: number;
  currentCurvature?: number;
  onBlendChange: (value: number) => void;
  onSmoothingChange: (value: number) => void;
  onNoiseWeightChange?: (value: number) => void;
  onCurvatureChange?: (value: number) => void;
  onColorMapChange: (colorMap: 'viridis' | 'inferno' | 'cividis') => void;
  onComplete?: () => void;
  transitionDuration?: number;
}

export function applyPreset(preset: VisualPreset, options: ApplyPresetOptions) {
  const duration = options.transitionDuration ?? 400;
  const now = Date.now();
  
  cancelPresetTransition();
  
  options.onColorMapChange(preset.colorMap);
  
  activeTransition.blend = {
    startValue: options.currentBlend,
    endValue: preset.blend,
    startTime: now,
    duration,
  };
  
  activeTransition.smoothing = {
    startValue: options.currentSmoothing,
    endValue: preset.smoothing,
    startTime: now,
    duration,
  };

  if (options.onNoiseWeightChange) {
    activeTransition.noiseWeight = {
      startValue: options.currentNoiseWeight ?? 0,
      endValue: preset.noiseWeight,
      startTime: now,
      duration,
    };
  }

  if (options.onCurvatureChange) {
    activeTransition.curvature = {
      startValue: options.currentCurvature ?? 0,
      endValue: preset.curvature,
      startTime: now,
      duration,
    };
  }
  
  activeTransition.onUpdate = (values) => {
    options.onBlendChange(values.blend);
    options.onSmoothingChange(values.smoothing);
    if (options.onNoiseWeightChange) {
      options.onNoiseWeightChange(values.noiseWeight);
    }
    if (options.onCurvatureChange) {
      options.onCurvatureChange(values.curvature);
    }
  };
  
  activeTransition.onComplete = options.onComplete || null;
  
  activeTransition.animationFrame = requestAnimationFrame(animationLoop);
}

export function cancelPresetTransition() {
  if (activeTransition.animationFrame) {
    cancelAnimationFrame(activeTransition.animationFrame);
    activeTransition.animationFrame = null;
  }
  activeTransition.blend = null;
  activeTransition.smoothing = null;
  activeTransition.noiseWeight = null;
  activeTransition.curvature = null;
  activeTransition.onUpdate = null;
  activeTransition.onComplete = null;
}

