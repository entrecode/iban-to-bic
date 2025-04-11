const { ok, strictEqual } = require('node:assert');
const { join } = require('node:path');
const fs = require('node:fs/promises');
const xlsx = require('xlsx');
const { JSDOM } = require('jsdom');
const { isValidBIC } = require('ibantools');
const neatCsv = require('neat-csv');
const { decode } = require('iconv-lite');

const extendedDatasetsDir = join(__dirname, '..', 'datasets-extended');
const datasetsDir = join(__dirname, '..', 'datasets');

// maps column index starting at 0 to A,...,Z,AA,AB,...,ZY,ZZ
function columnCode(col) {
  ok(col >= 0 && col < 26 + 26 * 26);
  const letter = n => String.fromCharCode(n + 'A'.charCodeAt(0));
  if (col < 26) return letter(col);
  return letter(Math.floor(col / 26) - 1) + letter(col % 26);
}

// col counted from 0, row counted from 1
function getCellValue(worksheet, col, row) {
  const v = worksheet[`${columnCode(col)}${row}`];
  return v ? v.v : v;
}

async function writeOutputs(name, bankCodesObj) {
  if (await fs.access(extendedDatasetsDir, fs.constants.W_OK).catch(() => false)) {
    await fs.writeFile(join(extendedDatasetsDir, `${name}.json`), JSON.stringify(bankCodesObj));
  }
  const bankCodesToBic = Object.entries(bankCodesObj).reduce((prev, [code, { bic, branches }]) => {
    if (bic) prev[code] = bic;
    else if (branches && branches[0] && branches[0].bic) prev[code] = branches[0].bic;

    if (prev[code]) ok(isValidBIC(prev[code]), `invalid BIC: ${prev[code]}`);

    return prev;
  }, {});

  await fs.writeFile(join(datasetsDir, `${name}.json`), JSON.stringify(bankCodesToBic));
}

async function downloadXLSX(url, sheet) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const doc = xlsx.read(buffer, { type: 'buffer' });
  return sheet ? doc.Sheets[sheet] : doc;
}

async function downloadJSDOM(url) {
  const response = await fetch(url);
  const text = await response.text();

  const {
    window: { document },
  } = new JSDOM(text);

  return document;
}

async function downloadCSV(url, options, encoding, linesModifier) {
  const response = await fetch(url);
  let text;
  if (encoding) {
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    text = decode(buffer, encoding);
  } else {
    text = await response.text();
  }
  text = text.split('\r').join('');
  if (linesModifier) text = linesModifier(text.split('\n')).join('\n');
  return neatCsv(text, options);
}

function assertTableHead(worksheet, row, values) {
  for (let i = 0; i < values.length; i++) {
    strictEqual(getCellValue(worksheet, i, row), values[i]);
  }
}

module.exports = {
  columnCode,
  getCellValue,
  writeOutputs,
  downloadXLSX,
  downloadJSDOM,
  downloadCSV,
  assertTableHead,
};
