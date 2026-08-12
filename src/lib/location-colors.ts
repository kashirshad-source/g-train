export interface LocationColor {
  name: string;
  dot: string;
  ring: string;
  bg: string;
  fill: string;
  text: string;
}

// A small, distinguishable palette for tagging locations on the calendar —
// separate from the app's brand palette (black/light-blue/gold), since a
// trainer can have several locations that need to read apart from one glance.
// `bg` is the pale tint used behind text (list rows, badges); `fill` is a
// stronger mid-tone used for the calendar day-cell fills, where `bg` was
// too close to white to tell apart from either the other location or an
// uncovered (transparent) portion of the day.
const LOCATION_COLORS: LocationColor[] = [
  { name: "sky", dot: "#0EA5E9", ring: "#0EA5E9", bg: "#E0F2FE", fill: "#7DD3FC", text: "#0369A1" },
  { name: "violet", dot: "#8B5CF6", ring: "#8B5CF6", bg: "#EDE9FE", fill: "#C4B5FD", text: "#6D28D9" },
  { name: "rose", dot: "#F43F5E", ring: "#F43F5E", bg: "#FFE4E6", fill: "#FDA4AF", text: "#BE123C" },
  { name: "amber", dot: "#F59E0B", ring: "#F59E0B", bg: "#FEF3C7", fill: "#FCD34D", text: "#B45309" },
  { name: "emerald", dot: "#10B981", ring: "#10B981", bg: "#D1FAE5", fill: "#6EE7B7", text: "#047857" },
  { name: "fuchsia", dot: "#D946EF", ring: "#D946EF", bg: "#FAE8FF", fill: "#F0ABFC", text: "#A21CAF" },
  { name: "teal", dot: "#14B8A6", ring: "#14B8A6", bg: "#CCFBF1", fill: "#5EEAD4", text: "#0F766E" },
  { name: "lime", dot: "#84CC16", ring: "#84CC16", bg: "#ECFCCB", fill: "#BEF264", text: "#4D7C0F" },
];

/**
 * Assigns each location a color by its position in the trainer's own
 * location list, so any two of a trainer's locations always read apart —
 * unlike a hash of the id, which can (and did) collide.
 */
export function buildLocationColorMap(locationIds: string[]): Map<string, LocationColor> {
  const map = new Map<string, LocationColor>();
  locationIds.forEach((id, i) => {
    map.set(id, LOCATION_COLORS[i % LOCATION_COLORS.length]);
  });
  return map;
}

export const DEFAULT_LOCATION_COLOR = LOCATION_COLORS[0];
