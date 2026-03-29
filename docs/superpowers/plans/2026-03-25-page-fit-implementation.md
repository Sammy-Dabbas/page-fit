# page-fit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an MCP server that gives LLMs awareness of physical page dimensions via three tools: measure_text, page_capacity, and measure_file.

**Architecture:** TypeScript MCP server using stdio transport. Formula-based page estimation using font metrics and page geometry. Published to npm, runnable via npx.

**Tech Stack:** TypeScript, @modelcontextprotocol/sdk, zod, pdf-parse, node:test for testing.

**Spec:** `docs/superpowers/specs/2026-03-25-page-fit-design.md`

---

## File Structure

```
page-fit/
  src/
    index.ts              # MCP server init, tool registration, stdio transport
    tools/
      measure-text.ts     # measure_text tool handler
      page-capacity.ts    # page_capacity tool handler
      measure-file.ts     # measure_file tool handler
    engine/
      calculator.ts       # calculatePageMetrics(text, format) -> PageMetrics
      fonts.ts            # FONT_METRICS constant, getFontWidth(name, size)
      presets.ts          # PRESETS constant, resolveFormat(preset, overrides)
      pdf.ts              # getPdfPageCount(filePath) -> number
    types.ts              # PageFormat, PageMetrics, Preset, MeasureResult
  src/tests/
    calculator.test.ts
    fonts.test.ts
    presets.test.ts
    measure-text.test.ts
    page-capacity.test.ts
    measure-file.test.ts
  package.json
  tsconfig.json
  LICENSE
  README.md
  .gitignore
```

---

### Task 1: Project scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `LICENSE`

- [ ] **Step 1: Initialize git repo**

Run: `cd ~/Desktop/page-fit && git init`

- [ ] **Step 2: Create package.json**

```json
{
  "name": "page-fit",
  "version": "0.1.0",
  "description": "MCP server that gives LLMs awareness of physical page dimensions",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "page-fit": "./dist/index.js"
  },
  "engines": {
    "node": ">=18"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "start": "node dist/index.js",
    "test": "node --test dist/tests/*.test.js",
    "postbuild": "node -e \"const fs=require('fs');const f='dist/index.js';const c=fs.readFileSync(f,'utf8');if(!c.startsWith('#!'))fs.writeFileSync(f,'#!/usr/bin/env node\\n'+c)\"",
    "prepublishOnly": "npm run build"
  },
  "keywords": ["mcp", "page", "document", "formatting", "llm", "claude", "cursor"],
  "author": "Sammy-Dabbas",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/Sammy-Dabbas/page-fit"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.12.0",
    "pdf-parse": "^1.1.1",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create .gitignore**

```
node_modules/
dist/
.DS_Store
```

- [ ] **Step 5: Create LICENSE**

MIT license, 2026, Sammy Dabbas.

- [ ] **Step 6: Install dependencies**

Run: `cd ~/Desktop/page-fit && npm install`

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json .gitignore LICENSE
git commit -m "init: project scaffolding"
```

---

### Task 2: Types (types.ts)

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Create types**

```typescript
export type PaperSize = "letter" | "a4" | "legal";
export type FontName = "times-new-roman" | "arial" | "calibri" | "courier" | "garamond" | "georgia" | "helvetica";
export type PresetName = "resume" | "letter" | "a4-essay" | "custom";

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

export interface FileResult {
  file: string;
  pages: number;
  format: string;
}

export const CHARS_PER_WORD = 6;
export const POINTS_PER_INCH = 72;
export const MAX_FILE_SIZE = 50 * 1024 * 1024;
```

- [ ] **Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: shared types and constants"
```

---

### Task 3: Font metrics (TDD)

**Files:**
- Create: `src/engine/fonts.ts`
- Create: `src/tests/fonts.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { FONT_METRICS, getFontWidth, isMonospace } from "../engine/fonts.js";

