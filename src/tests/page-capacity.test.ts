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

  it("returns error for invalid font", async () => {
    const result = await handlePageCapacity({ preset: "resume", font: "comic-sans", target_pages: 1 });
    assert.strictEqual(result.isError, true);
  });

  it("returns error for invalid font_size", async () => {
    const result = await handlePageCapacity({ preset: "resume", font_size: 0, target_pages: 1 });
    assert.strictEqual(result.isError, true);
  });
});
