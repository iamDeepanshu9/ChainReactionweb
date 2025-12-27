export type PlayerId = string;

export const PlayerType = {
  HUMAN: 'HUMAN',
  BOT: 'BOT'
} as const;

export type PlayerType = typeof PlayerType[keyof typeof PlayerType];

export const Difficulty = {
  EASY: 'EASY',
  MEDIUM: 'MEDIUM',
  HARD: 'HARD'
} as const;

export type Difficulty = typeof Difficulty[keyof typeof Difficulty];

export interface Player {
  id: PlayerId;
  name: string;
  color: string;
  isAlive: boolean;
  order: number; // Turn order
  type: PlayerType;
  difficulty?: Difficulty;
}

export interface Cell {
  row: number;
  col: number;
  count: number; // Number of orbs in the cell
  owner: PlayerId | null;
  capacity: number; // Max orbs before explosion (2 for corners, 3 for edges, 4 for center)
}

export type Grid = Cell[][];

export const GridSize = {
  SMALL: 'SMALL',
  MEDIUM: 'MEDIUM',
  LARGE: 'LARGE',
} as const;

export type GridSize = typeof GridSize[keyof typeof GridSize];

export type MultiplayerMode = 'HOST' | 'GUEST' | 'OFFLINE';

export interface MultiplayerConfig {
  mode: MultiplayerMode;
  roomId?: string;
  isHost: boolean;
  username?: string;
  playerId?: string; // Local player's ID (socket.id)
}

export interface GameState {
  grid: Grid;
  players: Player[];
  currentPlayerId: PlayerId;
  isGameOver: boolean;
  winner: PlayerId | null;
  turnCount: number;
}
