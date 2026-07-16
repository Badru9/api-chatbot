declare module "pdf-parse" {
  interface PDFResult {
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: unknown;
    version: string;
    text: string;
  }

  function pdfParse(
    data: Buffer,
    options?: Record<string, unknown>
  ): Promise<PDFResult>;

  export default pdfParse;
}