describe("fonts", () => {
  it("has metrics for all supported fonts", () => {
    const expected = ["times-new-roman", "arial", "calibri", "courier", "garamond", "georgia", "helvetica"];
    for (const font of expected) {
      assert.ok(FONT_METRICS[font as keyof typeof FONT_METRICS], `missing metrics for ${font}`);
    }
  });

  it("returns scaled width for a font at a given size", () => {
    const width = getFontWidth("calibri", 10.5);
    assert.ok(width > 0);
    assert.strictEqual(width, 4.58 * 10.5);
  });

  it("identifies courier as monospace", () => {
    assert.strictEqual(isMonospace("courier"), true);
    assert.strictEqual(isMonospace("arial"), false);
  });

  it("throws for unknown font", () => {
    assert.throws(() => getFontWidth("comic-sans" as any, 12));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ~/Desktop/page-fit && npm run build && node --test dist/tests/fonts.test.js`
Expected: FAIL

- [ ] **Step 3: Implement fonts.ts**

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run build && node --test dist/tests/fonts.test.js`
Expected: All 4 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/engine/fonts.ts src/tests/fonts.test.ts
git commit -m "feat: font metrics with width scaling"
```

---

### Task 4: Presets (TDD)

**Files:**
- Create: `src/engine/presets.ts`
- Create: `src/tests/presets.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PRESETS, PAPER_SIZES, resolveFormat } from "../engine/presets.js";

describe("presets", () => {
  it("has all three presets defined", () => {
    assert.ok(PRESETS.resume);
    assert.ok(PRESETS.letter);
    assert.ok(PRESETS["a4-essay"]);
  });

  it("has all paper sizes defined", () => {
    assert.ok(PAPER_SIZES.letter);
    assert.ok(PAPER_SIZES.a4);
    assert.ok(PAPER_SIZES.legal);
  });

  it("resolves a preset with no overrides", () => {
    const format = resolveFormat("resume", {});
    assert.strictEqual(format.font, "calibri");
    assert.strictEqual(format.fontSize, 10.5);
    assert.strictEqual(format.lineSpacing, 1.0);
    assert.strictEqual(format.margins.top, 0.75);
  });

  it("applies overrides to a preset", () => {
    const format = resolveFormat("resume", { font: "arial", font_size: 12 });
    assert.strictEqual(format.font, "arial");
    assert.strictEqual(format.fontSize, 12);
    assert.strictEqual(format.margins.top, 0.75);
  });

  it("custom preset falls back to letter defaults", () => {
    const format = resolveFormat("custom", {});
    assert.strictEqual(format.font, "times-new-roman");
    assert.strictEqual(format.fontSize, 12);
    assert.deepStrictEqual(format.paper, PAPER_SIZES.letter);
  });

  it("custom preset accepts paper size override", () => {
    const format = resolveFormat("custom", { paper: "a4" });
    assert.deepStrictEqual(format.paper, PAPER_SIZES.a4);
  });

  it("a4-essay uses A4 paper", () => {
    const format = resolveFormat("a4-essay", {});
    assert.strictEqual(format.paper.width, 595);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement presets.ts**

```typescript
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

const PRESET_DEFS: Record<"resume" | "letter" | "a4-essay", PresetDef> = {
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
```

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add src/engine/presets.ts src/tests/presets.test.ts
git commit -m "feat: document presets with format resolution"
```

---

### Task 5: Calculator (TDD)

**Files:**
- Create: `src/engine/calculator.ts`
- Create: `tests/calculator.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculatePageMetrics, measureText } from "../engine/calculator.js";
import { resolveFormat } from "../engine/presets.js";

describe("calculatePageMetrics", () => {
  it("calculates metrics for resume preset", () => {
    const format = resolveFormat("resume", {});
    const metrics = calculatePageMetrics(format);
    assert.ok(metrics.charsPerLine > 0);
    assert.ok(metrics.linesPerPage > 0);
    assert.ok(metrics.charsPerPage > 0);
  });

  it("double spacing halves lines per page", () => {
    const single = resolveFormat("letter", {});
    const double = resolveFormat("letter", { line_spacing: 2 });
    const singleMetrics = calculatePageMetrics(single);
    const doubleMetrics = calculatePageMetrics(double);
    assert.ok(doubleMetrics.linesPerPage < singleMetrics.linesPerPage);
    assert.ok(Math.abs(doubleMetrics.linesPerPage - singleMetrics.linesPerPage / 2) <= 1);
  });

  it("courier uses 0.98 correction factor", () => {
    const format = resolveFormat("custom", { font: "courier", font_size: 12 });
    const metrics = calculatePageMetrics(format);
    const rawChars = metrics.charsPerLine * metrics.linesPerPage;
    assert.ok(metrics.charsPerPage > rawChars * 0.97);
  });

  it("proportional fonts use 0.90 correction factor", () => {
    const format = resolveFormat("custom", { font: "arial", font_size: 12 });
    const metrics = calculatePageMetrics(format);
    const rawChars = metrics.charsPerLine * metrics.linesPerPage;
    const expected = Math.floor(rawChars * 0.90);
    assert.strictEqual(metrics.charsPerPage, expected);
  });
});

describe("measureText", () => {
  it("returns fits:true when text is under capacity", () => {
    const result = measureText("Hello world", resolveFormat("resume", {}), 1);
    assert.strictEqual(result.fits, true);
    assert.ok("characters_remaining" in result);
  });

  it("returns fits:false when text exceeds capacity", () => {
    const longText = "a".repeat(10000);
    const result = measureText(longText, resolveFormat("resume", {}), 1);
    assert.strictEqual(result.fits, false);
    assert.ok("characters_over" in result);
  });

  it("counts newlines as consuming full lines", () => {
    const withNewlines = "line1\nline2\nline3";
    const without = "line1line2line3";
    const format = resolveFormat("resume", {});
    const r1 = measureText(withNewlines, format, 1);
    const r2 = measureText(without, format, 1);
    assert.ok(r1.pages > r2.pages);
  });

  it("includes suggestion text", () => {
    const result = measureText("Hello", resolveFormat("resume", {}), 1);
    assert.ok(result.suggestion.length > 0);
  });

  it("calculates words using chars/6", () => {
    const text = "a".repeat(600);
    const result = measureText(text, resolveFormat("resume", {}), 1);
    assert.strictEqual(result.words, 100);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement calculator.ts**

```typescript
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
  const words = Math.floor(textLength / CHARS_PER_WORD);
  const percentageFull = Math.round((textLength / totalCapacity) * 100);

  if (textLength <= totalCapacity) {
    const remaining = totalCapacity - textLength;
    return {
      pages,
      target_pages: targetPages,
      fits: true,
      characters: textLength,
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
    characters: textLength,
    characters_per_page: metrics.charsPerPage,
    characters_over: over,
    words,
    percentage_full: percentageFull,
    suggestion: `Remove approximately ${over} characters (about ${Math.floor(over / CHARS_PER_WORD)} words) to fit on ${targetPages} page${targetPages > 1 ? "s" : ""}.`,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add src/engine/calculator.ts tests/calculator.test.ts
git commit -m "feat: page calculator with metrics and measurement"
```

---

### Task 6: PDF reader (TDD)

**Files:**
- Create: `src/engine/pdf.ts`
- Create: `src/tests/measure-file.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { getPdfPageCount } from "../engine/pdf.js";

describe("getPdfPageCount", () => {
  it("throws for non-existent file", async () => {
    await assert.rejects(() => getPdfPageCount("/nonexistent/file.pdf"), /not found/);
  });

  it("throws for non-pdf extension", async () => {
    const tmp = path.join(os.tmpdir(), "test.docx");
    fs.writeFileSync(tmp, "fake");
    try {
      await assert.rejects(() => getPdfPageCount(tmp), /unsupported/i);
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  it("throws for files over 50MB", async () => {
    const tmp = path.join(os.tmpdir(), "big.pdf");
    fs.writeFileSync(tmp, Buffer.alloc(51 * 1024 * 1024));
    try {
      await assert.rejects(() => getPdfPageCount(tmp), /50MB/);
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  it("throws for directory path", async () => {
    await assert.rejects(() => getPdfPageCount(os.tmpdir()), /not found|directory/i);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement pdf.ts**

```typescript
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { MAX_FILE_SIZE } from "../types.js";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

export async function getPdfPageCount(filePath: string): Promise<number> {
  const ext = path.extname(filePath).toLowerCase();
  if (ext !== ".pdf") {
    throw new Error(`unsupported file format '${ext}'. Only PDF is supported in v1.`);
  }

  let stat: fs.Stats;
  try {
    stat = fs.statSync(filePath);
  } catch {
    throw new Error(`file not found at '${filePath}'.`);
  }

  if (stat.isDirectory()) {
    throw new Error(`file not found at '${filePath}'.`);
  }

  if (stat.size > MAX_FILE_SIZE) {
    throw new Error("file exceeds 50MB limit.");
  }

  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return data.numpages;
}
```

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add src/engine/pdf.ts src/tests/measure-file.test.ts
git commit -m "feat: PDF page count reader"
```

---

### Task 7: MCP tool handlers

**Files:**
- Create: `src/tools/measure-text.ts`
- Create: `src/tools/page-capacity.ts`
- Create: `src/tools/measure-file.ts`
- Create: `src/tests/measure-text.test.ts`
- Create: `src/tests/page-capacity.test.ts`

- [ ] **Step 1: Write measure-text tool handler tests**

```typescript
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { handleMeasureText } from "../tools/measure-text.js";

describe("handleMeasureText", () => {
  it("returns fits result for short text", async () => {
    const result = await handleMeasureText({ text: "Hello world", preset: "resume", target_pages: 1 });
    assert.strictEqual(result.isError, undefined);
    const data = JSON.parse(result.content[0].text);
    assert.strictEqual(data.fits, true);
  });

  it("returns error for empty text", async () => {
    const result = await handleMeasureText({ text: "", preset: "resume", target_pages: 1 });
    assert.strictEqual(result.isError, true);
  });

  it("returns error for whitespace-only text", async () => {
    const result = await handleMeasureText({ text: "   \n\t  ", preset: "resume", target_pages: 1 });
    assert.strictEqual(result.isError, true);
  });

  it("returns error for invalid font", async () => {
    const result = await handleMeasureText({ text: "Hello", preset: "resume", font: "comic-sans", target_pages: 1 });
    assert.strictEqual(result.isError, true);
  });

  it("returns error for margins exceeding page size", async () => {
    const result = await handleMeasureText({
      text: "Hello",
      preset: "custom",
      margins: { top: 6, bottom: 6, left: 1, right: 1 },
      target_pages: 1,
    });
    assert.strictEqual(result.isError, true);
  });

  it("returns error for target_pages < 1", async () => {
    const result = await handleMeasureText({ text: "Hello", preset: "resume", target_pages: 0 });
    assert.strictEqual(result.isError, true);
  });

  it("accepts custom preset with overrides", async () => {
    const result = await handleMeasureText({
      text: "Hello",
      preset: "custom",
      paper: "a4",
      font: "arial",
      font_size: 14,
      line_spacing: 1.5,
      target_pages: 1,
    });
    assert.strictEqual(result.isError, undefined);
  });
});
```

- [ ] **Step 2: Write page-capacity tool handler tests**

```typescript
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { handlePageCapacity } from "../tools/page-capacity.js";

describe("handlePageCapacity", () => {
  it("returns capacity for resume preset", async () => {
    const result = await handlePageCapacity({ preset: "resume", target_pages: 1 });
    assert.strictEqual(result.isError, undefined);
    const data = JSON.parse(result.content[0].text);
    assert.ok(data.max_characters > 0);
    assert.ok(data.max_words > 0);
    assert.ok(data.max_lines > 0);
    assert.ok(data.format_summary.length > 0);
  });

  it("scales capacity for multiple pages", async () => {
    const r1 = await handlePageCapacity({ preset: "resume", target_pages: 1 });
    const r2 = await handlePageCapacity({ preset: "resume", target_pages: 2 });
    const d1 = JSON.parse(r1.content[0].text);
    const d2 = JSON.parse(r2.content[0].text);
    assert.strictEqual(d2.max_characters, d1.max_characters * 2);
    assert.strictEqual(d2.max_lines, d1.max_lines * 2);
  });

  it("returns error for invalid target_pages", async () => {
    const result = await handlePageCapacity({ preset: "resume", target_pages: -1 });
    assert.strictEqual(result.isError, true);
  });
});
```

- [ ] **Step 3: Implement measure-text.ts**

```typescript
import type { PresetName, FontName, PaperSize, Margins } from "../types.js";
import { resolveFormat } from "../engine/presets.js";
import { measureText } from "../engine/calculator.js";
import { FONT_METRICS } from "../engine/fonts.js";
import { PAPER_SIZES } from "../engine/presets.js";
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

function mcpError(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}

function mcpResult(data: object) {
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
```

- [ ] **Step 4: Implement page-capacity.ts**

```typescript
import type { PresetName, FontName, PaperSize, Margins } from "../types.js";
import { resolveFormat, PAPER_SIZES } from "../engine/presets.js";
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

function mcpError(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}

function mcpResult(data: object) {
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
```

- [ ] **Step 5: Implement measure-file.ts**

```typescript
import { getPdfPageCount } from "../engine/pdf.js";

interface MeasureFileInput {
  file_path: string;
}

function mcpError(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}

function mcpResult(data: object) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

export async function handleMeasureFile(input: MeasureFileInput) {
  try {
    const pages = await getPdfPageCount(input.file_path);
    return mcpResult({
      file: input.file_path,
      pages,
      format: "pdf",
    });
  } catch (err: any) {
    return mcpError(`Error: ${err.message}`);
  }
}
```

- [ ] **Step 6: Run all tests**

Run: `npm run build && npm test`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add src/tools/ src/tests/measure-text.test.ts src/tests/page-capacity.test.ts
git commit -m "feat: MCP tool handlers with validation"
```

---

### Task 8: MCP server entry point

**Files:**
- Create: `src/index.ts`

- [ ] **Step 1: Create the server**

```typescript
#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { handleMeasureText } from "./tools/measure-text.js";
import { handlePageCapacity } from "./tools/page-capacity.js";
import { handleMeasureFile } from "./tools/measure-file.js";

const server = new McpServer({
  name: "page-fit",
  version: "0.1.0",
});

const marginsSchema = z.object({
  top: z.number().min(0),
  bottom: z.number().min(0),
  left: z.number().min(0),
  right: z.number().min(0),
}).optional();

const presetSchema = z.enum(["resume", "letter", "a4-essay", "custom"]).default("resume");
const paperSchema = z.enum(["letter", "a4", "legal"]).optional();
const fontSchema = z.string().optional();

server.tool(
  "measure_text",
  {
    title: "Measure Text",
    description: "Measure how many pages text content will occupy given document formatting. Returns page count, whether it fits the target, and how many characters to add or remove.",
    annotations: { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
  },
  {
    text: z.string().min(1).describe("The text content to measure"),
    preset: presetSchema.describe("Document format preset"),
    paper: paperSchema.describe("Paper size override"),
    font: fontSchema.describe("Font name override"),
    font_size: z.number().min(1).max(72).optional().describe("Font size in points"),
    margins: marginsSchema.describe("Margins in inches { top, bottom, left, right }"),
    line_spacing: z.number().positive().optional().describe("Line spacing multiplier (1, 1.15, 1.5, 2)"),
    target_pages: z.number().int().min(1).default(1).describe("Target page count"),
  },
  async (input) => handleMeasureText(input)
);

server.tool(
  "page_capacity",
  {
    title: "Page Capacity",
    description: "Calculate how many characters, words, and lines fit on a given number of pages with specific formatting. Use before writing to know your budget.",
    annotations: { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
  },
  {
    preset: presetSchema.describe("Document format preset"),
    paper: paperSchema.describe("Paper size override"),
    font: fontSchema.describe("Font name override"),
    font_size: z.number().min(1).max(72).optional().describe("Font size in points"),
    margins: marginsSchema.describe("Margins in inches { top, bottom, left, right }"),
    line_spacing: z.number().positive().optional().describe("Line spacing multiplier"),
    target_pages: z.number().int().min(1).default(1).describe("Number of pages to calculate capacity for"),
  },
  async (input) => handlePageCapacity(input)
);

server.tool(
  "measure_file",
  {
    title: "Measure File",
    description: "Get the page count of an existing PDF file.",
    annotations: { readOnlyHint: true, idempotentHint: true, destructiveHint: false },
  },
  {
    file_path: z.string().min(1).describe("Absolute path to the PDF file"),
  },
  async (input) => handleMeasureFile(input)
);

const transport = new StdioServerTransport();
await server.connect(transport);
```

- [ ] **Step 2: Build and verify**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Verify shebang was added by postbuild script**

Run: `head -1 dist/index.js`
Expected: `#!/usr/bin/env node`

The `postbuild` script in package.json automatically prepends the shebang after `tsc` runs.

- [ ] **Step 5: Test the server starts**

Run: `echo '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}},"id":1}' | node dist/index.js`
Expected: JSON response with server capabilities

- [ ] **Step 6: Run full test suite**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add src/index.ts package.json
git commit -m "feat: MCP server with all three tools"
```

---

### Task 9: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write README**

Cover: what it does, install commands for Claude Code (with Windows variant), Cursor, VS Code, the three tools with input/output examples, presets table, supported fonts, configuration, license.

No emojis, no m-dashes, no AI attribution.

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README"
```

---

### Task 10: Smoke test

- [ ] **Step 1: Run full test suite**

Run: `cd ~/Desktop/page-fit && npm test`
Expected: All tests pass

- [ ] **Step 2: Test with MCP inspector**

Run: `npx @modelcontextprotocol/inspector node dist/index.js`
Expected: Web UI opens, shows three tools, can call each one

- [ ] **Step 3: Install in Claude Code**

Run: `claude mcp add --transport stdio page-fit -- cmd /c node C:\Users\sammy\Desktop\page-fit\dist\index.js`

Open a new Claude Code session, ask: "How many characters can I fit on a one-page resume?"
Expected: Claude calls `page_capacity` and gives a precise answer.

- [ ] **Step 4: Tag v0.1.0**

```bash
git tag v0.1.0
```
