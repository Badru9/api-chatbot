const pdfParse = require("pdf-parse");

interface PdfPageText {
  pageNumber: number;
  text: string;
}

export async function parsePdfPages(data: Buffer): Promise<PdfPageText[]> {
  const result = await pdfParse(data);

  const fullText = result.text ?? "";
  if (!fullText.trim()) {
    return [];
  }

  return [{ pageNumber: 1, text: fullText }];
}
