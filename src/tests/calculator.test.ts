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
