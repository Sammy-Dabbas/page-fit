import type { FontName } from "../types.js";

export const FONT_METRICS: Record<FontName, number> = {
  "times-new-roman": 0.442,
  "arial": 0.478,
  "calibri": 0.458,
  "courier": 0.600,
  "garamond": 0.420,
  "georgia": 0.485,
  "helvetica": 0.478,
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
