import type { PresetName, FontName, PaperSize, Margins } from "../types.js";
import { resolveFormat } from "../engine/presets.js";
import { measureText } from "../engine/calculator.js";
import { FONT_METRICS } from "../engine/fonts.js";
import { POINTS_PER_INCH } from "../types.js";

interface MeasureTextInput {
  text: string;
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

export async function handleMeasureText(input: MeasureTextInput) {
  const { text, preset = "resume", paper, font, font_size, margins, line_spacing, target_pages = 1 } = input;

  if (!text || text.trim().length === 0) {
    return mcpError("Error: text cannot be empty.");
  }

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

  const result = measureText(text, format, target_pages);
  return mcpResult(result);
}
