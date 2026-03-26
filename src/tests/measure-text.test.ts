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
