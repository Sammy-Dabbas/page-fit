# page-fit Design Spec

## Overview

An MCP server that gives LLMs awareness of physical page dimensions. LLMs have no concept of how text renders on a printed page, so when asked to "keep this to one page," they guess. page-fit solves this by providing tools to measure text against real page formatting parameters and return precise metrics.

Install: `claude mcp add --transport stdio page-fit -- npx -y page-fit`

## Problem

LLMs cannot reason about physical page dimensions. They operate on tokens, not inches. This causes:

- Resumes that are "one page" but actually 1.5 pages when rendered
- Editing advice like "remove the last 3 sentences" when 1400 characters need to be cut
- No way to know capacity before writing ("how much can I fit on one page at 11pt Calibri?")
- PDF page counts require running shell commands

No MCP server exists that takes text + typography parameters and returns page metrics.

## Architecture

An MCP server using stdio transport, published to npm, runnable via npx. Three tools exposed over the Model Context Protocol.

```
page-fit/
  src/
    index.ts            # MCP server setup, tool registration
    tools/
      measure-text.ts   # measure_text tool
      page-capacity.ts  # page_capacity tool
      measure-file.ts   # measure_file tool (PDF)
    engine/
      calculator.ts     # Core page math
      fonts.ts          # Font metrics table (avg char widths)
      presets.ts        # Document format presets
      pdf.ts            # PDF page count reader
    types.ts            # Shared types
  tests/
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
```

### Dependencies

- `@modelcontextprotocol/sdk` -- MCP server framework
- `zod` -- input schema validation (required by MCP SDK)
- `pdf-parse` -- lightweight PDF page count extraction
- `typescript` -- dev only

No rendering engines, no headless browsers, no heavy dependencies.

## Tools

### measure_text

The primary tool. Takes text content and formatting parameters, returns page metrics.

Input:

- `text` (string, required): The text content to measure.
- `preset` (enum, default "resume"): One of "resume", "letter", "a4-essay", "custom".
- `paper` (enum, optional): One of "letter", "a4", "legal". Overrides preset paper size. Required when preset is "custom".
- `font` (string, optional): Font name override. Supported: "times-new-roman", "arial", "calibri", "courier", "garamond", "georgia", "helvetica".
- `font_size` (number, optional): Font size in points (1-72), overrides preset.
- `margins` (object, optional): `{ top, bottom, left, right }` in inches, overrides preset. Combined horizontal margins must be less than page width. Combined vertical margins must be less than page height.
- `line_spacing` (number, optional): Any positive number. Common values: 1, 1.15, 1.5, 2. Overrides preset.
- `target_pages` (positive integer, default 1): The target page count to measure against.

Output:

```json
{
  "pages": 1.4,
  "target_pages": 1,
  "fits": false,
  "characters": 4800,
  "characters_per_page": 3400,
  "characters_over": 1400,
  "words": 738,
  "percentage_full": 141,
  "suggestion": "Remove approximately 1400 characters (about 215 words) to fit on 1 page."
}
```

When the text fits:

```json
{
  "pages": 0.7,
  "target_pages": 1,
  "fits": true,
  "characters": 2380,
  "characters_per_page": 3400,
  "characters_remaining": 1020,
  "words": 366,
  "percentage_full": 70,
  "suggestion": "You have room for approximately 1020 more characters (about 157 words)."
}
```

### page_capacity

Returns how much content fits on N pages given format parameters. Useful before writing.

Input:

- `preset` (enum, default "resume"): One of "resume", "letter", "a4-essay", "custom".
- `target_pages` (positive integer, default 1): How many pages to calculate capacity for.
- `paper`, `font`, `font_size`, `margins`, `line_spacing` (optional overrides, same as measure_text).

Output:

```json
{
  "target_pages": 1,
  "max_characters": 3400,
  "max_words": 520,
  "max_lines": 52,
  "format_summary": "US Letter, Calibri 10.5pt, 0.75in margins, single spaced"
}
```

### measure_file

Takes a file path, returns the actual page count of the document. PDF only in v1.

Input:

- `file_path` (string, required): Absolute path to the file.

Output:

```json
{
  "file": "/path/to/resume.pdf",
  "pages": 2,
  "format": "pdf"
}
```

Returns an MCP error (`isError: true`) for unsupported formats, file not found, corrupted files, or files larger than 50MB. The error message is a plain string in the `content` array, not a JSON object.

## Presets

Built-in document format presets for common use cases.

