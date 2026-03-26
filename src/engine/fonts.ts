import type { FontName } from "../types.js";

export const FONT_METRICS: Record<FontName, number> = {
  "times-new-roman": 4.42,
  "arial": 4.78,
  "calibri": 4.58,
  "courier": 6.00,
  "garamond": 4.20,
  "georgia": 4.85,
  "helvetica": 4.78,
};

const MONOSPACE_FONTS: Set<FontName> = new Set(["courier"]);

export function getFontWidth(font: FontName, fontSize: number): number {
  const baseWidth = FONT_METRICS[font];
  if (baseWidth === undefined) {
    throw new Error(`Unknown font: ${font}`);
  }
  return baseWidth * fontSize;
}

export function isMonospace(font: FontName): boolean {
  return MONOSPACE_FONTS.has(font);
}
