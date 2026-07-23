import { PDFParse } from "pdf-parse";

interface PdfPageText {
  pageNumber: number;
  text: string;
}

export async function parsePdfPages(data: Buffer): Promise<PdfPageText[]> {
  const parser = new PDFParse({ data });
  const result = await parser.getText();

  return result.pages.map((p) => ({
    pageNumber: p.num,
    text: p.text,
  }));
}
