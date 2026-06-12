import { create } from 'zustand';

export type StationId = 'farm' | 'factory' | 'distributor' | 'restaurant';
export type GamePhase = 'lobby' | 'role_select' | 'playing' | 'finished';

export interface StationData {
  stock: number;
  backorder: number;
  cost: number;
  incomingShipment: number;
  incomingOrder?: number;
}

export interface PlayerInfo {
  name: string;
  role: StationId | null;
  submitted: boolean;
}

export interface ClientGameState {
  turn: number;
  maxTurns: number;
  stations: Record<StationId, StationData>;
  customerDemand?: number;
  lastDemand: number;
  mySubmitted: boolean;
  submittedCount: number;
  totalPlayers: number;
  myRole: StationId;
}

export interface RoomState {
  code: string;
  phase: GamePhase;
  host: string;
  players: PlayerInfo[];
  myRole: StationId | null;
  myName: string;
  gameState: ClientGameState | null;
}

export const ROLE_NAMES: Record<StationId, string> = {
  restaurant: 'Fried Chicken Shop',
  distributor: 'Distributor',
  factory: 'Factory',
  farm: 'Farm',
};

export const ROLE_COLORS: Record<StationId, string> = {
  restaurant: 'from-orange-500 to-red-600',
  distributor: 'from-blue-500 to-cyan-600',
  factory: 'from-purple-500 to-indigo-600',
  farm: 'from-green-500 to-emerald-600',
};

export const SUPPLY_CHAIN: StationId[] = ['farm', 'factory', 'distributor', 'restaurant'];

interface GameStore {
  ws: WebSocket | null;
  connected: boolean;
  error: string | null;
  screen: 'home' | 'game';
  playerName: string;
  orderInput: number;
  room: RoomState | null;

  setPlayerName: (name: string) => void;
  setOrderInput: (v: number) => void;
  connect: () => void;
  createRoom: () => void;
  joinRoom: (code: string) => void;
  chooseRole: (role: StationId) => void;
  startGame: () => void;
  submitOrder: () => void;
  leaveRoom: () => void;
  clearError: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const WS_URL = (import.meta as any).env?.VITE_WS_URL || ((window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host);

export const useGameStore = create<GameStore>((set, get) => ({
  ws: null,
  connected: false,
  error: null,
  screen: 'home',
  playerName: '',
  orderInput: 4,
  room: null,

  setPlayerName: (name) => set({ playerName: name }),
  setOrderInput: (v) => set({ orderInput: Math.max(0, Math.min(99, v)) }),
  clearError: () => set({ error: null }),

  connect: () => {
    const existing = get().ws;
    if (existing && existing.readyState === WebSocket.OPEN) return;
    const ws = new WebSocket(WS_URL);
    ws.onopen = () => set({ connected: true, error: null });
    ws.onmessage = (e) => {
      let msg: any;
      try { msg = JSON.parse(e.data); } catch { return; }
      if (msg.type === 'room_created') set({ screen: 'game' });
      else if (msg.type === 'room_update') set({ room: msg.room, screen: 'game' });
      else if (msg.type === 'error') set({ error: msg.message });
    };
    ws.onclose = () => set({ connected: false, ws: null });
    ws.onerror = () => set({ error: 'Cannot connect to server. Run: npm run server', connected: false });
    set({ ws });
  },

  createRoom: () => {
    const { ws, playerName } = get();
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'create_room', name: playerName || 'Host' }));
  },

  joinRoom: (code: string) => {
    const { ws, playerName } = get();
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'join_room', code, name: playerName || 'Player' }));
  },

  chooseRole: (role: StationId) => {
    get().ws?.send(JSON.stringify({ type: 'choose_role', role }));
  },

  startGame: () => {
    get().ws?.send(JSON.stringify({ type: 'start_game' }));
  },

  submitOrder: () => {
    const { ws, orderInput } = get();
    ws?.send(JSON.stringify({ type: 'submit_order', order: orderInput }));
  },

  leaveRoom: () => {
    get().ws?.close();
    set({ ws: null, connected: false, room: null, screen: 'home', orderInput: 4 });
  },
}));
