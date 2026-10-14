import type { Category, CategoryColor } from "./types";

export type CategoryStyle = { label: string; stripe: string; chipFg: string; chipBg: string };

/** Palette keys stored on categories.color. Chip pairs meet 4.5:1 contrast on their backgrounds. */
export const CATEGORY_PALETTE: Record<CategoryColor, CategoryStyle> = {
  blue: { label: "Blue", stripe: "#4D8DFF", chipFg: "#8FB8FF", chipBg: "#15294D" },
  yellow: { label: "Yellow", stripe: "#F2C014", chipFg: "#F5CE54", chipBg: "#332B0E" },
  green: { label: "Green", stripe: "#3DBE7B", chipFg: "#6FDCA6", chipBg: "#0F2E1F" },
  red: { label: "Red", stripe: "#F26D6D", chipFg: "#FF9A9A", chipBg: "#3A1414" },
  orange: { label: "Orange", stripe: "#F0883E", chipFg: "#F8B07A", chipBg: "#3A2110" },
  purple: { label: "Purple", stripe: "#A77BFF", chipFg: "#C7AEFF", chipBg: "#2A1F4D" },
  teal: { label: "Teal", stripe: "#2EC4C4", chipFg: "#7FE0E0", chipBg: "#0E3333" },
  pink: { label: "Pink", stripe: "#F06AB0", chipFg: "#FF9ACF", chipBg: "#3B1530" },
  gray: { label: "Gray", stripe: "#8E97AB", chipFg: "#C3CAD9", chipBg: "#1C222E" },
};

export const CATEGORY_COLORS = Object.keys(CATEGORY_PALETTE) as CategoryColor[];

export function isCategoryColor(value: string): value is CategoryColor {
  return value in CATEGORY_PALETTE;
}

export function categoryStyle(category: Category | null | undefined): CategoryStyle {
  if (!category || !isCategoryColor(category.color)) return CATEGORY_PALETTE.gray;
  return CATEGORY_PALETTE[category.color];
}