| Preset | Paper | Font | Size | Margins | Spacing |
|--------|-------|------|------|---------|---------|
| resume | US Letter (8.5x11") | Calibri | 10.5pt | 0.75" all sides | 1.0 |
| letter | US Letter (8.5x11") | Times New Roman | 12pt | 1.0" all sides | 1.0 |
| a4-essay | A4 (8.27x11.69") | Times New Roman | 12pt | 1.0" all sides | 2.0 |

When `preset` is "custom", any fields not provided fall back to the "letter" preset defaults. The `paper` field defaults to "letter" for custom presets. For non-custom presets, any provided overrides replace just that field while keeping the rest of the preset.

### Paper Sizes

| Name | Width | Height |
|------|-------|--------|
| letter | 8.5" (612pt) | 11" (792pt) |
| a4 | 8.27" (595pt) | 11.69" (842pt) |
| legal | 8.5" (612pt) | 14" (1008pt) |

## Font Metrics

A built-in table of average character widths at 1pt for common fonts. The calculator scales these by the configured font_size at runtime.

| Font | Avg char width (pt at 1pt) |
|------|---------------------------|
| times-new-roman | 4.42 |
| arial | 4.78 |
| calibri | 4.58 |
| courier | 6.00 |
| garamond | 4.20 |
| georgia | 4.85 |
| helvetica | 4.78 |

These values are derived from standard font metric tables and represent the average width across all printable ASCII characters weighted by English letter frequency.

## Page Calculation Formula

The core math:

```
effective_width = page_width - left_margin - right_margin  (in points, 1 inch = 72pt)
effective_height = page_height - top_margin - bottom_margin (in points)

char_width = font_avg_char_width * font_size
line_height = font_size * line_spacing

chars_per_line = floor(effective_width / char_width)
lines_per_page = floor(effective_height / line_height)
chars_per_page = chars_per_line * lines_per_page

page_count = text_length / chars_per_page
```

### Text length calculation

`text_length` is the number of characters in the input including spaces. Newlines (`\n`) are counted as consuming one full line each (the remaining characters on that line are wasted). Whitespace-only input is treated as empty and returns an error.

Word count is derived from `text_length / 6` (average English word is 5 characters plus one space). This constant (6) is used consistently across all tools.

### Correction factor

A correction factor of 0.90 is applied to `chars_per_page` for proportional (variable-width) fonts to account for word-wrap waste. For monospace fonts (courier), the correction factor is 0.98 since character widths are uniform and word-wrap waste is minimal.

This produces ~85-90% accuracy compared to actual rendering. The inaccuracy comes from:
- Variable-width fonts (some chars wider/narrower than average)
- Word wrapping (lines rarely fill to exact capacity)
- Paragraph breaks consuming full lines

The line_height formula (`font_size * line_spacing`) matches how Word and Google Docs define line spacing.

### Multi-page calculation

For `page_capacity`, when `target_pages > 1`: `max_characters = chars_per_page * target_pages`, `max_lines = lines_per_page * target_pages`.

## Installation

### Claude Code

```bash
claude mcp add --transport stdio page-fit -- npx -y page-fit
```

Windows:

```bash
claude mcp add --transport stdio page-fit -- cmd /c npx -y page-fit
```

### Cursor

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "page-fit": {
      "command": "npx",
      "args": ["-y", "page-fit"]
    }
  }
}
```

### VS Code

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "page-fit": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "page-fit"]
    }
  }
}
```

## Output Types

The `measure_text` output uses a discriminated union on the `fits` field:

- When `fits: true`: includes `characters_remaining` (not `characters_over`)
- When `fits: false`: includes `characters_over` (not `characters_remaining`)

Both variants always include: `pages`, `target_pages`, `fits`, `characters`, `characters_per_page`, `words`, `percentage_full`, `suggestion`.

## Error Handling

All errors returned via `isError: true` in the MCP response content array as plain text strings, not thrown exceptions, not JSON objects. This lets the LLM read the error and self-correct.

Error cases:
- Empty or whitespace-only text in measure_text: "Error: text cannot be empty."
- Unknown font name: "Error: unknown font 'comic-sans'. Supported fonts: times-new-roman, arial, calibri, courier, garamond, georgia, helvetica."
- Invalid font_size (< 1 or > 72): "Error: font_size must be between 1 and 72."
- Invalid target_pages (< 1 or not an integer): "Error: target_pages must be a positive integer."
- Margins exceed page dimensions: "Error: margins exceed page dimensions. Effective text area must be positive."
- Unsupported file format in measure_file: "Error: unsupported file format '.docx'. Only PDF is supported in v1."
- File not found or path is a directory: "Error: file not found at '/path/to/file.pdf'."
- File too large (> 50MB): "Error: file exceeds 50MB limit."
- Corrupted PDF: "Error: could not read PDF file. The file may be corrupted or password-protected."

## Technical Constraints

- TypeScript, compiled to ES2022 with NodeNext module resolution.
- Minimum Node.js version: 18.
- The `dist/index.js` output must include a `#!/usr/bin/env node` shebang for npx execution.
- Package must include `"bin": { "page-fit": "./dist/index.js" }` in package.json.
- All tool handlers are async. Errors use `isError: true`, never thrown exceptions.
- PDF parsing uses `pdf-parse` which is lightweight (~50KB) and reads page count from the PDF structure without rendering. Since `pdf-parse` is CommonJS, import it via `createRequire` in the ESM codebase. File size is checked before reading (50MB limit).
- The `package.json` must include `"engines": { "node": ">=18" }`.
- Tool annotations: all tools are `readOnlyHint: true`, `idempotentHint: true`, `destructiveHint: false`.

## Testing

- Unit tests for calculator.ts (all preset calculations, custom parameters, edge cases)
- Unit tests for fonts.ts (all font metrics exist, scaling works correctly)
- Unit tests for presets.ts (all presets have valid values)
- Integration tests for each tool (correct output shape, error handling)
- Test with known text samples against pre-calculated expected page counts
- Manual smoke test: install in Claude Code, ask it to measure a resume

## Not in Scope (v1)

- DOCX page count (requires LibreOffice or commercial library)
- LaTeX page count (requires compilation)
- Markdown rendering to pages
- Custom font file loading
- Visual preview
- Paragraph/section-aware splitting
- Image/table space accounting
- Render-based measurement (Puppeteer/Chrome)

## License

MIT
