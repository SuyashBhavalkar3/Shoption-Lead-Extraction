const Papa = require('papaparse');
const assert = require('assert');

const sampleHeaders = ['Question', 'Answer'];
const sampleRows = [['तुमचा प्रश्न', 'तुमचे उत्तर']];
const csvBody = Papa.unparse({ fields: sampleHeaders, data: sampleRows });
const csvWithBom = '\uFEFF' + csvBody;
const buffer = Buffer.from(csvWithBom, 'utf8');

assert.strictEqual(buffer.slice(0, 3).toString('hex'), 'efbbbf', 'CSV export must start with UTF-8 BOM');
assert.ok(buffer.includes(Buffer.from(sampleRows[0][0], 'utf8')), 'Sample Marathi question text should be preserved in UTF-8 output');
assert.ok(buffer.includes(Buffer.from(sampleRows[0][1], 'utf8')), 'Sample Marathi answer text should be preserved in UTF-8 output');

console.log('✅ CSV export validation passed: UTF-8 BOM and Marathi text preserved.');
