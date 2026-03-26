export type PaperSize = "letter" | "a4" | "legal";
export type FontName = "times-new-roman" | "arial" | "calibri" | "courier" | "garamond" | "georgia" | "helvetica";
export type PresetName = "resume" | "letter" | "a4-essay" | "report" | "manuscript" | "thesis" | "memo" | "custom";

export interface Margins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface PaperDimensions {
  width: number;
  height: number;
}

export interface PageFormat {
  paper: PaperDimensions;
  font: FontName;
  fontSize: number;
  margins: Margins;
  lineSpacing: number;
}

export interface PageMetrics {
  charsPerLine: number;
  linesPerPage: number;
  charsPerPage: number;
}

export interface MeasureResultFits {
  pages: number;
  target_pages: number;
  fits: true;
  characters: number;
  characters_per_page: number;
  characters_remaining: number;
  words: number;
  percentage_full: number;
  suggestion: string;
}

export interface MeasureResultOverflow {
  pages: number;
  target_pages: number;
  fits: false;
  characters: number;
  characters_per_page: number;
  characters_over: number;
  words: number;
  percentage_full: number;
  suggestion: string;
}

export type MeasureResult = MeasureResultFits | MeasureResultOverflow;

export interface CapacityResult {
  target_pages: number;
  max_characters: number;
  max_words: number;
  max_lines: number;
  format_summary: string;
}

export const CHARS_PER_WORD = 6;
export const POINTS_PER_INCH = 72;
