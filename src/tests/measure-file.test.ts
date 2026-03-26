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
