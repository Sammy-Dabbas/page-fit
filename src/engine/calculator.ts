import type { PageFormat, PageMetrics, MeasureResult } from "../types.js";
import { POINTS_PER_INCH, CHARS_PER_WORD } from "../types.js";
import { getFontWidth, isMonospace } from "./fonts.js";

export function calculatePageMetrics(format: PageFormat): PageMetrics {
  const effectiveWidth = format.paper.width - (format.margins.left + format.margins.right) * POINTS_PER_INCH;
  const effectiveHeight = format.paper.height - (format.margins.top + format.margins.bottom) * POINTS_PER_INCH;

  const charWidth = getFontWidth(format.font, format.fontSize);
  const lineHeight = format.fontSize * format.lineSpacing;

  const charsPerLine = Math.floor(effectiveWidth / charWidth);
  const linesPerPage = Math.floor(effectiveHeight / lineHeight);

  const correctionFactor = isMonospace(format.font) ? 0.98 : 0.90;
  const charsPerPage = Math.floor(charsPerLine * linesPerPage * correctionFactor);

  return { charsPerLine, linesPerPage, charsPerPage };
}

function effectiveLength(text: string, charsPerLine: number): number {
  const lines = text.split("\n");
  let total = 0;
  for (const line of lines) {
    total += Math.ceil(Math.max(line.length, 1) / charsPerLine) * charsPerLine;
  }
  return total;
}

export function measureText(text: string, format: PageFormat, targetPages: number): MeasureResult {
  const metrics = calculatePageMetrics(format);
  const textLength = effectiveLength(text, metrics.charsPerLine);
  const totalCapacity = metrics.charsPerPage * targetPages;
  const pages = Math.round((textLength / metrics.charsPerPage) * 100) / 100;
  const words = Math.floor(text.length / CHARS_PER_WORD);
  const percentageFull = Math.round((textLength / totalCapacity) * 100);

  if (textLength <= totalCapacity) {
    const remaining = totalCapacity - textLength;
    return {
      pages,
      target_pages: targetPages,
      fits: true,
      characters: text.length,
      characters_per_page: metrics.charsPerPage,
      characters_remaining: remaining,
      words,
      percentage_full: percentageFull,
      suggestion: `You have room for approximately ${remaining} more characters (about ${Math.floor(remaining / CHARS_PER_WORD)} words).`,
    };
  }

  const over = textLength - totalCapacity;
  return {
    pages,
    target_pages: targetPages,
    fits: false,
    characters: text.length,
    characters_per_page: metrics.charsPerPage,
    characters_over: over,
    words,
    percentage_full: percentageFull,
    suggestion: `Remove approximately ${over} characters (about ${Math.floor(over / CHARS_PER_WORD)} words) to fit on ${targetPages} page${targetPages > 1 ? "s" : ""}.`,
  };
}
