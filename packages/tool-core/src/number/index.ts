/** Round to a fixed number of decimal places, tolerating floating-point noise. */
export function roundTo(value: number, places = 4): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}
