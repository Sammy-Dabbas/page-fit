import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { MAX_FILE_SIZE } from "../types.js";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

export async function getPdfPageCount(filePath: string): Promise<number> {
  let stat: fs.Stats;
  try {
    stat = fs.statSync(filePath);
  } catch {
    throw new Error(`file not found at '${filePath}'.`);
  }

  if (stat.isDirectory()) {
    throw new Error(`file not found at '${filePath}'.`);
  }

  const ext = path.extname(filePath).toLowerCase();
  if (ext !== ".pdf") {
    throw new Error(`unsupported file format '${ext}'. Only PDF is supported in v1.`);
  }

  if (stat.size > MAX_FILE_SIZE) {
    throw new Error("file exceeds 50MB limit.");
  }

  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return data.numpages;
}
