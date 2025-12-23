export type PlayerId = string;

export interface Player {
  id: PlayerId;
  name: string;
  color: string;
  isAlive: boolean;
  order: number; // Turn order
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

export interface GameState {
  grid: Grid;
  players: Player[];
  currentPlayerId: PlayerId;
  isGameOver: boolean;
  winner: PlayerId | null;
  turnCount: number;
}
