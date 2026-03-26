import { getPdfPageCount } from "../engine/pdf.js";

interface MeasureFileInput {
  file_path: string;
}

interface McpResponse {
  content: { type: "text"; text: string }[];
  isError?: true;
}

function mcpError(message: string): McpResponse {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}

function mcpResult(data: object): McpResponse {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

export async function handleMeasureFile(input: MeasureFileInput) {
  try {
    const pages = await getPdfPageCount(input.file_path);
    return mcpResult({
      file: input.file_path,
      pages,
      format: "pdf",
    });
  } catch (err: any) {
    return mcpError(`Error: ${err.message}`);
  }
}
