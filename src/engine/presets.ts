import type { PageFormat, PaperSize, PaperDimensions, FontName, Margins, PresetName } from "../types.js";
import { POINTS_PER_INCH } from "../types.js";

export const PAPER_SIZES: Record<PaperSize, PaperDimensions> = {
  letter: { width: 612, height: 792 },
  a4: { width: 595, height: 842 },
  legal: { width: 612, height: 1008 },
};

interface PresetDef {
  paper: PaperSize;
  font: FontName;
  fontSize: number;
  margins: Margins;
  lineSpacing: number;
}

const PRESET_DEFS: Record<Exclude<PresetName, "custom">, PresetDef> = {
  resume: {
    paper: "letter",
    font: "calibri",
    fontSize: 10.5,
    margins: { top: 0.75, bottom: 0.75, left: 0.75, right: 0.75 },
    lineSpacing: 1.0,
  },
  letter: {
    paper: "letter",
    font: "times-new-roman",
    fontSize: 12,
    margins: { top: 1.0, bottom: 1.0, left: 1.0, right: 1.0 },
    lineSpacing: 1.0,
  },
  "a4-essay": {
    paper: "a4",
    font: "times-new-roman",
    fontSize: 12,
    margins: { top: 1.0, bottom: 1.0, left: 1.0, right: 1.0 },
    lineSpacing: 2.0,
  },
  report: {
    paper: "letter",
    font: "times-new-roman",
    fontSize: 12,
    margins: { top: 1.0, bottom: 1.0, left: 1.0, right: 1.0 },
    lineSpacing: 1.5,
  },
  manuscript: {
    paper: "letter",
    font: "courier",
    fontSize: 12,
    margins: { top: 1.0, bottom: 1.0, left: 1.0, right: 1.0 },
    lineSpacing: 2.0,
  },
  thesis: {
    paper: "letter",
    font: "times-new-roman",
    fontSize: 12,
    margins: { top: 1.0, bottom: 1.0, left: 1.5, right: 1.0 },
    lineSpacing: 2.0,
  },
  memo: {
    paper: "letter",
    font: "arial",
    fontSize: 11,
    margins: { top: 1.0, bottom: 1.0, left: 1.0, right: 1.0 },
    lineSpacing: 1.15,
  },
};

export const PRESETS = PRESET_DEFS;

interface FormatOverrides {
  paper?: PaperSize;
  font?: FontName;
  font_size?: number;
  margins?: Margins;
  line_spacing?: number;
}

export function resolveFormat(preset: PresetName, overrides: FormatOverrides): PageFormat {
  const base = preset === "custom" ? PRESET_DEFS.letter : PRESET_DEFS[preset];

  return {
    paper: PAPER_SIZES[overrides.paper ?? base.paper],
    font: overrides.font ?? base.font,
    fontSize: overrides.font_size ?? base.fontSize,
    margins: overrides.margins ?? base.margins,
    lineSpacing: overrides.line_spacing ?? base.lineSpacing,
  };
}
