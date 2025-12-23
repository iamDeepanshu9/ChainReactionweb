export const DEFAULT_ROWS = 9;
export const DEFAULT_COLS = 6;

export const MAX_PLAYERS = 8;
export const MIN_PLAYERS = 2;

export const PLAYER_COLORS = [
    '#FF0000', // Red
    '#00FF00', // Green
    '#0000FF', // Blue
    '#FFFF00', // Yellow
    '#FF00FF', // Magenta
    '#00FFFF', // Cyan
    '#FFA500', // Orange
    '#800080', // Purple
];

export const EXPLOSION_DELAY_MS = 300; // Animation delay between chain reactions

export const GRID_SIZE_PRESETS = {
    SMALL: { rows: 9, cols: 6 },
    MEDIUM: { rows: 12, cols: 8 }, // Somewhat larger, roughly double cells (54 vs 96)
    // LARGE is calculated dynamically
};
