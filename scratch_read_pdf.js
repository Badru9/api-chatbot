import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

import fs from 'fs';

const pdfPath = 'd:/Badru/Projects/chatbot/thesis.pdf';
let dataBuffer = fs.readFileSync(pdfPath);

const parser = new PDFParse({ data: dataBuffer });
parser.getText().then(function(data) {
    const text = data.text;
    console.log("Total length parsed:", text.length);
    fs.writeFileSync('d:/Badru/Projects/chatbot/thesis_text.txt', text);
    console.log("Success writing text file!");
}).catch(err => {
    console.error("Error parsing:", err);
});
