const WIND_DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

// winddirection_10m è la direzione da cui arriva il vento, in gradi (0 = nord, 90 = est).
// Ogni punto cardinale copre 45° centrati su di sé: N va da 337.5° a 22.5°.
// La funzione windDirection in src/runners/runner.js fa lo stesso con le sigle italiane
export function windDirection(degrees: number): string {
  return WIND_DIRECTIONS[Math.round(degrees / 45) % 8];
}

// rotazione in gradi dell'icona navigate per una freccia che indica dove va il vento,
// cioè l'opposto di da dove arriva (+180°): l'icona punta già a nord-est (45°), quindi 45° in meno
export function windArrowRotation(degrees: number): number {
  return degrees + 135;
}
