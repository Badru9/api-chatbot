import { PDFParse } from "pdf-parse";

import type { PdfPageText } from "../types/index.js";

export async function parsePdfPages(data: Buffer): Promise<PdfPageText[]> {
  const parser = new PDFParse({ data });

  try {
    const info = await parser.getInfo();
    const totalPages = info.total ?? 0;

    if (totalPages === 0) {
      const result = await parser.getText();
      return [{ pageNumber: 1, text: result.text }];
    }

    const pages: PdfPageText[] = [];

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
      const result = await parser.getText({ partial: [pageNumber] });
      pages.push({ pageNumber, text: result.text });
    }

    return pages.filter((page) => page.text.trim().length > 0);
  } finally {
    await parser.destroy();
  }
}
