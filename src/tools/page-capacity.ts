import type { PresetName, FontName, PaperSize, Margins } from "../types.js";
import { resolveFormat } from "../engine/presets.js";
import { calculatePageMetrics } from "../engine/calculator.js";
import { FONT_METRICS } from "../engine/fonts.js";
import { CHARS_PER_WORD, POINTS_PER_INCH } from "../types.js";

interface PageCapacityInput {
  preset?: PresetName;
  paper?: PaperSize;
  font?: string;
  font_size?: number;
  margins?: Margins;
  line_spacing?: number;
  target_pages?: number;
}

interface McpResponse {
  content: { type: "text"; text: string }[];
  isError?: true;
}

function mcpError(message: string): McpResponse {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}

function mcpResult(data: object): McpResponse {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function spacingLabel(spacing: number): string {
  if (spacing === 1) return "single spaced";
  if (spacing === 1.5) return "1.5 spaced";
  if (spacing === 2) return "double spaced";
  return `${spacing}x spaced`;
}

function paperLabel(paper: PaperSize | string): string {
  const labels: Record<string, string> = { letter: "US Letter", a4: "A4", legal: "US Legal" };
  return labels[paper] || paper;
}

export async function handlePageCapacity(input: PageCapacityInput) {
  const { preset = "resume", paper, font, font_size, margins, line_spacing, target_pages = 1 } = input;

  if (target_pages < 1 || !Number.isInteger(target_pages)) {
    return mcpError("Error: target_pages must be a positive integer.");
  }

  if (font && !(font in FONT_METRICS)) {
    const supported = Object.keys(FONT_METRICS).join(", ");
    return mcpError(`Error: unknown font '${font}'. Supported fonts: ${supported}.`);
  }

  if (font_size !== undefined && (font_size < 1 || font_size > 72)) {
    return mcpError("Error: font_size must be between 1 and 72.");
  }

  const format = resolveFormat(preset, {
    paper,
    font: font as FontName | undefined,
    font_size,
    margins,
    line_spacing,
  });

  const effectiveWidth = format.paper.width - (format.margins.left + format.margins.right) * POINTS_PER_INCH;
  const effectiveHeight = format.paper.height - (format.margins.top + format.margins.bottom) * POINTS_PER_INCH;

  if (effectiveWidth <= 0 || effectiveHeight <= 0) {
    return mcpError("Error: margins exceed page dimensions. Effective text area must be positive.");
  }

  const metrics = calculatePageMetrics(format);
  const maxChars = metrics.charsPerPage * target_pages;
  const maxWords = Math.floor(maxChars / CHARS_PER_WORD);
  const maxLines = metrics.linesPerPage * target_pages;

  const paperName = paper ?? (preset === "a4-essay" ? "a4" : "letter");
  const summary = `${paperLabel(paperName)}, ${format.font} ${format.fontSize}pt, ${format.margins.top}in margins, ${spacingLabel(format.lineSpacing)}`;

  return mcpResult({
    target_pages,
    max_characters: maxChars,
    max_words: maxWords,
    max_lines: maxLines,
    format_summary: summary,
  });
}
