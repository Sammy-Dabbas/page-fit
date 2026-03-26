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
