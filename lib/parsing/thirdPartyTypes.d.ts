// Minimal ambient types for the two file-parsing packages used by
// lib/parsing/extractText.ts. Neither `pdf-parse` nor `mammoth` ships its own
// TypeScript types, and pulling in `@types/pdf-parse` just for two optional
// fields felt like unnecessary extra surface for a sandbox that can't reach
// the npm registry to verify it installs cleanly anyway — this covers
// exactly the shape extractText.ts actually uses.

declare module "pdf-parse" {
  interface PdfParseResult {
    text: string;
    numpages?: number;
    numrender?: number;
    info?: Record<string, unknown>;
    metadata?: unknown;
    version?: string;
  }
  function pdfParse(dataBuffer: Buffer, options?: Record<string, unknown>): Promise<PdfParseResult>;
  export default pdfParse;
}

declare module "mammoth" {
  interface ExtractRawTextResult {
    value: string;
    messages: Array<{ type: string; message: string }>;
  }
  interface ConvertToHtmlResult {
    value: string;
    messages: Array<{ type: string; message: string }>;
  }
  export function extractRawText(input: { buffer: Buffer } | { path: string }): Promise<ExtractRawTextResult>;
  export function convertToHtml(input: { buffer: Buffer } | { path: string }): Promise<ConvertToHtmlResult>;
}
