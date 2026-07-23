const pdf = require('pdf-parse');
console.log("imported pdf keys:", Object.keys(pdf));
console.log("imported pdf type:", typeof pdf);
if (pdf.default) {
  console.log("default type:", typeof pdf.default);
}
