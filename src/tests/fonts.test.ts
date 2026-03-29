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
    assert.strictEqual(width, 0.458 * 10.5);
  });

  it("identifies courier as monospace", () => {
    assert.strictEqual(isMonospace("courier"), true);
    assert.strictEqual(isMonospace("arial"), false);
  });

  it("throws for unknown font", () => {
    assert.throws(() => getFontWidth("comic-sans" as any, 12));
  });
});
