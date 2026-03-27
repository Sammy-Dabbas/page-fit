# page-fit

An MCP server that gives LLMs awareness of physical page dimensions. It calculates how much text fits on a page given a font, font size, margins, line spacing, and paper size, so an LLM can write content that lands on a target page count without trial and error.

## Install

### Claude Code

```bash
claude mcp add page-fit -- npx page-fit
```

On Windows, use:

```bash
claude mcp add page-fit -- cmd /c npx page-fit
```

### Cursor

Open `~/.cursor/mcp.json` and add:

```json
{
  "mcpServers": {
    "page-fit": {
      "command": "npx",
      "args": ["page-fit"]
    }
  }
}
```

### VS Code

Open your User Settings JSON and add:

```json
{
  "mcp": {
    "servers": {
      "page-fit": {
        "command": "npx",
        "args": ["page-fit"]
      }
    }
  }
}
```

## Tools

### measure_text

Measure how many pages text content will occupy given document formatting. Returns page count, whether it fits the target, and how many characters to add or remove.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `text` | string | yes | The text content to measure |
| `preset` | string | no | Document format preset (default: `"resume"`) |
| `paper` | string | no | Paper size override (`"letter"`, `"a4"`, `"legal"`) |
| `font` | string | no | Font name (see supported fonts below) |
| `font_size` | number | no | Font size in points (1-72) |
| `margins` | object | no | Margins in inches `{ top, bottom, left, right }` |
| `line_spacing` | number | no | Line spacing multiplier (e.g. 1, 1.15, 1.5, 2) |
| `target_pages` | integer | no | Target page count (default: 1) |

**Example output (fits):**

```json
{
  "pages": 0.72,
  "target_pages": 1,
  "fits": true,
  "characters": 1850,
  "characters_per_page": 2890,
  "characters_remaining": 724,
  "words": 308,
  "percentage_full": 72,
  "suggestion": "You have room for approximately 724 more characters (about 120 words)."
}
```

**Example output (overflow):**

```json
{
  "pages": 1.35,
  "target_pages": 1,
  "fits": false,
  "characters": 3900,
  "characters_per_page": 2890,
  "characters_over": 1010,
  "words": 650,
  "percentage_full": 135,
  "suggestion": "Remove approximately 1010 characters (about 168 words) to fit on 1 page."
}
```

### page_capacity

Calculate how many characters, words, and lines fit on a given number of pages with specific formatting. Use before writing to know your budget.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `preset` | string | no | Document format preset (default: `"resume"`) |
| `paper` | string | no | Paper size override (`"letter"`, `"a4"`, `"legal"`) |
| `font` | string | no | Font name (see supported fonts below) |
| `font_size` | number | no | Font size in points (1-72) |
| `margins` | object | no | Margins in inches `{ top, bottom, left, right }` |
| `line_spacing` | number | no | Line spacing multiplier |
| `target_pages` | integer | no | Number of pages (default: 1) |

**Example output:**

```json
{
  "target_pages": 1,
  "max_characters": 2890,
  "max_words": 481,
  "max_lines": 51,
  "format_summary": "US Letter, calibri 10.5pt, 0.75in margins, single spaced"
}
```

## Presets

| Preset | Paper | Font | Size | Margins | Line Spacing |
|--------|-------|------|------|---------|--------------|
| `resume` | US Letter | Calibri | 10.5pt | 0.75in | Single |
| `letter` | US Letter | Times New Roman | 12pt | 1.0in | Single |
| `a4-essay` | A4 | Times New Roman | 12pt | 1.0in | Double |
| `report` | US Letter | Times New Roman | 12pt | 1.0in | 1.5x |
| `manuscript` | US Letter | Courier | 12pt | 1.0in | Double |
| `thesis` | US Letter | Times New Roman | 12pt | 1.5in left, 1.0in others | Double |
| `memo` | US Letter | Arial | 11pt | 1.0in | 1.15x |

## Supported Fonts

- Times New Roman (`times-new-roman`)
- Arial (`arial`)
- Calibri (`calibri`)
- Courier (`courier`)
- Garamond (`garamond`)
- Georgia (`georgia`)
- Helvetica (`helvetica`)

## Custom Formatting

Set `preset` to `"custom"` and provide your own overrides. The custom preset starts from the `letter` defaults, then applies any overrides you specify.

```json
{
  "preset": "custom",
  "paper": "a4",
  "font": "garamond",
  "font_size": 11,
  "margins": { "top": 1.25, "bottom": 1.25, "left": 1, "right": 1 },
  "line_spacing": 1.5,
  "target_pages": 2
}
```

You can also override individual fields on a named preset:

```json
{
  "preset": "resume",
  "font_size": 11,
  "line_spacing": 1.15
}
```

## License

MIT
