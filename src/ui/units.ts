/**
 * Everything in the model is stored in metres. Everything the Wall was actually
 * built to was in feet and inches — the drawings are dimensioned 7'-0", 6'-6",
 * 38'-10" — so feet and inches is the default here, and metric is the toggle.
 */
export type UnitSystem = 'imperial' | 'metric';

export const UNIT_LABEL: Record<UnitSystem, string> = {
  imperial: 'ft · in',
  metric: 'metres',
};

const M_PER_FT = 0.3048;
const M_PER_IN = 0.0254;

/** Feet and inches, to the nearest inch: 62'-3". Rolls 12" up to the next foot. */
export function feetInches(metres: number): string {
  const totalIn = Math.round(metres / M_PER_IN);
  const ft = Math.floor(totalIn / 12);
  const inches = totalIn - ft * 12;
  return `${ft}'-${inches}"`;
}

/** A long dimension: the wall, the deck, a tower. */
export function long(metres: number, units: UnitSystem): string {
  return units === 'imperial' ? feetInches(metres) : `${metres.toFixed(2)} m`;
}

/** A short dimension: a cabinet, a driver, a tube. */
export function short(metres: number, units: UnitSystem): string {
  return units === 'imperial'
    ? `${(metres / M_PER_IN).toFixed(1)}″`
    : `${(metres * 100).toFixed(1)} cm`;
}

/** An area. */
export function area(sqMetres: number, units: UnitSystem): string {
  return units === 'imperial'
    ? `${Math.round(sqMetres / (M_PER_FT * M_PER_FT))} sq ft`
    : `${Math.round(sqMetres)} m²`;
}

/** A weight, from short tons. */
export function weight(shortTons: number, units: UnitSystem): string {
  return units === 'imperial' ? `${shortTons} tons` : `${Math.round(shortTons * 0.907)} tonnes`;
}
