type PinnedState = {
  isPinned: boolean;
  position: { x: number; y: number } | null;
};

type PanelStateStore = {
  playback: PinnedState;
  perturbation: PinnedState;
  inspector: PinnedState;
  diagnostics: PinnedState;
  probeDetail: PinnedState;
};

const defaultState: PinnedState = { isPinned: false, position: null };

const store: PanelStateStore = {
  playback: { ...defaultState },
  perturbation: { ...defaultState },
  inspector: { ...defaultState },
  diagnostics: { ...defaultState },
  probeDetail: { ...defaultState },
};

export type PanelKey = keyof PanelStateStore;

export function getPanelState(key: PanelKey): PinnedState {
  return store[key];
}

export function setPanelState(key: PanelKey, state: Partial<PinnedState>): void {
  store[key] = { ...store[key], ...state };
}

export function setPanelPinned(key: PanelKey, isPinned: boolean, position: { x: number; y: number } | null): void {
  store[key] = { isPinned, position };
}

export function getAllPanelStates(): PanelStateStore {
  return { ...store };
}

export function resetPanelState(key: PanelKey): void {
  store[key] = { ...defaultState };
}
