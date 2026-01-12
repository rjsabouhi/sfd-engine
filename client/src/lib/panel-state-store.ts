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
  export: PinnedState;
};

const defaultState: PinnedState = { isPinned: false, position: null };

const store: PanelStateStore = {
  playback: { ...defaultState },
  perturbation: { ...defaultState },
  inspector: { ...defaultState },
  diagnostics: { ...defaultState },
  probeDetail: { ...defaultState },
  export: { ...defaultState },
};

export type PanelKey = keyof PanelStateStore;

function clonePosition(pos: { x: number; y: number } | null): { x: number; y: number } | null {
  return pos ? { x: pos.x, y: pos.y } : null;
}

function cloneState(state: PinnedState): PinnedState {
  return { isPinned: state.isPinned, position: clonePosition(state.position) };
}

export function getPanelState(key: PanelKey): PinnedState {
  return cloneState(store[key]);
}

export function setPanelState(key: PanelKey, state: Partial<PinnedState>): void {
  store[key] = { 
    isPinned: state.isPinned !== undefined ? state.isPinned : store[key].isPinned,
    position: state.position !== undefined ? clonePosition(state.position) : clonePosition(store[key].position)
  };
}

export function setPanelPinned(key: PanelKey, isPinned: boolean, position: { x: number; y: number } | null): void {
  store[key] = { isPinned, position: clonePosition(position) };
}

export function getAllPanelStates(): PanelStateStore {
  return {
    playback: cloneState(store.playback),
    perturbation: cloneState(store.perturbation),
    inspector: cloneState(store.inspector),
    diagnostics: cloneState(store.diagnostics),
    probeDetail: cloneState(store.probeDetail),
    export: cloneState(store.export),
  };
}

export function resetPanelState(key: PanelKey): void {
  store[key] = { isPinned: false, position: null };
}
