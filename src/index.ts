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
  "Measure how many pages text content will occupy given document formatting. Returns page count, whether it fits the target, and how many characters to add or remove.",
  {
    text: z.string().min(1).describe("The text content to measure"),
    preset: presetSchema.describe("Document format preset"),
    paper: paperSchema.describe("Paper size override"),
    font: fontSchema.describe("Font name (times-new-roman, arial, calibri, courier, garamond, georgia, helvetica)"),
    font_size: z.number().optional().describe("Font size in points (1-72)"),
    margins: marginsSchema.describe("Margins in inches { top, bottom, left, right }"),
    line_spacing: z.number().positive().optional().describe("Line spacing multiplier (1, 1.15, 1.5, 2)"),
    target_pages: z.number().int().min(1).default(1).describe("Target page count"),
  },
  async (input) => handleMeasureText(input) as any
);

server.tool(
  "page_capacity",
  "Calculate how many characters, words, and lines fit on a given number of pages with specific formatting. Use before writing to know your budget.",
  {
    preset: presetSchema.describe("Document format preset"),
    paper: paperSchema.describe("Paper size override"),
    font: fontSchema.describe("Font name (times-new-roman, arial, calibri, courier, garamond, georgia, helvetica)"),
    font_size: z.number().optional().describe("Font size in points (1-72)"),
    margins: marginsSchema.describe("Margins in inches { top, bottom, left, right }"),
    line_spacing: z.number().positive().optional().describe("Line spacing multiplier"),
    target_pages: z.number().int().min(1).default(1).describe("Number of pages to calculate capacity for"),
  },
  async (input) => handlePageCapacity(input) as any
);

server.tool(
  "measure_file",
  "Get the page count of an existing PDF file.",
  {
    file_path: z.string().min(1).describe("Absolute path to the PDF file"),
  },
  async (input) => handleMeasureFile(input) as any
);

const transport = new StdioServerTransport();
await server.connect(transport);
